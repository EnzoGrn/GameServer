import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import { setupSocket } from "./sockets";

const port = process.env.PORT || 3001;
const app = express();
app.use(cors({ origin: "*" }));

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const io = new Server(server, {
  cors: {
    origin: "*", // Frontend URL
    methods: ["GET", "POST"]
  }
});
setupSocket(io);