import { Server, Socket } from "socket.io";
import { rooms } from "./rooms";
import { SelectWords } from "./tools/words";
import { changeTeamPlayMode, addPlayerToTeam, removePlayerFromTeam } from "./teams";
import { ReceivedMessage, SystemMessage } from "./chat/chat";
import { SendCommandToUser } from "./tools/command";
import { ErrorColor, OrangeColor, WarningColor } from "./tools/color";
import { Message } from "./chat/messageType";
import { Lobby } from "./room/type";
import { User } from "./user/type";

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
            _EndGame(room.id);
          } else if (room.settings.gameMode === Lobby.GameMode.Team /* && TODO: Team Counter */) {
            _EndGame(room.id);
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

      const res: { message: Message, room: Lobby.Room | null, isClose: boolean } = ReceivedMessage(io, socket, room_id, message);
      
      console.log(res.message);

      if (!message || !res.room)
        return;
      io.to(room_id).emit("message-received", res.message as Message);

      if (res.isClose) {
        SendCommandToUser(io, socket, res.room, "message-received", SystemMessage(`${message.content} is close!`, WarningColor) as Message);
      }

      io.to(room_id).emit("update-users", res.room.users as User.Player[]);

      // TODO: Check if all players or teams have guessed the word -> go to next turn
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

      _StartDrawingTimer(room_id);
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

      room.state.showScore = false;
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

      room.users.forEach((player: User.Player) => {
        player.hasGuessed = false;
      });

      io.to(room_id).emit("update-users", room.users as User.Player[]);

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
      const room: Lobby.Room | undefined = Lobby.AllRoom[data.roomCode];

      if (!room)
        return;
      if (room.settings.gameMode === Lobby.GameMode.Classic && (room.currentDrawer as User.Player | undefined)?.profile.id !== socket.id) {
          return;
      } else if (room.settings.gameMode === Lobby.GameMode.Team && !(room.currentDrawer as User.Player[])?.find((player: User.Player) => player.profile.id === socket.id)) {
        return;
      }

      socket.broadcast.emit('mouse', data);
    });

    socket.on('clear-canvas', () => {
      socket.broadcast.emit('clear-canvas');
    });

    const _StartDrawingTimer = (room_id: string) => {
      const room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      let timeLeft = room.settings.drawTime;

      const timer = setInterval(() => {
        timeLeft -= 1;

        io.to(room_id).emit("timer-update", timeLeft as number);

        if (room.settings.gameMode === Lobby.GameMode.Classic) {
          var guessed: number = room.users.filter((player: User.Player) => player.hasGuessed).length;

          if (timeLeft <= 0 || guessed === room.users.length - 1) {
            clearInterval(timer); // To stop the timer
            _EndTurn(room_id);
          }
        } else {
          // TODO: Team logic
          /*if (timeLeft <= 0 || room.guessedTeams.length === room.teams.length - 1) {
            clearInterval(timer);
            endTurn(room_id);
          }*/
        }

        // If the time is over, we stop the timer and go to the next turn
        if (timeLeft <= 0) {
          clearInterval(timer);
          _EndTurn(room_id);
        }
      }, 1000);
    };

    const _EndTurn = (room_id: string) => {
      const room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      io.to(room_id).emit("timer-update", room.settings.drawTime as number);

      room.users.forEach((player: User.Player) => {
        if (player.hasGuessed) {
          player.score += 100;
        }
      });

      io.to(room_id).emit("turn-ended", room.currentWord as string);

      room.state.canDraw = false;
        
      io.to(room_id).emit("update-state", room.state as Lobby.State);

      if (room.settings.gameMode === Lobby.GameMode.Classic) {
        const drawer = room.currentDrawer as User.Player;

        drawer.score += 25 * room.users.filter((player: User.Player) => player.hasGuessed).length;

        io.to(room_id).emit("update-users", room.users as User.Player[]);

        // Get index of current drawer
        var index: number = room.users.findIndex((player: User.Player) => player.profile.id === (room.currentDrawer as User.Player | undefined)?.profile.id);

        index = (index + 1) % room.users.length;

        room.currentDrawer = room.users[index];

        if (index === room.users.length - 1) {
          room.currentTurn += 1;

          if (room.currentTurn > room.settings.maxTurn) {
            _EndGame(room_id);

            return;
          }
        }

        io.to(room_id).emit("update-round", room.currentTurn as number);
      } else {
        (room.currentDrawer as User.Player[]).forEach((drawer: User.Player) => {
          drawer.score += 25 * room.users.filter((player: User.Player) => player.hasGuessed).length;
        });

        io.to(room_id).emit("update-users", room.users as User.Player[]);
        // Team logic
        /*room.currentTeamDrawerIndex = (room.currentTeamDrawerIndex + 1) % room.teams.length;
        room.currentTeamDrawer = room.teams[room.currentTeamDrawerIndex];

        if (room.currentTeamDrawerIndex === room.teams.length - 1) {
          room.currentRound += 1;
          if (room.currentRound > room.roomSettings.rounds) {
            endGame(roomId);
            return;
          }
        }*/
      }

      setTimeout(() => {
        _StartTurn(room_id);
      }, 3000);
    }

    const _EndGame = (room_id: string) => {
      const room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      if (room.settings.gameMode === Lobby.GameMode.Classic) {
        // Winners represent the 3 players with the highest score
        const winners: User.Player[] = room.users.sort((a: User.Player, b: User.Player) => b.score - a.score).slice(0, 3);

        io.to(room_id).emit("game-ended", winners as User.Player[]);
      } else {
        // TODO: Team winner
        // Winners represent the best team
        /*
        const teamWinner = Object.entries(room.teamScoreBoard).reduce((prev, current) => (prev[1].score > current[1].score ? prev : current));
        io.to(room_id).emit("game-ended", { teamWinner, scores: Array.from(room.teamScoreBoard) });
        */
      }

      room.state.isStarted      = false;
      room.state.canDraw        = false;
      room.state.isChoosingWord = false;
      room.state.showScore      = true;

      io.to(room_id).emit("update-state", room.state as Lobby.State);
    }


















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
