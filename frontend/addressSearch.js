async function getCoordinates(address) {
    // Definieren Sie Ihre API-URL zusammen mit der Adresse, die Sie in Koordinaten umwandeln möchten
    let apiURL = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    // Senden Sie die Anfrage
    const response = await fetch(apiURL);
    const data = await response.json();
    if (response.ok && data.length > 0) {
        console.log('Koordinaten für die Adresse "' + address + '" sind ' + JSON.stringify(data[0]));
        return data[0];
    } else {
        throw new Error('Keine Koordinaten für die Adresse "' + address + '" gefunden');
    }
}