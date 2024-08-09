let chatMessages = [
    
];

let systemPrompt = [{ 
    role: "system", 
    content: "You are an embedded AI assistant inside a plush otter named Rocky owned by a girl named Emily, aged 8. You were made by Muse publishing, as a conversational companion for the Muse app, so keep your response message under three sentences and keep it to playful conversation. You are Emily's friend that functions also as a therapist. Be proactive in conversation. If Emily tells you something that you think is important to either share with a parent or bring up later in conversation, save it to saveToMemory like the sample below.  ONLY RESPOND IN JSON LIKE SHOWN IN THIS EXAMPLE (which isnt neccessarily correct), AS THE CHILD WILL NOT GET THE MESSAGE OTHERWISE: {\"message\": \"What makes you say that?\", \"saveToMemory\": \"Emily misses home\"}"

}];

let memory = [
    { 
        role: "system", 
        content: "Emily made a story where Rocky went to the moon on 2024-8-5",
    },
    { 
        role: "system", 
        content: "Emily's grandpa just died on 2024-8-6",
    }
];

function addMemory (summary) {
    if (summary == "") return
    let currentDate = new Date()
    
    memory.push({
        role: "system",
        content: summary + " Date: " + currentDate.toISOString().split('T')[0],
    })
    console.log(memory);
    parseMemory();
}

function parseMemory () {
    return JSON.stringify(memory);
}

function addChatMessage(content, role) {
    chatMessages.push({ role, content });
    document.getElementById('chat').innerText += `${role}: ${content}\n`;
}

async function sendToChatAPI(userMessage) {
    chatMessages.push({ role: "user", content: userMessage });

    try {
        console.log(chatMessages.concat(memory, systemPrompt));
        const apiKey = localStorage.getItem('open-api-key');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: chatMessages.concat(memory, systemPrompt)
            })
        });

        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;
        console.log(assistantMessage);
        const obj = JSON.parse(assistantMessage);
        const message = obj.message;
        const saveToMemory = obj.saveToMemory;

        addChatMessage(message, 'assistant');
        addMemory(saveToMemory);

        await readOutLoud(message, startRecognition); // Pass startRecognition as the callback
    } catch (error) {
        console.error('Error:', error);
        isProcessing = false; // Reset processing flag on error
    }
}


// Event Listeners
document.getElementById('save-key-eleven').addEventListener('click', () => { saveApiKey('eleven') });
document.getElementById('save-key-open').addEventListener('click', () => { saveApiKey('open') });
window.addEventListener('load', () => { loadApiKey('eleven'), loadApiKey('open') });

function saveApiKey(type) {
    const apiKey = document.getElementById(type + '-api-key').value;
    localStorage.setItem(type + '-api-key', apiKey);
    console.log(type, apiKey);
}

function loadApiKey(type) {
    const savedKey = localStorage.getItem(type + '-api-key');
    if (savedKey) {
        console.log(type, savedKey);
        document.getElementById(type + '-api-key').value = savedKey;
    }
}

// Event Listeners
document.getElementById('chat-send').addEventListener('click', manualSend);

function manualSend() {
    const userInput = document.getElementById('chat-input').value;
    addChatMessage(userInput, 'user');
    sendToChatAPI(userInput);
    document.getElementById('chat-input').value = '';
}
