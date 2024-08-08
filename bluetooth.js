// Constants
const serviceUUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const ledCharacteristic = "f8586726-e964-4135-a2d4-afc3375e50f3";
const characteristicUUID = "19b10001-e8f2-537e-4f6c-d104768a1214";

// Variables
var bleServer;
var service;
let isOn = false;

// Event Listeners
document.getElementById('connect-BLE').addEventListener('click', connectBLE);
document.getElementById('characteristic').addEventListener('click', () => { isOn = !isOn; writeOnCharacteristic(isOn ? 0 : 255)});

// Functions
async function connectBLE() {
    try {
        console.log('Requesting Bluetooth Device...');
        const bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [serviceUUID] }]
        });

        console.log('Connecting to GATT Server...');
        bleServer = await bluetoothDevice.gatt.connect();
        console.log('Getting Service...');
        service = await bleServer.getPrimaryService(serviceUUID);
        console.log('Getting Characteristic...');
        const characteristic = await service.getCharacteristic(characteristicUUID);

        console.log('Starting Notifications...');
        characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleNotifications);

        console.log('Connected to ESP32');
    } catch (error) {
        console.error('Error:', error);
    }
}

function handleNotifications(event) {
    const value = new TextDecoder().decode(event.target.value);
    console.log('Message from ESP32:', value);
    if (value === 'button_up') {
        console.log('Button up');
        stopRecording();
    } else if (value === 'button_down') {
        console.log('Button down');
        prepareToRecord();
    }
}

function writeOnCharacteristic(value) {
    if (bleServer && bleServer.connected) {
        service.getCharacteristic(ledCharacteristic)
            .then(characteristic => {
                console.log("Found the LED characteristic: ", characteristic.uuid);
                const data = new Uint8Array([value]);
                return characteristic.writeValue(data);
            })
            .then(() => {
                console.log("Value written to LED characteristic:", value);
            })
            .catch(error => {
                console.error("Error writing to the LED characteristic: ", error);
            });
    } else {
        console.error("Bluetooth is not connected. Cannot write to characteristic.");
    }
}
