// src/sockets.ts
import { Server, Socket } from "socket.io";
import { rooms } from "./rooms";
import { Player, Room, ScoreBoard } from "./types";
import { SelectWords } from "./tools/words";
import { changeTeamPlayMode, addPlayerToTeam, removePlayerFromTeam } from "./teams";
import { ReceivedMessage, SystemMessage } from "./chat/chat";
import { SendCommandToUser } from "./tools/command";
import { ErrorColor, OrangeColor, WarningColor } from "./tools/color";
import { Message } from "./chat/messageType";
import { Lobby } from "./room/type";
import { User } from "./user/type";

function calculateWinner(room: Room) {
  return room.scoreBoard.reduce((prev, current) => (prev.score > current.score ? prev : current));
}

export function setupSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("A user connected:", socket.id);

    socket.on("create-room", (profile: User.Profile) => {
      console.log("[create-room | " + socket.id + "]: ", profile);

      var newRoom: Lobby.Room = Lobby.CreateRoom(profile, false);

      socket.emit("room-created", newRoom as Lobby.Room);
      socket.join(newRoom.id);

      socket.emit("message-received", SystemMessage("You are the host!", OrangeColor) as Message);
    });

    socket.on("join-room", (data: any) => {
      const { profile, code } : { profile: User.Profile, code: string | undefined } = data;

      console.log("[join-room | " + socket.id + "]: ", profile, code);

      const { room, isNew } : { room: Lobby.Room, isNew: boolean } = Lobby.JoinRoom(profile, code);

      socket.emit("room-joined", room as Lobby.Room);
      socket.join(room.id);

      if (isNew) {
        socket.emit("message-received", SystemMessage("Need to wait for another player to start the game!", OrangeColor) as Message);
      } else {
        io.to(room.id).emit("message-received", SystemMessage(`${profile.name} joined the room!`, OrangeColor) as Message);
        io.to(room.id).emit("update-room", room as Lobby.Room);
        io.to(room.id).emit("update-state", room.state as Lobby.State);
      }
    });

    socket.on("disconnect", () => {
      console.log("[disconnect | " + socket.id + "]");

      let user: User.Player | undefined;

      for (let room of Object.values(Lobby.AllRoom)) {
        user = room.users.find((checker: User.Player) => checker.profile.id === socket.id);

        // -- Remove the user from the room (delete the room if empty)
        if (user) {
          room.users = room.users.filter((player: User.Player) => player.profile.id !== socket.id);

          io.to(room.id).emit("message-received", SystemMessage(`${user.profile.name} left the room!`, OrangeColor) as Message);
          io.to(room.id).emit("update-users", room.users as User.Player[]);

          if (room.users.length === 0)
            delete Lobby.AllRoom[room.id];

          // TODO: Remove player from the team

          socket.emit("go-home");
        }

        // -- Change the host if the host left
        if (!room.isDefault && user && user.isHost && Lobby.AllRoom[room.id]) {
          var oldPlayer: User.Player = room.users[0];

          oldPlayer.isHost = true;

          io.to(room.id).emit("message-received", SystemMessage(`${oldPlayer.profile.name} is now the room owner!`, OrangeColor) as Message);
          io.to(room.id).emit("update-users", room.users as User.Player[]);
        }

        // -- Check if there is enough player to continue the 
        if (room.state.isStarted) {
          if (room.settings.gameMode === Lobby.GameMode.Classic && room.users.length < 2) {
            // TOOD: End the game
          } else if (room.settings.gameMode === Lobby.GameMode.Team /* && TODO: Team Counter */) {
            // TOOD: End the game
          }

          // TODO: Update the data of the game
        }
      }
    });

    socket.on("start-game", (room_id: string) => {
      console.log("[start-game | " + socket.id + "]: ", room_id);

      _StartGame(room_id);
    });

    socket.on("sent-message", (data: any) => {
      const { room_id, message } : { room_id: string, message: Message } = data;

      console.log("[sent-message | " + socket.id + "]: ", room_id, message);

      io.to(room_id).emit("message-received", message as Message);
    });

    socket.on("word-chosen", (data: any) => {
      const { room_id, word } : { room_id: string, word: string } = data;

      console.log("[word-chosen | " + socket.id + "]: ", room_id, word);

      const room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      if (room.settings.gameMode === Lobby.GameMode.Classic && room.currentDrawer === undefined && socket.id !== (room.currentDrawer as User.Player).profile.id)
        return;
      else if (room.settings.gameMode === Lobby.GameMode.Team && (room.currentDrawer === undefined || (room.currentDrawer as User.Player[]).length) && !(room.currentDrawer as User.Player[])?.find((player: User.Player) => player.profile.id === socket.id))
        return;
      room.currentWord = word;

      io.to(room_id).emit("word-chosen", word as string);

      room.state.canDraw        = true;
      room.state.isChoosingWord = false;

      io.to(room_id).emit("update-state", room.state as Lobby.State);

      // TODO: startDrawingTimer(roomId);
    });

    const _StartGame = (room_id: string) => {
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      if (room.users.length < 2) {
        io.to(room.id).emit("message-received", SystemMessage("Room must have at least two players to start the game!", ErrorColor) as Message);

        return;
      }

      room.users.forEach((player: User.Player) => {
        // -- Reset the score of the player
        player.hasGuessed = false;
        player.score = 0;
      });

      io.to(room.id).emit("update-users", room.users as User.Player[]);

      // TODO: Check if every team has at least one player (if team mode)

      room.state.isStarted = true;

      io.to(room_id).emit("update-state", room.state as Lobby.State);

      room.currentTurn = 1;

      if (room.settings.gameMode === Lobby.GameMode.Classic) {
        room.currentDrawer = room.users[room.users.length - 1];
      } else {
        // TODO: Add team logic
      }

      _StartTurn(room_id);
    };

    const _StartTurn = (room_id: string) => {
      const room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      const words: { id: number, text: string }[] = SelectWords(room);

      room.state.isChoosingWord = true;
      room.state.canDraw        = false;

      io.to(room_id).emit("update-state", room.state as Lobby.State);

      if (room.settings.gameMode === Lobby.GameMode.Classic) {
        const currentDrawer: User.Player = room.currentDrawer as User.Player;

        io.to(room_id).emit("pre-starting-turn", {
          drawer: currentDrawer as User.Player,
          round: room.currentTurn as number,
          words: words as { id: number, text: string }[]
        });
      } else {
        // TODO: Team logic
      }

      io.to(room_id).emit("update-users", room.users as User.Player[]);
    };

    socket.on('mouse', (data) => {
      const room = rooms[data.roomCode];

      if (!room) return;

      if (room.roomSettings.isClassicMode && room.currentDrawer.id !== socket.id) {
          return;
      } else if (!room.roomSettings.isClassicMode && !room?.currentTeamDrawer?.players.find((player) => player.id === socket.id)) {
        return;
      }

      socket.broadcast.emit('mouse', data);
    });

    socket.on('clear-canvas', () => {
      socket.broadcast.emit('clear-canvas');
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

    /*socket.on("start-game", ({ roomCode }) => {
      const room = rooms[roomCode];
      if (!room || room.players.length < 2) {
        io.to(roomCode).emit("received-message", {
          message: SystemMessage("Room must have at least two players to start the game!", ErrorColor) as Message,
          guessed: [] as Player[] });
        io.to(roomCode).emit("room-data-updated", { room });
        return;
      }
      room.gameStarted = true;

      if (room.roomSettings.isClassicMode) {
        room.currentDrawer = room.players[room.players.length - 1];
        room.currentDrawerIndex = room.players.length - 1;
      } else {
        room.currentTeamDrawer = room.teams[0];
        room.currentTeamDrawerIndex = 0;
      }
      room.currentRound = 1;
      startTurn(roomCode);
    });*/

    socket.on("send-message", ({ room_id, notify }) => {
      const { message, room, isClose } : { message: Message, room: Room | null, isClose: boolean } = ReceivedMessage(io, socket, room_id, notify);

      if (!message || !room)
        return;
      io.to(room_id).emit("received-message", {
        message: message as Message,
        guessed: room.guessedPlayers as Player[]
      });

      if (isClose) {
        SendCommandToUser(io, socket, room, "received-message", {
          message: SystemMessage(`${message.content} is close!`, WarningColor) as Message,
          guessed: room.guessedPlayers as Player[]
        });
      }
    });

    socket.on("get-word-list", ({ roomCode }) => {
      /*const room = rooms[roomCode];
      if (!room) {
        return console.error("Room not found:", roomCode);
      }

      const selectedWords = selectWords(room);
      io.to(roomCode).emit("send-word-list", { selectedWords });*/
    });

    socket.on('player-guessed', ({ roomCode, playerId }) => {
      const room = rooms[roomCode];
      if (!room) return;

      if (room.roomSettings.isClassicMode) {
        if (!room.guessedPlayers.includes(playerId)) {
          room.guessedPlayers.push(playerId);
        }
      } else {
        const player = room.players.find((player) => player.id === playerId);
        const team = room.teams.find((team) => team.id === player?.teamId);

        if (!team?.hasGuessed) {
          team.hasGuessed = true;
          room.guessedTeams.push(team);
        }
      }
    });

    /*socket.on("word-chosen", ({ roomId, word }) => {
      const room = rooms[roomId];
      if (!room) {
        console.error("Room not found:", roomId);
        return;
      }

      let currentDrawer: Player = null;

      if (room.roomSettings.isClassicMode) {
        currentDrawer = room.players[room.currentDrawerIndex];
      } else {
        const currentTeamDrawer = room.teams[room.currentTeamDrawerIndex];
        currentDrawer = currentTeamDrawer.players[0];
      }

      console.log("Word chosen received from:", socket.id, "Expected drawer:", currentDrawer.id);

      if (socket.id !== currentDrawer.id) {
        console.error("Unauthorized word selection attempt by:", socket.id);
        return;
      }
      room.currentWord = word;
      console.log("Word chosen:", word);

      if (room.roomSettings.isClassicMode) {
        io.to(roomId).emit("word-chosen", { currentWord: word, wordLength: word.length });
      } else {
        const players : Player[]= room.teams[room.currentTeamDrawerIndex].players;

        io.to(roomId).emit("word-chosen-team", { currentWord: word, wordLength: word.length, DrawerPlayersTeam: players});
      }
      startDrawingTimer(roomId);
    });*/

    function startTurn(roomId: string) {
      /*console.log("Starting turn for room:", roomId);
      const room = rooms[roomId];
      const wordOptions = selectWords(room);
      
      if (room.roomSettings.isClassicMode) {
        const currentDrawer = room.players[room.currentDrawerIndex];
        io.to(roomId).emit("turn-started", { drawer: currentDrawer, round: room.currentRound });
        io.to(currentDrawer.id).emit("choose-word", { words: wordOptions });
      } else {
        const team = room.teams[room.currentTeamDrawerIndex];
        const firstPlayer = team.players[0];

        io.to(roomId).emit("turn-started-team", { currentTeamDrawer: room.currentTeamDrawer, round: room.currentRound, currentDrawer: firstPlayer });

        // Get the first player of the current team drawer
        io.to(firstPlayer.id).emit("choose-word", { words: wordOptions });
      }*/
    }

    function startDrawingTimer(roomId: string) {
      const room = rooms[roomId];
      let timeLeft = room.roomSettings.drawTime;

      const timer = setInterval(() => {
        timeLeft -= 1;
        io.to(roomId).emit("timer-update", { timeLeft });

        if (room.roomSettings.isClassicMode) {
          if (timeLeft <= 0 || room.guessedPlayers.length === room.players.length - 1) {
            clearInterval(timer);
            endTurn(roomId);
          }
        } else {
          if (timeLeft <= 0 || room.guessedTeams.length === room.teams.length - 1) {
            clearInterval(timer);
            endTurn(roomId);
          }
        }
      }, 1000);
    }

    function endTurn(roomId: string) {
      const room = rooms[roomId];
      console.log("Guessed players:", room.guessedPlayers);

      if (room.roomSettings.isClassicMode) {
        room.guessedPlayers?.forEach((player) => {
          room.scoreBoard.find((score: ScoreBoard) => score.playerId === player.id).score += 100;
        });

        room.guessedPlayers = [];

        io.to(roomId).emit("turn-ended", {
          scores: room.scoreBoard,
          word: room.currentWord,
          guessedPlayers: room.guessedPlayers,
        });

        room.currentDrawerIndex = (room.currentDrawerIndex + 1) % room.players.length;
        room.currentDrawer = room.players[room.currentDrawerIndex];
        if (room.currentDrawerIndex === room.players.length - 1) {
          room.currentRound += 1;
          if (room.currentRound > room.roomSettings.rounds) {
            endGame(roomId);
            return;
          }
        }

        for (let player of room.players) {
          player.hasGuessed = false;
        }

        room.guessedPlayers = [];
      } else {
        room.guessedTeams?.forEach((team) => {
          console.log("Team guessed:", room.teamScoreBoard);
          for (let scoreTeamInfo of room.teamScoreBoard) {
            if (scoreTeamInfo.teamId === team.id) {
              scoreTeamInfo.score += 100;
            }
          }
        });

        // TODO: handle turn ended for team mode
        io.to(roomId).emit("turn-ended", {
          scores: room.scoreBoard,
          word: room.currentWord,
          guessedPlayers: room.guessedPlayers,
        });

        // TODO: maybe handle in another way the current team drawer
        room.currentTeamDrawerIndex = (room.currentTeamDrawerIndex + 1) % room.teams.length;
        room.currentTeamDrawer = room.teams[room.currentTeamDrawerIndex];

        if (room.currentTeamDrawerIndex === room.teams.length - 1) {
          room.currentRound += 1;
          if (room.currentRound > room.roomSettings.rounds) {
            endGame(roomId);
            return;
          }
        }

        for (let team of room.teams) {
          team.hasGuessed = false;
        }

        room.guessedTeams = [];
      }

      startTurn(roomId);
    }

    function endGame(roomId: string) {
      const room = rooms[roomId];

      if (room.roomSettings.isClassicMode) {
        const winner = Object.entries(room.scoreBoard).reduce((prev, current) => (prev[1].score > current[1].score ? prev : current));
        io.to(roomId).emit("game-ended", { winner, scores: Array.from(room.scoreBoard) });
      } else {
        const teamWinner = Object.entries(room.teamScoreBoard).reduce((prev, current) => (prev[1].score > current[1].score ? prev : current));
        // TODO: handle game ended for team mode
        io.to(roomId).emit("game-ended", { teamWinner, scores: Array.from(room.teamScoreBoard) });
      }
      room.gameStarted = false;
    }

    /////////////////////////////////////////////////////////// TEAM MANAGEMENT ///////////////////////////////////////////////////////////

    socket.on("change-team-play-mode", ({ roomId }) => {
      const room = rooms[roomId];

      console.log("Trying Changing team play mode...");

      if (!room || room.gameStarted) return;

      console.log("Changing team play mode...");

      changeTeamPlayMode(room);
      io.to(roomId).emit("mode-update", { isClassicMode: room.roomSettings.isClassicMode });
      io.to(roomId).emit("room-data-updated", { room: rooms[roomId] });
    });

    socket.on("add-player-to-a-team", ({ roomId, playerId }) => {
        const room = rooms[roomId];

        if (!room || room.roomSettings.isClassicMode || room.gameStarted) return;

        const player = room.players.find((player) => player.id === playerId);
        const team = room.teams.reduce((prev, current) => (prev.players.length < current.players.length ? prev : current));
        
        if (!player || !team) return;

        addPlayerToTeam(room, player, team);
      io.to(roomId).emit("room-data-updated", { room: rooms[roomId] });
    });

    socket.on("remove-player-from-team", ({ roomId, playerId }) => {
        const room = rooms[roomId];

        if (!room || room.roomSettings.isClassicMode || room.gameStarted) return;

        const player = room.players.find((player) => player.id === playerId);
        
        if (!player) return;

        removePlayerFromTeam(room, player);
      io.to(roomId).emit("room-data-updated", { room: rooms[roomId] });
    });

    socket.on("switch-player-team", ({ roomId, playerId }) => {
        const room = rooms[roomId];
        
        if (!room || room.roomSettings.isClassicMode || room.gameStarted) return;

        console.log("Switching player team...");

        const player = room.players.find((player) => player.id === playerId);

        console.log("Player found:", player);

        if (!player) return;

        console.log("Player found:", player);

        const oldTeamId = player.teamId;
        removePlayerFromTeam(room, player);
        const team = room.teams.find((team) => team.id !== oldTeamId);
        addPlayerToTeam(room, player, team);
        io.to(roomId).emit("room-data-updated", { room: rooms[roomId] });
    });
  });
}
