// noinspection JSUnresolvedReference

let currentRouteDetails = [];

async function calculateRoute() {
    const originAddress = document.getElementById("originInput").value;
    const targetAddress = document.getElementById("targetInput").value;
    const originCoordinates = await getCoordinates(originAddress);
    const targetCoordinates = await getCoordinates(targetAddress);
    document.getElementById("routeInput").style.visibility = "hidden";
    document.getElementById("routeInput").style.opacity = "0";
    document.getElementById("loadingPanel").style.visibility = "visible";
    document.getElementById("loadingPanel").style.opacity = "1";
    await getRoute(originCoordinates.lat, originCoordinates.lon, targetCoordinates.lat, targetCoordinates.lon);
}

//getRoute(48.26495, 14.23957, 48.26703, 14.18893);

// ===========================================

let map = L.map('map').setView([48.2638104, 14.2097678], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

async function getRoute(oLat, oLon, tLat, tLon) {
    const result = await fetch(`http://localhost:3000/api/getRoute?oLat=${oLat}&oLon=${oLon}&tLat=${tLat}&tLon=${tLon}`);
    const res = await result.json();
    console.log(res);
    if (res.length < 2 || res.route.length < 2) {
        alert("No route could be found");
        return;
    }
    currentRouteDetails = res;
    showRoute(res.route);

    for (let pos of res.sharpTurns) {
        L.marker([pos.lat, pos.lon]).addTo(map);
    }

    showRouteDetails(currentRouteDetails);
}

let routePolyline;
function showRoute(nodesArray) {
    let polylinePoints = [];
    for (let pointElement of nodesArray) {
        let polylinePoint = new L.LatLng(pointElement.lat, pointElement.lon);
        polylinePoints.push(polylinePoint);
        //L.marker(polylinePoint).addTo(map);
    }
    if (routePolyline) {
        routePolyline.remove(map)
    }
    routePolyline = new L.polyline(polylinePoints, {
        color: 'red',
        weight:6,
        opacity: 1,
        smoothFactor: 1
    })
    routePolyline.addTo(map);
}

function showRouteDetails(routeDetails) {
    document.getElementById("routePreview").style.visibility = "visible";
    document.getElementById("routePreview").style.opacity = "1";
    document.getElementById("loadingPanel").style.visibility = "hidden";
    document.getElementById("loadingPanel").style.opacity = "0";
    document.getElementById("routePreview_routeInformation").innerHTML = Math.round(routeDetails.wayLength) + " m";
}
