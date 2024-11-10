import { Server } from "socket.io";
import "dotenv/config";
import express from "express";
import cors from "cors";

const port = process.env.PORT || 3001;
const app = express();
app.use(
  cors({
    origin: "*",
  })
);

const server = app.listen(port, () => {
  console.log(`listening on ${port}`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

interface Player {
  id: string; // socket id
  userName: string; // user name
  host: boolean; // is host or not
  hasGuessed: boolean;  // has guessed the word or not
  kicksToOut: number; // number of kicks to out
  kicksGot: Player[]; // kicks got from other players
  userAvatar?: string; // user avatar
  timestamp?: number; // timestamp of joining the room
}

interface Room {
  id: string; // room code
  players: Player[]; // players in the room
  messages: any[]; // messages in the room
  scoreBoard: any[]; // score board of the room
  useCustomWords: boolean; // use custom words or not
  customWords: string[]; // custom words
  whoGuessedIt: string[]; // who guessed the word
  roomSettings: {
    players: string; // number of players
    language: string; // language
    drawTime: string; // draw time
    rounds: string; // number of rounds
    wordCount: string; // number of words to choose from
    hints: string; // number of hints
    private: boolean; // is private or not
  };
}

const rooms: { [key: string]: Room } = {};

io.on("connection", (socket) => {
  console.log("A user connected: ", socket.id);

  /**
   * @function
   * @name socket.on("get-all-rooms")
   * @description
   * Cette fonction écoute l'événement "get-all-rooms" émis par le client. Lorsqu'il est reçu, 
   * elle déclenche l'émission de l'événement "send-all-rooms" qui contient la liste actuelle des rooms.
   *
   * @event
   * @name get-all-rooms
   * @description
   * L'événement "get-all-rooms" est émis par le client pour demander les données des rooms 
   * disponibles à l'instant.
   * 
   * @event
   * @name send-all-rooms
   * @description
   * L'événement "send-all-rooms" est émis en réponse à "get-all-rooms" et contient la liste actuelle des rooms 
   * disponibles. Il est envoyé au client afin de mettre à jour l'interface utilisateur.
   *
   * @returns {void} Cette fonction ne renvoie rien.
   */
  socket.on("get-all-rooms", () => {
    socket.emit("send-all-rooms", rooms);
  });

  /**
   * @function
   * @name socket.on("create-room")
   * @description
   * Cette fonction écoute l'événement "create-room" émis par le client. Lorsqu'il est reçu,
   * elle crée une nouvelle room avec les données reçues et émet l'événement "room-data-updated"
   * pour informer les autres clients de la mise à jour.
   * 
   * @event
   * @name create-room
   * @description
   * L'événement "create-room" est émis par le client pour créer une nouvelle room avec les données
   * fournies (roomId, userAvatar, userId, host, userName, timestamp).
   * 
   * @event
   * @name room-data-updated
   * @description
   * L'événement "room-data-updated" est émis pour informer les clients de la mise à jour des données
   * de la room (roomId, rooms).
   * 
   * @param {Object} data Les données de la room à créer.
   * @param {string} data.roomId L'identifiant de la room.
   * @param {string} data.userAvatar L'avatar de l'utilisateur.
   * @param {string} data.userId L'identifiant de l'utilisateur.
   * @param {boolean} data.host Indique si l'utilisateur est l'hôte de la room.
   * @param {string} data.userName Le nom de l'utilisateur.
   * @param {number} data.timestamp Le timestamp de la connexion de l'utilisateur.
   * 
   * @returns {void} Cette fonction ne renvoie rien.
   */
  socket.on("create-room", ({ roomId, userAvatar, userId, userName, timestamp }) => {
    console.log("Creating room: ", roomId);
  
    const initialPlayer = {
      id: userId,
      userAvatar,
      userName,
      host: true,
      hasGuessed: false,
      kicksToOut: 0,
      kicksGot: [] as Player[],
      timestamp,
    };
  
    const initialScore = { playerId: userId, score: 0 };
  
    const welcomeMessage = {
      text: `${userName} is now the room owner!`,
      id: userId,
      timestamp: Date.now(),
    };
  
    const defaultRoomSettings = {
      players: "8",
      language: "English",
      drawTime: "80",
      rounds: "3",
      wordCount: "3",
      hints: "2",
      private: false, // salle publique par défaut
    };
  
    rooms[roomId] = {
      id: roomId,
      players: [initialPlayer],
      messages: [welcomeMessage],
      useCustomWords: false,
      scoreBoard: [initialScore],
      whoGuessedIt: [],
      customWords: [],
      roomSettings: defaultRoomSettings,
    };
  
    console.log("Room created: ", rooms[roomId]);
  
    socket.join(roomId);
    io.to(roomId).emit("room-data-updated", { roomId, rooms });
  });  

  /**
   * @function
   * @name socket.on("join-room")
   * @description
   * Cette fonction écoute l'événement "join-room" émis par le client. Lorsqu'il est reçu,
   * elle ajoute l'utilisateur à la room spécifiée et émet l'événement "user-is-joined" pour
   * informer les autres clients de la connexion de l'utilisateur.
   * 
   * @event
   * @name join-room
   * @description
   * L'événement "join-room" est émis par le client pour rejoindre une room spécifique.
   *  
   * @event
   * @name user-is-joined
   * @description
   * L'événement "user-is-joined" est émis pour informer les clients de la connexion d'un nouvel utilisateur
   * à la room spécifiée.
   * 
   * @param {Object} data Les données de la room à rejoindre.
   * @param {string} data.roomId L'identifiant de la room.
   * @param {string} data.userAvatar L'avatar de l'utilisateur.
   * @param {string} data.userId L'identifiant de l'utilisateur.
   * @param {string} data.userName Le nom de l'utilisateur.
   * @param {number} data.timestamp Le timestamp de la connexion de l'utilisateur.
   *  
   * @returns {void} Cette fonction ne renvoie rien.
   */
  socket.on("join-room", ({ roomId, userAvatar, userId, userName, timestamp }) => {
    console.log("Joining room: ", roomId, " by ", userId);
  
    const playerScore = { playerId: userId, score: 0 };
  
    const joinMessage = {
      text: `${userName} joined the room`,
      timestamp: Date.now(),
    };
  
    socket.join(roomId);
    rooms[roomId].messages.push(joinMessage);
    rooms[roomId].scoreBoard.push(playerScore);
  
    const newPlayer = {
      id: userId,
      userAvatar,
      userName,
      host: false,
      timestamp,
      kicksToOut: 0,
      kicksGot: [] as Player[],
      hasGuessed: false,
    };
    rooms[roomId].players.push(newPlayer);
  
    socket.to(roomId).emit("user-joined", { rooms, roomId, timestamp });
  
    io.to(roomId).emit("room-data-updated", { roomId, rooms });
  });  

  /**
   * @function
   * @name socket.on("disconnect")
   * @description
   * Cette fonction écoute l'événement "disconnect" émis par le client. Lorsqu'il est reçu,
   * elle gère la déconnexion de l'utilisateur en supprimant l'utilisateur de la room et en
   * informant les autres clients de la déconnexion.
   * 
   * @event
   * @name disconnect
   * @description
   * L'événement "disconnect" est émis par le client lorsqu'il se déconnecte du serveur.
   * 
   * @returns {void} Cette fonction ne renvoie rien.
   */
  socket.on("disconnect", () => {
    console.log("User disconnected: ", socket.id);
    let player: Player | undefined;
  
    for (let room of Object.values(rooms)) {
      player = room.players.find((checker) => checker.id === socket.id);
  
      if (player) {
        room.players = room.players.filter((player) => player.id !== socket.id);
        room.scoreBoard = room.scoreBoard.filter((player) => player.playerId !== socket.id);
  
        socket.emit("go-home");
  
        // Si la room est vide, la supprimer
        if (room.players.length === 0) {
          delete rooms[room.id];
        }
  
        const message = {
          text: `${player.userName} disconnected!`,
          timestamp: Date.now(),
        };
        room.messages.push(message);
  
        // Si l'hôte se déconnecte, choisir un nouveau hôte aléatoire
        if (player.host && room.players.length > 0) {
          const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)];
          const hostMessage = {
            text: `${randomPlayer.userName} is the new host of the game!`,
            timestamp: Date.now(),
          };
  
          room.players = room.players.map((checker) => 
            checker.id === randomPlayer.id ? { ...checker, host: true } : checker
          );
          
          room.messages.push(hostMessage);
        }
  
        io.to(room.id).emit("player-disconnected");
      }
    }
  });  

  /**
   * @function
   * @name socket.on("leave")
   * @description
   * Cette fonction écoute l'événement "leave" émis par le client. Lorsqu'il est reçu,
   * elle gère la sortie de l'utilisateur de la room en supprimant l'utilisateur de la room
   * et en informant les autres clients de la sortie de l'utilisateur.
   * 
   * @event
   * @name leave
   * @description
   * L'événement "leave" est émis par le client pour quitter la room actuelle.
   * 
   * @returns {void} Cette fonction ne renvoie rien.
   */
  socket.on("leave", ({ roomCode, mySelf }) => {
    socket.emit("go-home");
  
    const message = {
      text: `${mySelf.userName} left the room!`,
      timestamp: Date.now(),
    };
  
    const room = rooms[roomCode];
  
    room.players = room.players.filter((player) => player.id !== mySelf.id);
    room.scoreBoard = room.scoreBoard.filter((score) => score.playerId !== mySelf.id);
    room.messages.push(message);
  
    if (room.players.length === 0) {
      delete rooms[roomCode];
    }
  
    io.to(roomCode).emit("player-left");
  });  
});