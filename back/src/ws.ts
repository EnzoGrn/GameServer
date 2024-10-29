import { wss } from ".";

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message: string) => {
        console.log(`Received message: ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});