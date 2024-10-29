import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';

dotenv.config();
const port = process.env.PORT || 8000;
const host = process.env.HOST || 'localhost';

const app = express();
const server = http.createServer(app);
export const wss = new WebSocketServer({ server });

app.get('/', (req: Request, res: Response) => {
  res.send('Hello world!');
});

app.listen(process.env.PORT, () => {
  console.log(`Server started: http://${host}:${port}`);
});