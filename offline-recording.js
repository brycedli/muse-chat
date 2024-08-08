const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

// Recognition Configuration
recognition.continuous = false; // Stop automatically after speaking
recognition.interimResults = false; // We don't need interim results
recognition.lang = 'en-US';

let activated = false;

// Function to start recognition
function startRecognition() {
    recognition.start();
    console.log("Listening...");
}

// Event: When speech is recognized
recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript.trim();
    console.log("Heard:", transcript);

    if (!activated) {
        if (transcript.toLowerCase() === "hello") {
            activated = true;
            console.log("Activation detected. Now listening for commands...");
        }
    } else {
        // Send the recognized text (implement your send function)
        console.log("Sending:", transcript);
        addChatMessage(transcript, 'user');
        sendToChatAPI(transcript);
    }
};

recognition.onend = function() {
    console.log("Recognition ended. Restarting...");
    startRecognition(); // Always restart listening immediately
};

startRecognition();