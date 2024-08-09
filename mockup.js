const userInput = document.getElementById('memory-input');
const overlay = document.getElementById('overlay');
const memoryTemplate = document.getElementById('memory-template');
const memoryContainer = document.getElementById('memory-container');

userInput.addEventListener('input', onUpdateText);
function onSubmit () {
    let input = userInput.value;
    if (input == "") {
        return;
    }
    addMemory(input);
    closeOverlay();
    userInput.value = "";
    let newMemory = memoryTemplate.cloneNode(true);
    newMemory.querySelector('h3').innerText = input;
    memoryContainer.appendChild(newMemory);
}

function onUpdateText () {
    let input = userInput.value;
    if (input == "") {
        document.getElementById("done-button").style.opacity = "0.5";
    }
    else{
        document.getElementById("done-button").style.opacity = "1";
    }
}

function closeOverlay() {
    let overlay = document.getElementById('overlay');
    overlay.style.display = 'none';
}

function openOverlay () {
    let overlay = document.getElementById('overlay');
    overlay.style.display = 'flex';
}

let suggestions = [ "Try: Exploring thoughts on diversity and inclusion.", "Try: Talking about the importance of honesty.", "Try: Discussing feelings about a recent family change."];
let suggestionIncrement = 0;
function changeSuggestion () {
    let suggestionText = document.getElementById('suggestion-text');
    suggestionText.innerText = suggestions[suggestionIncrement++ % suggestions.length];
}


overlay.addEventListener('click', function(event) {
    if (event.target === overlay) {
        // Call your function here
        closeOverlay();
    }
});