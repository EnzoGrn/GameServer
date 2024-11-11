// src/sockets.ts
import { Server, Socket } from "socket.io";
import { rooms, createRoom } from "./rooms";
import { Player } from "./types";
import { addPlayerToRoom } from "./players";
import { addJoinMessage } from "./messages";

export function setupSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("A user connected:", socket.id);

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
      console.log(userName);
      const initialPlayer: Player = {
        id: userId,
        userAvatar,
        userName,
        host: true,
        hasGuessed: false,
        kicksToOut: 0,
        kicksGot: [],
        timestamp
      };
      console.log(initialPlayer);
      const newRoom = createRoom(roomId, initialPlayer);

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
      console.log("Joining room:", roomId, "by", userId);

      // Vérifier si la room existe
      const room = rooms[roomId];
      if (!room) {
        console.error(`Room ${roomId} does not exist.`);
        return;
      }

      // Ajouter le joueur et le message de jointure
      addPlayerToRoom(room, userId, userAvatar, userName, timestamp);
      addJoinMessage(room, userName);

      // Joindre la room avec Socket.io
      socket.join(roomId);

      // Notifier les autres clients de la room
      socket.to(roomId).emit("user-joined", { rooms, roomId, timestamp });

      // Mettre à jour les données de la room pour tous les clients
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

    socket.on("set-custom-words-only", ({ roomCode, boolean }) => {
      rooms[roomCode].roomSettings.useCustomWords = boolean;
      io.to(roomCode).emit("update-settings", rooms[roomCode].roomSettings);
    });

    socket.on("set-number-rounds", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.rounds = setting;
      io.to(roomCode).emit("update-settings", rooms[roomCode].roomSettings);
    });

    socket.on("set-draw-timer", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.drawTime = setting;
      io.to(roomCode).emit("update-settings", rooms[roomCode].roomSettings);
    });

    socket.on("set-players-number", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.players = setting;
      io.to(roomCode).emit("update-settings", rooms[roomCode].roomSettings);
    });

    socket.on("set-hints-number", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.hints = setting;
      io.to(roomCode).emit("update-settings", rooms[roomCode].roomSettings);
    });

    socket.on("set-word-count", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.wordCount = setting;
      io.to(roomCode).emit("update-settings", rooms[roomCode].roomSettings);
    });
  });
}
