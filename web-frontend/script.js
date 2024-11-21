// DOM Elements
const connectButton = document.getElementById('connectBleButton');
const disconnectButton = document.getElementById('disconnectBleButton');
const retrievedValue = document.getElementById('valueContainer');
const bleStateContainer = document.getElementById('bleState');
const timestampContainer = document.getElementById('timestamp');
const pointsContainer = document.getElementById('pointsContainer');
const batteryLevelContainer = document.getElementById('batteryLevelContainer');
const fossilFuelSavings = document.getElementById('fossilFuelSavings');

//Define BLE Device Specs
var deviceName ='ESP32';
var bleService = '19b10000-e8f2-537e-4f6c-d104768a1214';
var sensorCharacteristic= '19b10001-e8f2-537e-4f6c-d104768a1214';

//Global Variables to Handle Bluetooth
var bleServer;
var bleServiceFound;
var sensorCharacteristicFound;

// Global variable for the timeout
let noSignalTimeout;

// Function to handle no signal
function handleNoSignal() {
    console.log("No signal received for over 9 seconds.");
    bleStateContainer.innerHTML = "Device disconnected";
    bleStateContainer.style.color = "#d13a30";
    pointsContainer.innerText = 'No points available';
    fossilFuelSavings.innerText = 'No point data';
    batteryLevelContainer.innerText = '--';
}

// Connect Button (search for BLE Devices only if BLE is available)
connectButton.addEventListener('click', (event) => {
    if (isWebBluetoothEnabled()){
        connectToDevice();
    }
});

// Disconnect Button
disconnectButton.addEventListener('click', disconnectDevice);

// Check if BLE is available in your Browser
function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log("Web Bluetooth API is not available in this browser!");
        bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser!";
        return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
}

// Connect to BLE Device and Enable Notifications
function connectToDevice(){
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        filters: [{name: deviceName}],
        optionalServices: [bleService]
    })
    .then(device => {
        console.log('Device Selected:', device.name);
        bleStateContainer.innerHTML = 'Connected to device ' + device.name;
        bleStateContainer.style.color = "#24af37";
        device.addEventListener('gattservicedisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(gattServer =>{
        bleServer = gattServer;
        console.log("Connected to GATT Server");
        return bleServer.getPrimaryService(bleService);
    })
    .then(service => {
        bleServiceFound = service;
        console.log("Service discovered:", service.uuid);
        return service.getCharacteristic(sensorCharacteristic);
    })
    .then(characteristic => {
        console.log("Characteristic discovered:", characteristic.uuid);
        sensorCharacteristicFound = characteristic;
        characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
        characteristic.startNotifications();
        // Start the timeout
        noSignalTimeout = setTimeout(handleNoSignal, 9000);
        console.log("Notifications Started.");
        return characteristic.readValue();
    })
    .then(value => {
        console.log("Read value: ", value);
        const decodedValue = new TextDecoder().decode(value);
        console.log("Decoded value: ", decodedValue);
        retrievedValue.innerHTML = decodedValue;

        const device_id = 'ESP32_S3_12345';
        getPoints(device_id);
    })
    .catch(error => {
        console.log('Error: ', error);
    })
}

function onDisconnected(event){
    console.log('Device Disconnected:', event.target.device.name);
    // Clear the no-signal timeout
    clearTimeout(noSignalTimeout);
    bleStateContainer.innerHTML = "Device disconnected";
    bleStateContainer.style.color = "#d13a30";
    pointsContainer.innerText = 'No points available';
    fossilFuelSavings.innerText = 'No point data';
    batteryLevelContainer.innerText = '--';

    connectToDevice();
}

function handleCharacteristicChange(event){
    const newValueReceived = new TextDecoder().decode(event.target.value);
    console.log("Characteristic value changed: ", newValueReceived);
    retrievedValue.innerHTML = newValueReceived;
    timestampContainer.innerHTML = getDateTime();

    // Reset the no-signal timeout
    clearTimeout(noSignalTimeout);
    noSignalTimeout = setTimeout(handleNoSignal, 9000);

    // Split newValueReceived into an array
    const [vbatt, usb1, usb2] = newValueReceived.split(',');

    // Log the split values
    console.log("Voltage: ", vbatt);
    console.log("USB1 Current: ", usb1);
    console.log("USB2 Current: ", usb2);
    console.log("Time: ", getDateTime());

    batteryLevelContainer.innerText = getBatteryPercentage(vbatt);

    // Send the value to the server
    const device_id = 'ESP32_S3_12345';
    num_charging = 0;

    if (usb1 > 0.05) {
        num_charging = num_charging + 1;
    }
    if (usb2 > 0.05) {
        num_charging = num_charging + 1;
    }
    
    if (num_charging > 0) {
        addCount(device_id, num_charging)
        updateCount(device_id)
    }
    // Get points
    getPoints(device_id);
}

