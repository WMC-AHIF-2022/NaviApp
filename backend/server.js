import express, {application} from "express";
import cors from "cors";
import KDBush from "kdbush";
import axios from "axios";
import PriorityQueue from "fastpriorityqueue";
const app = express();

const PORT = 3000;

app.use(cors());

// ============================
class Pos {
    lat;
    lon;
    constructor(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    }
}
// ========== PROGRAM =========

app.use(express.static('../frontend'))

app.get('/api/getRoute', (req, res) => {
    let originPosition = new Pos(req.query["oLat"], req.query["oLon"]);
    let targetPosition = new Pos(req.query["tLat"], req.query["tLon"]);
    calculateRoute(originPosition, targetPosition).then(route => {
        console.log("done");
        res.send(route);
    }).catch(err => {
        console.log(err);
        res.send({"error": "error occurred"})
    })
})

app.listen(PORT, () => {
    console.log("Server listening on PORT " + PORT);
})


/* ============== ALGORITHM ================= */
// TODO ==================================================================

let nodeCache = new Map();
let cache = new Map();

class Edge {
    constructor(from, to, weight) {
        this.from = from;
        this.to = to;
        this.weight = weight;
    }
}

class Node {
    constructor(id, pos, parent = null) {
        this.id = id;
        this.pos = pos;
        this.parent = parent;
        this.g = 0;
        this.h = 0;
        this.f = 0;
        this.edges = [];
        this.maxSpeed = 30;
        this.streetScore = 1;
    }
}

async function calculateRoute(from, to) {
    nodeCache = new Map();
    cache = new Map();

    let sharpTurns = [];

    let openList = new PriorityQueue((nodeA, nodeB) => nodeA.f - nodeB.f);
    let testedNodes = [];
    let closedList = new Map();

    const searchRadius = 1000;

    let nodesAround = await getStreetNodes(from.lat, from.lon, searchRadius);
    let nodesAroundTarget = await getStreetNodes(to.lat, to.lon, 300);
    let startNode = getClosestNode(from, nodesAround);
    let goalNode = getClosestNode(to, nodesAroundTarget);

    let apiCallPositions = [startNode.pos];
    let maxPercentage = 0;
    let startToGoalDistance = distanceTo(startNode.pos, goalNode.pos);
    let lowestDistanceToTarget = startToGoalDistance + 500;

    openList.add(startNode);

    let lastCurr = null;

    while (!openList.isEmpty()) {
        let currentNode = openList.poll();
        lastCurr = currentNode;

        closedList.set(`${currentNode.pos.lat},${currentNode.pos.lon}`, currentNode);

        let distance = distanceTo(currentNode.pos, goalNode.pos);
        if (distance < 20) {
            let wayLengthTotal = 0;
            let path = [];
            let current = currentNode;
            while (current != null) {
                path.push(current.pos);
                if (current.parent) {
                    wayLengthTotal += distanceTo(current.pos, current.parent.pos);
                }
                current = current.parent;
            }
            console.log(path)
            return { route: path.reverse(), wayLength: wayLengthTotal, testedNodes: testedNodes, sharpTurns: sharpTurns };
        }

        if (distance < lowestDistanceToTarget) {
            lowestDistanceToTarget = distance;
        }

        // progress
        let percentage = Math.round((1 - (distance / startToGoalDistance)) * 100 * 10) / 10;
        if (percentage > maxPercentage) {
            maxPercentage = percentage;
            console.log(maxPercentage + " %");
        }
        // --------

        if (!arrayContainsNodeUnderDistance(apiCallPositions, currentNode.pos, searchRadius * (1.414 / 2)) && distanceTo(currentNode.pos, goalNode.pos) < lowestDistanceToTarget + 2000) {
            console.log("-- Requesting street nodes");
            apiCallPositions.push(currentNode.pos);
            let newNodes = await getStreetNodes(currentNode.pos.lat, currentNode.pos.lon, searchRadius);
        }

        for (let edge of currentNode.edges) {
            let neighbor = edge.to;

            if (closedList.has(`${neighbor.pos.lat},${neighbor.pos.lon}`)) {
                continue;
            }

            let tentativeG = currentNode.g + edge.weight;
            // (1) Add cost for going on a street with a lower max speed using the maxSpeed
            tentativeG += (100 / neighbor.maxSpeed);
            tentativeG += (200 / neighbor.streetScore);
            // (2) Add sharp turn penalty
            if (currentNode.parent) {
                const turnAngle = calculateAngle(currentNode.parent.pos, currentNode.pos, neighbor.pos);
                if (turnAngle < Math.PI / 8) { // This is a sharp turn (less than 45 degrees)
                    tentativeG *= 2;
                }
            }

            // ------
            let inOpenList = false;
            let nodeToUpdate;
            openList.forEach((openNode) => {
                if (openNode.pos.lat === neighbor.pos.lat && openNode.pos.lon === neighbor.pos.lon) {
                    inOpenList = true;
                    nodeToUpdate = openNode;
                }
            });
            // ------

            if (!inOpenList || tentativeG < neighbor.g) {
                neighbor.parent = currentNode;
                neighbor.g = tentativeG;
                neighbor.h = distanceTo(neighbor.pos, goalNode.pos);
                neighbor.f = neighbor.g + neighbor.h;

                /*if (!inOpenList) {
                    openList.add(neighbor);
                }*/
                if (inOpenList) {
                    openList.removeOne(node => node === nodeToUpdate);
                }

                /*if (distanceTo(neighbor.pos, goalNode.pos) > lowestDistanceToTarget + 500)
                    continue;*/

                openList.add(neighbor);
            }
        }
    }

    return [];
}

