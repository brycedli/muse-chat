// Event Listeners
document.getElementById('connect').addEventListener('click', connectSerial);

// Functions
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
