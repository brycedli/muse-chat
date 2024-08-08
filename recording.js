// Constants
const minRecordingTime = 300; // Minimum recording time in milliseconds

// Variables
let mediaRecorder = "";
let audioChunks = [];
let recordingStartTime;
let isProcessing = false;
let audioPlaying = false;
let currentAudio;
let holdTimeout;

// Event Listeners
document.getElementById('record').addEventListener('mousedown', prepareToRecord);
document.getElementById('record').addEventListener('mouseup', handleMouseUp);
document.getElementById('start').addEventListener('click', startRecognition);
// Functions


function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.onstart = function() {
      console.log('Voice recognition started. Try speaking into the microphone.');
    };

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      if (transcript.includes('hello')) {
        
      }
    };

    recognition.onerror = function(event) {
      console.error('Error occurred in recognition: ' + event.error);
    };

    recognition.onend = function() {
      console.log('Voice recognition ended.');
    };

    recognition.start();
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