async function getStreetNodes(latitude, longitude, radius) {
    const key = `${latitude},${longitude},${radius}`;
    if (cache.has(key)) {
        return cache.get(key);
    }
    const overpassApiUrl = 'https://overpass-api.de/api/interpreter';
    const overpassQuery = `
        [out:json];
        (
          way[highway][motor_vehicle!=no][!building][highway!=service][highway!=path][highway!=track][highway!=footway][highway!=cycleway](around:${radius},${latitude},${longitude});
          node(w)[motor_vehicle!=no];
          way(bn)[highway][motor_vehicle!=no][highway!=service][highway!=path][highway!=footway][highway!=track][highway!=cycleway];
        );
        out body;
        >;
        out skel qt;
    `;
    try {
        const response = await axios.post(overpassApiUrl, overpassQuery);
        console.log("-- Received Response, processing...");
        const elements = response.data.elements;
        const ways = elements.filter(element => element.type === 'way');
        const nodes = elements.filter(element => element.type === 'node');

        const nodeMap = new Map(nodes.map(node => [node.id, new Node(node.id, {lat: node.lat, lon: node.lon})]));
        const wayMap = new Map(ways.map(way => [way.id, way]));

        console.log("-- 1")
        for (let way of ways) {
            for (let i = 0; i < way.nodes.length - 1; i++) {
                const fromNode = nodeMap.get(way.nodes[i]);
                const toNode = nodeMap.get(way.nodes[i + 1]);
                const weight = distanceTo(fromNode.pos, toNode.pos);

                if (way["tags"]["junction"] === "roundabout") {
                    fromNode.edges.push(new Edge(fromNode, toNode, weight));
                    //toNode.edges.push(new Edge(fromNode, toNode, weight));
                } else {
                    fromNode.edges.push(new Edge(fromNode, toNode, weight));
                    if (way["tags"]["oneway"] !== "yes") {
                        toNode.edges.push(new Edge(toNode, fromNode, weight));
                    }
                }

                let maxSpeed = null;
                let streetScore = 1;
                if (way["tags"]) {
                    if (way["tags"]["maxspeed"]) {
                        maxSpeed = way["tags"]["maxspeed"];
                    }
                    let highwayType = way["tags"]["highway"]
                    if (highwayType) {
                        if (highwayType === "secondary") {
                            streetScore = 10;
                            if (!maxSpeed) {
                                maxSpeed = 100;
                            }
                        } else if (highwayType === "primary") {
                            streetScore = 20;
                            if (!maxSpeed) {
                                maxSpeed = 100;
                            }
                        } else if (highwayType === "motorway") {
                            streetScore = 50;
                            if (!maxSpeed) {
                                maxSpeed = 130;
                            }
                        } else if (highwayType === "tertiary") {
                            streetScore = 6;
                            if (!maxSpeed) {
                                maxSpeed = 50;
                            }
                        } else if (highwayType === "residential") {
                            streetScore = 3;
                            if (!maxSpeed) {
                                maxSpeed = 30;
                            }
                        } else {
                            streetScore = 1;
                            if (!maxSpeed) {
                                maxSpeed = 30;
                            }
                        }
                    }
                    fromNode.streetScore = streetScore;
                    toNode.streetScore = streetScore;
                    fromNode.maxSpeed = parseInt(maxSpeed);
                    toNode.maxSpeed = parseInt(maxSpeed);
                }
            }
        }

        cache.set(key, Array.from(nodeMap.values()));

        console.log("-- 2")
        // Create a mapping from node id to the ways that contain it
        const nodeToWaysMap = new Map();
        for (let way of ways) {
            for (let i = 0; i < way.nodes.length; i++) {
                const nodeId = way.nodes[i];
                if (!nodeToWaysMap.has(nodeId)) {
                    nodeToWaysMap.set(nodeId, { ways: new Set(), neighbors: new Set() });
                }
                nodeToWaysMap.get(nodeId).ways.add(way.id);
                if (i > 0) nodeToWaysMap.get(nodeId).neighbors.add(way.nodes[i - 1]);
                if (i < way.nodes.length - 1) nodeToWaysMap.get(nodeId).neighbors.add(way.nodes[i + 1]);
            }
        }

        console.log("-- 3")
        const points = Array.from(nodeCache.values()).map(node => [node.pos.lat, node.pos.lon]);
        const index = new KDBush(points.length);
        for (let node of points.values()) {
            index.add(node[0], node[1]);
        }
        index.finish();

        for (let nodeId of nodeMap.keys()) {
            let node = nodeMap.get(nodeId);
            const nodeInfo = nodeToWaysMap.get(nodeId) || { ways: new Set(), neighbors: new Set() };

            const radius = 0.01;
            const ids = index.within(node.pos.lat, node.pos.lon, radius);

            for (let id of ids) {
                let existingNode = nodeCache.get(`${points[id][0]},${points[id][1]}`);
                const existingNodeInfo = nodeToWaysMap.get(existingNode.id) || { ways: new Set(), neighbors: new Set() };

                // Check if this existing node is contained in any of the same ways as the current node
                const commonWays = [...nodeInfo.ways].filter(nodeWay => existingNodeInfo.ways.has(nodeWay));

                // Check if the nodes are neighbors in any common way
                const weight = distanceTo(node.pos, existingNode.pos);
                /*if (commonWays.length > 0 || weight < 0) {
                    if (nodeInfo.neighbors.has(existingNode.id) || weight < 0) { // TODO CHANGE DIST
                        let nodeEdge = new Edge(existingNode, node, weight);
                        existingNode.edges.push(nodeEdge);
                        node.edges.push(new Edge(node, existingNode, weight));
                    }
                }*/
                for (let commonWay of commonWays) {
                    if (wayMap.get(commonWay)["tags"]["oneway"] === "yes") {
                        if (nodeInfo.neighbors.has(existingNode.id)) {
                            // For one-way streets, add an edge only in the direction of the way
                            let fromNode, toNode;
                            if (wayMap.get(commonWay).nodes.indexOf(nodeId) < wayMap.get(commonWay).nodes.indexOf(existingNode.id)) {
                                fromNode = node;
                                toNode = existingNode;
                            } else {
                                fromNode = existingNode;
                                toNode = node;
                            }
                            let nodeEdge = new Edge(fromNode, toNode, weight);
                            fromNode.edges.push(nodeEdge);
                        }
                    } else {
                        if (nodeInfo.neighbors.has(existingNode.id)) {
                            // For two-way streets, add edges in both directions
                            let nodeEdge = new Edge(existingNode, node, weight);
                            existingNode.edges.push(nodeEdge);
                            node.edges.push(new Edge(node, existingNode, weight));
                        }
                    }
                }
            }
        }
        /*for (let nodeId of nodeMap.keys()) {
            let node = nodeMap.get(nodeId);
            const nodeInfo = nodeToWaysMap.get(nodeId) || { ways: new Set(), neighbors: new Set() };

            for (let [_, existingNode] of nodeCache) {
                const existingNodeInfo = nodeToWaysMap.get(existingNode.id) || { ways: new Set(), neighbors: new Set() };

                // Check if this existing node is contained in any of the same ways as the current node
                const commonWays = [...nodeInfo.ways].filter(nodeWay => existingNodeInfo.ways.has(nodeWay));

                // Check if the nodes are neighbors in any common way
                const weight = distanceTo(node.pos, existingNode.pos);
                if (commonWays.length > 0) {
                    if (nodeInfo.neighbors.has(existingNode.id) || weight < 45) { // TODO CHANGE DIST
                        let nodeEdge = new Edge(existingNode, node, weight);

                        existingNode.edges.push(nodeEdge);
                        node.edges.push(new Edge(node, existingNode, weight));
                    }
                }
            }
        }*/

        console.log("-- 4")
        // save nodes in cache
        for (let node of nodeMap.values()) {
            let nodeKey = `${node.pos.lat},${node.pos.lon}`;
            if (!nodeCache.has(nodeKey)) {
                nodeCache.set(nodeKey, node);
            }
        }

        return Array.from(nodeMap.values());
    } catch (error) {
        console.error('Error retrieving street nodes and routes:', error);
    }
}

