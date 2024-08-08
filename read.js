
async function readOutLoud(text) {
    try {
        const xiApiKey = localStorage.getItem('eleven-api-key'); // Assuming API key is stored in local storage
        const voiceId = 'dZEP79aEKCLzCm8v8OvS'; // Replace with your voice ID
        const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

        const response = await fetch(ttsUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'xi-api-key': xiApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.8,
                    style: 0.0,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const reader = response.body.getReader();
        const chunks = [];
        let done, value;

        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                chunks.push(value);
            }
        }

       
        

        const audioBlob = new Blob(chunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioElement = new Audio(audioUrl);
        const source = audioContext.createMediaElementSource(audioElement);
        const analyser = audioContext.createAnalyser();

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        audioElement.play();
        let audioPlaying = true;

        audioElement.onended = () => {
            if (onEndCallback) {
                onEndCallback();
            }
            audioPlaying = false;
            if (bleServer && bleServer.connected) {
                writeOnCharacteristic(0);
            }
        };

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function updateAmplitude() {
            if (audioPlaying) {
                analyser.getByteTimeDomainData(dataArray);
                const amplitude = Math.max(...dataArray) - Math.min(...dataArray);
                console.log('Amplitude:', amplitude);
                // Update a value with the amplitude here
                writeOnCharacteristic(Math.min(255, (amplitude - 1) * 4));
                setTimeout(updateAmplitude, 10);
            }
        }

        if (bleServer && bleServer.connected) {
            updateAmplitude();
        }

    } catch (error) {
        console.error('Error:', error);
        if (onEndCallback) {
            onEndCallback(); // Ensure the callback is called even on error
        }

    }
}

async function transcribeAPI(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');

    try {
        const apiKey = localStorage.getItem('open-api-key');
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