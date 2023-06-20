let currentPosMarker;
let currentLocation;

let locationGettingInterval;

let routeLeft = [];

function startActiveNavigation(routeDetails) {
    document.getElementById("routePreview").style.visibility = "hidden";
    document.getElementById("routePreview").style.opacity = "0";
    document.getElementById("navigationPanel").style.visibility = "visible";
    document.getElementById("navigationPanel").style.opacity = "1";

    requestLocation();
    if (!currentPosMarker) {
        currentPosMarker = L.circle([routeDetails.route[0].lat, routeDetails.route[0].lon], {
            color: "blue",
            fillColor: "#00aaff",
            fillOpacity: 0.7,
            radius: 5
        }).addTo(map);
    }

    // route.clone does not work, provide a working solution
    routeLeft = [];
    for (let node of currentRouteDetails.route) {
        routeLeft.push(node);
    }

    locationGettingInterval = setInterval(() => {
        requestLocation();
    }, 50);
}

function getNextDirectionChangeInRoute(routeLeft) {
    if (routeLeft.length < 3) return null;

    const threshold = 30; // Change threshold value based on your requirement
    let nextTurn = null;

    for (let i = 0; i < routeLeft.length - 2; i++) {
        let pointA = routeLeft[i];
        let pointB = routeLeft[i + 1];
        let pointC = routeLeft[i + 2];

        let bearingAB = getBearing(pointA, pointB);
        let bearingBC = getBearing(pointB, pointC);

        let angle = bearingBC - bearingAB;

        if (angle < 0) angle += 360;
        if (angle > 180) angle = 360 - angle;

        if (angle > threshold) {
            let turnType;
            if (angle > 135) turnType = "TURN AROUND";
            else if (angle > 90) turnType = angle > bearingAB ? "SHARP LEFT" : "SHARP RIGHT";
            else turnType = angle < bearingAB ? "LEFT" : "RIGHT";

            let distance = distanceTo({lat: currentLocation.latitude, lon: currentLocation.longitude }, pointB);

            if (distance > 500) {
                turnType = "FORWARD";
            }

            nextTurn = { type: turnType, distance: distance };
            break;
        }
    }

    return nextTurn;
}
function getBearing(pointA, pointB) {
    let lat1 = toRadians(pointA.lat);
    let lon1 = toRadians(pointA.lon);
    let lat2 = toRadians(pointB.lat);
    let lon2 = toRadians(pointB.lon);

    let y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    let x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    let bearing = toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360;
}
function toDegrees(radians) {
    return radians * (180 / Math.PI);
}



function requestLocation() {
    navigator.geolocation.getCurrentPosition(pos => locationArrived(pos), err => alert(err.message), {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    })
}
function locationArrived(pos) {
    currentLocation = pos.coords;
    currentPosMarker.setLatLng(new L.LatLng(currentLocation.latitude, currentLocation.longitude));
    currentPosMarker.setRadius(pos.coords.accuracy);

    for (let node of routeLeft) {
        if (distanceTo(node, { lat: currentLocation.latitude, lon: currentLocation.longitude }) < 30) {
            let deleteIndex = routeLeft.indexOf(node);
            for (let i = 0; i < deleteIndex; i++) {
                routeLeft.shift();
            }
        }
    }

    if (routeLeft.length < 2) {
        document.getElementById("navigationPanel").style.visibility = "hidden";
        document.getElementById("navigationPanel").style.opacity = "0";
        document.getElementById("targetReachedPanel").style.visibility = "visible";
        document.getElementById("targetReachedPanel").style.opacity = "1";
    }

    showRoute(routeLeft);

    let nextDirectionChange = getNextDirectionChangeInRoute(routeLeft);
    document.getElementById("nextNavigationStepIcon").innerHTML = getDirectionChangeIcon(nextDirectionChange);
    document.getElementById("nextNavigationStepText").innerHTML = nextDirectionChange.type + " " + Math.round(nextDirectionChange.distance) + "m";
}
function getDirectionChangeIcon(directionChange) {
    switch (directionChange.type) {
        case "TURN AROUND":
            return "<div style='transform: rotate(90deg)'>➜</div>";
        case "SHARP LEFT":
            return "<div style='transform: rotate(150deg)'>➜</div>";
        case "LEFT":
            return "<div style='transform: rotate(180deg)'>➜</div>";
        case "SHARP RIGHT":
            return "<div style='transform: rotate(30deg)'>➜</div>";
        case "RIGHT":
            return "➜";
        default:
            return "<div style='transform: rotate(-90deg)'>➜</div>";
    }
}

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
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