// TODO ==================================================================

/*// Store each individual node in the cache and connect with existing nodes
        for (let nodeId of nodeMap.keys()) {
            let node = nodeMap.get(nodeId);

            for (let [_, existingNode] of nodeCache) {
                let dist = distanceTo(node.pos, existingNode.pos);
                // check if node is contained in requested way
                //for (let way of ways) {
                    //if (dist < 50 && node !== existingNode) {
                    let weight = distanceTo(node.pos, existingNode.pos);
                    let nodeEdge = new Edge(existingNode, node, weight);
                    if (/*way.nodes.indexOf(nodeId) !== -1 && existingNode.edges.find(e => e.lat === node.pos.lat && e.lon === node.pos.lon) !== null && dist < 35 && node !== existingNode)
{
    existingNode.edges.push(nodeEdge);
    node.edges.push(new Edge(node, existingNode, weight));
}
//}
}
}*/

// Store each individual node in the cache and connect with existing nodes
/*for (let node of nodeMap.values()) {
    let nodeKey = `${node.pos.lat},${node.pos.lon}`;
    if (nodeCache.has(nodeKey)) {
        const existingNode = nodeCache.get(nodeKey);
        for (let edge of existingNode.edges) {
            if (!node.edges.includes(edge)) {
                node.edges.push(edge);
            }
        }
    } else {
        nodeCache.set(nodeKey, node);
    }
}*/
// =============== HELPERS ====================

