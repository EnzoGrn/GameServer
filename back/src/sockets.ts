// src/sockets.ts
import { Server, Socket } from "socket.io";
import { rooms, createRoom } from "./rooms";
import { Player, Room } from "./types";
import { addPlayerToRoom } from "./players";
import { addJoinMessage, addStartGameConditionMessage, addChangeHostMessage, addDisconnectMessage, checkMessage } from "./messages";
import { selectWords } from "./words";

function calculateWinner(room: Room) {
  return room.scoreBoard.reduce((prev, current) => (prev.score > current.score ? prev : current));
}

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

    socket.on("get-room", (roomId) => {
      socket.emit("send-room", rooms[roomId]);
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
     * de la room spécifiée.
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
    socket.on("create-room", ({ roomId, userAvatar, userId, userName }) => {
      const roomTimestamp = Date.now();
      const initialPlayer: Player = {
        id: userId,
        userAvatar,
        userName,
        host: true,
        hasGuessed: false,
        kicksToOut: 0,
        kicksGot: [],
        timestamp: Date.now()
      };
      const newRoom = createRoom(roomId, initialPlayer, roomTimestamp);

      socket.join(roomId);
      io.to(roomId).emit("room-data-updated", { room: newRoom });
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
    socket.on("join-room", ({ roomId, userAvatar, userId, userName }) => {
      // Vérifier si la room existe
      const room = rooms[roomId];
      if (!room) {
        console.error(`Room ${roomId} does not exist.`);
        return;
      }

      // Ajouter le joueur et le message de jointure
      addJoinMessage(room, userName);
      addPlayerToRoom(room, userId, userAvatar, userName);

      // Joindre la room avec Socket.io
      socket.join(roomId);

      // Mettre à jour les données de la room pour tous les clients
      io.to(roomId).emit("room-data-updated", { room: rooms[roomId] });
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

          addDisconnectMessage(room, player.userName);

          // Si l'hôte se déconnecte, choisir un nouveau hôte aléatoire
          if (player.host && room.players.length > 0) {
            const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)];

            room.players = room.players.map((checker) =>
              checker.id === randomPlayer.id ? { ...checker, host: true } : checker
            );

            addChangeHostMessage(room, randomPlayer.userName);
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

      io.to(roomCode).emit("room-data-updated", { room: rooms[roomCode] });
    });

    socket.on("set-custom-words-only", ({ roomCode, boolean }) => {
      rooms[roomCode].roomSettings.useCustomWords = boolean;
      io.to(roomCode).emit("room-data-updated", { room: rooms[roomCode] });
    });

    socket.on("set-number-rounds", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.rounds = setting;
      io.to(roomCode).emit("room-data-updated", { room: rooms[roomCode] });
    });

    socket.on("set-draw-timer", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.drawTime = setting;
      io.to(roomCode).emit("room-data-updated", { room: rooms[roomCode] });
    });

    socket.on("set-players-number", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.players = setting;
      io.to(roomCode).emit("room-data-updated", { room: rooms[roomCode] });
    });

    socket.on("set-hints-number", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.hints = setting;
      io.to(roomCode).emit("room-data-updated", { room: rooms[roomCode] });
    });

    socket.on("set-word-count", ({ setting, roomCode }) => {
      rooms[roomCode].roomSettings.wordCount = setting;
      io.to(roomCode).emit("room-data-updated", { room: rooms[roomCode] });
    });

    socket.on('mouse', (data) => socket.broadcast.emit('mouse', data));

    socket.on('clear-canvas', () => {
      socket.broadcast.emit('clear-canvas');
    });

    socket.on("start-game", ({ roomCode }) => {
      const room = rooms[roomCode];
      if (!room || room.players.length < 2) {
        addStartGameConditionMessage(room);
        io.to(roomCode).emit("room-data-updated", { room });
        return;
      }
      room.gameStarted = true;
      room.currentDrawer = room.players[room.players.length - 1];
      room.currentDrawerIndex = room.players.length - 1;
      room.currentRound = 1;
      startTurn(roomCode);
    });

    socket.on("message-sent", ({ roomCode, message }) => {
      message = message.trim();
      const room = rooms[roomCode];
      const player = room?.players?.find((player) => player.id === socket.id);
      if (room && player) {
        if (checkMessage(room, player, message)) {
          socket.emit("you-guessed", { room });
        }

        io.to(roomCode).emit("room-data-updated", { room });
      }
    });

    socket.on("get-word-list", ({ roomCode }) => {
      const room = rooms[roomCode];
      if (!room) {
        return console.error("Room not found:", roomCode);
      }

      const selectedWords = selectWords(room);
      io.to(roomCode).emit("send-word-list", { selectedWords });
    });

    socket.on('player-guessed', ({ roomCode, playerId }) => {
      const room = rooms[roomCode];
      if (!room) return;

      if (!room.guessedPlayers.includes(playerId)) {
        room.guessedPlayers.push(playerId);
      }
    });

    socket.on("word-chosen", ({ roomId, word }) => {
      const room = rooms[roomId];
      if (!room) {
        console.error("Room not found:", roomId);
        return;
      }
      const currentDrawer = room.players[room.currentDrawerIndex];
      console.log("Word chosen received from:", socket.id, "Expected drawer:", currentDrawer.id);

      if (socket.id !== currentDrawer.id) {
        console.error("Unauthorized word selection attempt by:", socket.id);
        return;
      }
      room.currentWord = word;
      console.log("Word chosen:", word);
      io.to(roomId).emit("word-chosen", { currentWord: word, wordLength: word.length });


      startDrawingTimer(roomId);
    });

    function startTurn(roomId: string) {
      console.log("Starting turn for room:", roomId);
      const room = rooms[roomId];

      const currentDrawer = room.players[room.currentDrawerIndex];
      io.to(roomId).emit("turn-started", { drawer: currentDrawer, round: room.currentRound });

      const wordOptions =  selectWords(room);
      console.log("Word options:", wordOptions);
      io.to(currentDrawer.id).emit("choose-word", { words: wordOptions });
    }

    function startDrawingTimer(roomId: string) {
      const room = rooms[roomId];
      let timeLeft = room.roomSettings.drawTime;

      console.log("Starting drawing timer for room:", roomId);
      console.log("Time left:", timeLeft);

      const timer = setInterval(() => {
        timeLeft -= 1;
        io.to(roomId).emit("timer-update", { timeLeft });

        if (timeLeft <= 0 || room.guessedPlayers.length === room.players.length - 1) {
          clearInterval(timer);
          endTurn(roomId);
        }
      }, 1000);
    }

    function endTurn(roomId: string) {
      const room = rooms[roomId];
      console.log("Guessed players:", room.guessedPlayers);

      room.guessedPlayers?.forEach((player) => {
        room.scoreBoard.find((score) => score.playerId === player.id).score += 100;
      });

      io.to(roomId).emit("turn-ended", {
        scores: Array.from(room.scoreBoard),
        word: room.currentWord,
        guessedPlayers: Array.from(room.guessedPlayers),
      });

      room.currentDrawerIndex = (room.currentDrawerIndex + 1) % room.players.length;
      if (room.currentDrawerIndex === room.players.length - 1) {
        room.currentRound += 1;
        if (room.currentRound > room.roomSettings.rounds) {
          endGame(roomId);
          return;
        }
      }

      room.guessedPlayers = [];
      startTurn(roomId);
    }

    function endGame(roomId: string) {
      const room = rooms[roomId];
      const winner = Object.entries(room.scoreBoard).reduce((prev, current) => (prev[1].score > current[1].score ? prev : current));

      io.to(roomId).emit("game-ended", { winner, scores: Array.from(room.scoreBoard) });
      room.gameStarted = false;
    }

  });
}