function disconnectDevice() {
    console.log("Disconnect Device.");
    if (bleServer && bleServer.connected) {
        if (sensorCharacteristicFound) {
            sensorCharacteristicFound.stopNotifications()
                .then(() => {
                    console.log("Notifications Stopped");
                    return bleServer.disconnect();
                })
                .then(() => {
                    console.log("Device Disconnected");
                    clearTimeout(noSignalTimeout);
                    bleStateContainer.innerHTML = "Device Disconnected";
                    bleStateContainer.style.color = "#d13a30";
                    pointsContainer.innerText = 'No points available';
                    fossilFuelSavings.innerText = 'No point data';
                })
                .catch(error => {
                    console.log("An error occurred:", error);
                });
        } else {
            console.log("No characteristic found to disconnect.");
        }
    } else {
        // Throw an error if Bluetooth is not connected
        console.error("Bluetooth is not connected.");
        window.alert("Bluetooth is not connected.")
    }
}

function getDateTime() {
    var currentdate = new Date();
    var day = ("00" + currentdate.getDate()).slice(-2); // Convert day to string and slice
    var month = ("00" + (currentdate.getMonth() + 1)).slice(-2);
    var year = currentdate.getFullYear();
    var hours = ("00" + currentdate.getHours()).slice(-2);
    var minutes = ("00" + currentdate.getMinutes()).slice(-2);
    var seconds = ("00" + currentdate.getSeconds()).slice(-2);

    var datetime = day + "/" + month + "/" + year + " at " + hours + ":" + minutes + ":" + seconds;
    return datetime;
}

function addCount(device_id, num_charging) {
    fetch('http://localhost:3000/add-count', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_id, num_charging })
    })
    .then(response => response.text())
    .then(data => {
        console.log('Server response:', data);
    })
    .catch(error => {
        console.error('Error sending data:', error);
    });
}

function setCount(device_id, count) {
    fetch('http://localhost:3000/set-count', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_id, count })
    })
    .then(response => response.text())
    .then(data => {
        console.log('Server response:', data);
    })
    .catch(error => {
        console.error('Error sending data:', error);
    });
}

function addPoints(device_id, points) {
    fetch('http://localhost:3000/add-points', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_id, points })
    })
    .then(response => response.text())
    .then(data => {
        console.log('Server response:', data);
    })
    .catch(error => {
        console.error('Error sending data:', error);
    });
}

function updateCount(device_id) {
    fetch(`http://localhost:3000/counter/${device_id}`)
    .then(response => response.json())
    .then(data => {
        const timef = 20;
        const pointf = 10;
        if (data.counter >= timef) {
            multiplier = ~~(data.counter/timef);
            setCount(device_id, data.counter - (timef * multiplier));
            addPoints(device_id, pointf * multiplier);
        }
    })
    .catch(error => {
        console.error('Error fetching count:', error);
    });
}

function getPoints(device_id) {
    fetch(`http://localhost:3000/points/${device_id}`)
    .then(response => response.json())
    .then(data => {
        console.log('Points:', data.points);
        milestone = ~~(data.points / 50) * 50 + 50;
        pointText = `
            <p>Current Points: ${data.points}</p>
            <p>Next Milestone: ${milestone}</p>
        `;
        pointsContainer.innerHTML = pointText || 'No points available';
        const fossilSavings = pointsToFossilFuel(data.points);
        fossilFuelSavings.innerHTML = fossilSavings || 'No point data';
    })
    .catch(error => {
        console.error('Error fetching points:', error);
    });
}

// Convert points to fossil fuel
function pointsToFossilFuel(points) {
    // Convert points to watt hours of charging (based on 5W average)
    const hours = points / 120;

    // Calculate fossil fuel savings
    const coal = hours * 1.14 / 1000; // pounds
    const gas = hours * 7.42 / 1000; // cubic feet
    const oil = hours * 0.08 / 1000; // gallons
    const coke = hours * 0.85 / 1000; // pounds

    // Format the values in scientific notation
    const coalFormatted = coal.toExponential(2);
    const gasFormatted = gas.toExponential(2);
    const oilFormatted = oil.toExponential(2);
    const cokeFormatted = coke.toExponential(2);

    // Display in the container
    result = `
        <p>Coal Saved: ${coalFormatted} lbs</p>
        <p>Natural Gas Saved: ${gasFormatted} ft<sup>3</sup></p>
        <p>Petroleum Saved: ${oilFormatted} gallons</p>
        <p>Petroleum Coke Saved: ${cokeFormatted} lbs</p>
    `;

    return result;
}

function getBatteryPercentage(voltage) {
    const vbatt = voltage / (150.0/252.0)
    const vmax = 4.17;
    const vmin = 2.85;
    if (vbatt >= vmax) {
        return 100;
    }
    else if (vbatt <= vmin) {
        return 0;
    }
    else{
        // Order 2 polynomial approximation: y = 47.807x^2 - 256.7x + 342.51
        result = (47.807 * vbatt**2) - (256.7 * vbatt) + 342.51
        return result.toFixed(0);
    }
}