function getClosestNode(pos, nodes) {
    let closestNode = null;
    let closestDist = Infinity;
    for (let node of nodes) {
        let dist = distanceTo(pos, node.pos);
        if (dist < closestDist) {
            closestDist = dist;
            closestNode = node;
        }
    }
    return closestNode;
}

function arrayContainsNodeUnderDistance(array, to, distance) {
    for (let nodeEl of array) {
        if (Math.abs(distanceTo(to, nodeEl)) < distance) {
            return true;
        }
    }
    return false;
}
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
//haversineDistance
function distanceTo(posA, posB) {
    const earthRadius = 6371000; // Erdradius in Metern
    const lat1 = toRadians(posA.lat);
    const lat2 = toRadians(posB.lat);
    const deltaLat = toRadians(posB.lat - posA.lat);
    const deltaLon = toRadians(posB.lon - posA.lon);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
}

function calculateAngle(p1, p2, p3) {
    const v1 = { x: p2.lon - p1.lon, y: p2.lat - p1.lat };
    const v2 = { x: p3.lon - p2.lon, y: p3.lat - p2.lat };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const magnitudeProduct = Math.sqrt((v1.x ** 2 + v1.y ** 2) * (v2.x ** 2 + v2.y ** 2));

    return Math.acos(dotProduct / magnitudeProduct);
}
