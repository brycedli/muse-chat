// Constants
const serviceUUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const characteristicUUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const minRecordingTime = 300; // Minimum recording time in milliseconds

// Variables
let mediaRecorder = "";
let audioChunks = [];
let chatMessages = [
    { 
        role: "system", 
        content: "You are an embedded AI assistant inside a plush otter named Rocky owned by a girl named Emily, aged 8. You were made by Muse publishing, as a conversational companion for the Muse storytelling app, so keep your responses under three sentences and keep it to playful conversation. Yesterday, Emily made a story that had you in it where you went to moon. Do not passively respond to the user, instead be a lovely companion that nurtures." 
    }
];
let recordingStartTime;
let isProcessing = false;
let audioPlaying = false;
let currentAudio;
let holdTimeout;

// Event Listeners
document.getElementById('connect-BLE').addEventListener('click', connectBLE);
document.getElementById('connect').addEventListener('click', connectSerial);
document.getElementById('record').addEventListener('mousedown', prepareToRecord);
document.getElementById('record').addEventListener('mouseup', handleMouseUp);
document.getElementById('save-key').addEventListener('click', saveApiKey);
window.addEventListener('load', loadApiKey);

// Functions
async function connectBLE() {
    try {
        console.log('Requesting Bluetooth Device...');
        const bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [serviceUUID] }]
        });

        console.log('Connecting to GATT Server...');
        const server = await bluetoothDevice.gatt.connect();
        console.log('Getting Service...');
        const service = await server.getPrimaryService(serviceUUID);
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

async function connectSerial() {
    try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                break;
            }
            console.log(value);
            document.getElementById('output').innerText += value + '\n';
        }

        await readableStreamClosed.catch(() => { /* Ignore the error */ });
        await port.close();
    } catch (error) {
        console.error('There was an error:', error);
    }
}

function prepareToRecord() {
    recordingStartTime = Date.now();
    holdTimeout = setTimeout(() => {
        if (audioPlaying) {
            stopAudio();
        }
        startRecording();
    }, minRecordingTime);
}

function handleMouseUp() {
    if (Date.now() - recordingStartTime < minRecordingTime) {
        clearTimeout(holdTimeout);
    } else {
        stopRecording();
    }
}

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks);
        audioChunks = [];
        
        if (Date.now() - recordingStartTime >= minRecordingTime) {
            processAudio(audioBlob);
        } else {
            console.log('Recording too short, ignoring.');
        }
    });
}

function stopRecording() {
    if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        audioPlaying = false;
    }
}

async function processAudio(audioBlob) {
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0); // Get raw PCM data of first channel
    const samples = 128; // Number of samples to consider for threshold calculation
    const blockSize = Math.floor(rawData.length / samples); // Number of samples per block
    let sum = 0;

    for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i;
        let sumSquare = 0;
        for (let j = 0; j < blockSize; j++) {
            sumSquare += rawData[blockStart + j] ** 2;
        }
        sum += Math.sqrt(sumSquare / blockSize);
    }

    const amplitude = sum / samples;
    console.log('Average Amplitude:', amplitude);

    const amplitudeThreshold = 0.01; // Adjust this threshold based on testing
    if (amplitude >= amplitudeThreshold) {
        isProcessing = true;
        transcribeAPI(audioBlob);
    } else {
        console.log('Amplitude too low, ignoring.');
    }
}

async function transcribeAPI(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');

    try {
        const apiKey = localStorage.getItem('api-key');
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
            },
            body: formData
        });

        const data = await response.json();
        const transcription = data.text;
        document.getElementById('transcription').innerText = transcription;
        addChatMessage(transcription, 'user');
        sendToChatAPI(transcription);
    } catch (error) {
        console.error('Error:', error);
        isProcessing = false; // Reset processing flag on error
    }
}

function addChatMessage(content, role) {
    chatMessages.push({ role, content });
    document.getElementById('chat').innerText += `${role}: ${content}\n`;
}

async function sendToChatAPI(userMessage) {
    chatMessages.push({ role: "user", content: userMessage });

    try {
        const apiKey = localStorage.getItem('api-key');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: chatMessages
            })
        });

        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;
        addChatMessage(assistantMessage, 'assistant');
        readOutLoud(assistantMessage);
    } catch (error) {
        console.error('Error:', error);
        isProcessing = false; // Reset processing flag on error
    }
}

async function readOutLoud(text) {
    try {
        const apiKey = localStorage.getItem('api-key');
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: 'nova'
            })
        });

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);
        currentAudio.play();
        audioPlaying = true;
        currentAudio.onended = () => { 
            audioPlaying = false; 
            isProcessing = false; 
        };
    } catch (error) {
        console.error('Error:', error);
        isProcessing = false; // Reset processing flag on error
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('api-key').value;
    localStorage.setItem('api-key', apiKey);
}

function loadApiKey() {
    const savedKey = localStorage.getItem('api-key');
    if (savedKey) {
        document.getElementById('api-key').value = savedKey;
    }
}
