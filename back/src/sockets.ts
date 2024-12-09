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

      if (room.settings.gameMode === Lobby.GameMode.Team) {
        room.teams[room.teams.length - 1].players.push(room.users[room.users.length - 1]);

        socket.emit("update-teams", room.teams as Lobby.Team[]);
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

          if (room.teams && room.teams.length > 0) {
            room.teams.forEach((team: Lobby.Team) => {
              team.players = team.players.filter((player: User.Player) => player.profile.id !== socket.id);
            });

            room.teams = room.teams.filter((team: Lobby.Team) => team.players.length > 0);

            io.to(room.id).emit("update-teams", room.teams as Lobby.Team[]);
          }

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
          } else if (room.settings.gameMode === Lobby.GameMode.Team && room.teams?.length < 2) {
            _EndGame(room.id);
          }
        }
      }
    });

    socket.on("leave", () => {
      console.log("[leave | " + socket.id + "]");

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

          if (room.teams && room.teams.length > 0) {
            room.teams.forEach((team: Lobby.Team) => {
              team.players = team.players.filter((player: User.Player) => player.profile.id !== socket.id);
            });

            room.teams = room.teams.filter((team: Lobby.Team) => team.players.length > 0);

            io.to(room.id).emit("update-teams", room.teams as Lobby.Team[]);
          }

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
          } else if (room.settings.gameMode === Lobby.GameMode.Team && room.teams?.length < 2) {
            _EndGame(room.id);
          }
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

      if (!message || !res.room)
        return;
      io.to(room_id).emit("message-received", res.message as Message);

      if (res.isClose) {
        SendCommandToUser(io, socket, res.room, "message-received", SystemMessage(`${message.content} is close!`, WarningColor) as Message);
      }

      io.to(room_id).emit("update-users", res.room.users as User.Player[]);
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

      if (room.settings.gameMode === Lobby.GameMode.Team) {
        var allTeamHavePlayer: boolean = room.teams.every((team: Lobby.Team) => team.players.length > 0);

        if (!allTeamHavePlayer) {
          io.to(room.id).emit("message-received", SystemMessage("Every team must have at least one player to start the game!", ErrorColor) as Message);

          return;
        }

        var numberOfPlayerInTeam: number = 0;

        room.teams.forEach((team: Lobby.Team) => {
          numberOfPlayerInTeam += team.players.length;
        });

        if (numberOfPlayerInTeam !== room.users.length) {
          io.to(room.id).emit("message-received", SystemMessage("Every player must be in a team to start the game!", ErrorColor) as Message);

          return;
        }

        room.teams.forEach((team: Lobby.Team) => {
          team.players.forEach((player: User.Player) => {
            player.hasGuessed = false;
            player.score = 0;
          });
          team.score = 0;
        });

        io.to(room_id).emit("update-teams", room.teams as Lobby.Team[]);
      }

      room.users.forEach((player: User.Player) => {
        // -- Reset the score of the player
        player.hasGuessed = false;
        player.score = 0;
      });

      io.to(room.id).emit("update-users", room.users as User.Player[]);

      room.state.showScore = false;
      room.state.isStarted = true;

      io.to(room_id).emit("update-state", room.state as Lobby.State);

      room.currentTurn = 1;

      if (room.settings.gameMode === Lobby.GameMode.Classic) {
        room.currentDrawer = room.users[room.users.length - 1];
      } else {
        room.currentDrawer = room.teams[room.teams.length - 1].players;
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

      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
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
        room.teams.forEach((team: Lobby.Team) => {
          team.players.forEach((player: User.Player) => {
            player.hasGuessed = false;
          });
        });

        io.to(room_id).emit("update-teams", room.teams as Lobby.Team[]);

        const currentDrawer: User.Player[] = room.currentDrawer as User.Player[];

        io.to(room_id).emit("pre-starting-turn", {
          drawer: currentDrawer as User.Player[],
          round: room.currentTurn as number,
          words: words as { id: number, text: string }[]
        });
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
          var everyOneGuessed: boolean = true;

          room.teams.forEach((team: Lobby.Team) => {
            if (team.players[0] === (room.currentDrawer as User.Player[])[0])
              return;
              if (team.players[0].hasGuessed === false)
                everyOneGuessed = false;
          });

          if (timeLeft <= 0 || everyOneGuessed) {
            clearInterval(timer);
            _EndTurn(room_id);
          }
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

      room.teams?.forEach((team: Lobby.Team) => {
        if (team.players[0].hasGuessed) {
          team.score += 100;
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
        // get the team that the drawer is in
        const drawer: User.Player[] = room.currentDrawer as User.Player[];

        room.teams.forEach((team: Lobby.Team) => {
          if (team.players[0] === drawer[0]) {
            team.score += 25 * room.teams.filter((team: Lobby.Team) => team.players[0].hasGuessed).length;
          }
        });

        io.to(room_id).emit("update-users", room.users as User.Player[]);
        io.to(room_id).emit("update-teams", room.teams as Lobby.Team[]);

        var index: number = room.teams.findIndex((team: Lobby.Team) => team.players.find((player: User.Player) => player.profile.id === (room.currentDrawer as User.Player[])[0].profile.id));

        index = (index + 1) % room.teams.length;

        room.currentDrawer = room.teams[index].players;

        if (index === room.teams.length - 1) {
          room.currentTurn += 1;

          if (room.currentTurn > room.settings.maxTurn) {
            _EndGame(room_id);

            return;
          }
        }
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
        // Winners represent the best team
        const winners: Lobby.Team = room.teams.reduce((prev, current) => (prev.score > current.score ? prev : current));

        io.to(room_id).emit("game-ended", winners as Lobby.Team);
      }

      room.state.isStarted      = false;
      room.state.canDraw        = false;
      room.state.isChoosingWord = false;
      room.state.showScore      = true;

      io.to(room_id).emit("update-state", room.state as Lobby.State);
    }

    socket.on("update-gamemode", (data: any) => {
      const { room_id, mode } : { room_id: string, mode: Lobby.GameMode } = data;

      console.log("[update-gamemode | " + socket.id + "]: ", room_id, mode);

      if (!room_id || mode === undefined)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      room.settings.gameMode = mode;

      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
      io.to(room_id).emit("update-gamemode", mode as Lobby.GameMode);

      if (mode === Lobby.GameMode.Team) {
        var teamNumber: number = room.settings.numTeams;

        room.teams = [] as Lobby.Team[];

        while (room.teams.length < teamNumber) {
          room.teams.push({
            id: room.teams.length + 1 as number,
            name: `Team ${room.teams.length + 1}`,
            players: [] as User.Player[],
            score: 0
          });
        }

        room.users.forEach((player: User.Player, index: number) => {
          room.teams[index % teamNumber].players.push(player);
        });

        io.to(room_id).emit("update-teams", room.teams as Lobby.Team[]);
      } else {
        room.teams = [] as Lobby.Team[];
        
        io.to(room_id).emit("update-teams", room.teams as Lobby.Team[]);
        io.to(room.id).emit("update-users", room.users as User.Player[]);
      }
    });

    socket.on("update-number-teams", (data: any) => {
      const { room_id, numTeams } : { room_id: string, numTeams: number } = data;

      console.log("[update-number-teams | " + socket.id + "]: ", room_id, numTeams);

      if (!room_id || numTeams === undefined)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      var oldTeamsNumber: number = room.settings.numTeams;

      room.settings.numTeams = numTeams;

      if (oldTeamsNumber > numTeams) {
        room.teams = room.teams.slice(0, numTeams);

        io.to(room_id).emit("update-teams", room.teams as Lobby.Team[]);
      } else {
        while (room.teams.length < numTeams) {
          room.teams.push({
            id: room.teams.length + 1 as number,
            name: `Team ${room.teams.length + 1}`,
            players: [] as User.Player[],
            score: 0
          });
        }

        io.to(room_id).emit("update-teams", room.teams as Lobby.Team[]);
      }

      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
    });

    socket.on("join-team", (data: any) => {
      const { room_id, team_id } : { room_id: string, team_id: number } = data;

      console.log("[join-team | " + socket.id + "]: ", room_id, team_id);

      if (!room_id || team_id === undefined)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      var team: Lobby.Team | undefined = room.teams.find((checker: Lobby.Team) => checker.id === team_id);

      if (!team)
        return;
      var player: User.Player | undefined = room.users.find((checker: User.Player) => checker.profile.id === socket.id);

      if (!player)
        return;
      room.teams.forEach((team: Lobby.Team) => {
        team.players = team.players.filter((checker: User.Player) => checker.profile.id !== socket.id);
      });

      team.players.push(player);

      io.to(room_id).emit("update-teams", room.teams as Lobby.Team[]);
    });

    socket.on("update-max-players", (data: any) => {
      const { room_id, maxPlayer } : { room_id: string, maxPlayer: number } = data;

      console.log("[update-max-players | " + socket.id + "]: ", room_id, maxPlayer);

      if (!room_id || maxPlayer === undefined)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      room.settings.maxPlayer = maxPlayer;

      if (maxPlayer < room.users.length)
        room.settings.maxPlayer = room.users.length;
      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
    });

    socket.on("update-draw-time", (data: any) => {
      const { room_id, time } : { room_id: string, time: number } = data;

      console.log("[update-draw-time | " + socket.id + "]: ", room_id, time);

      if (!room_id || time === undefined)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      room.settings.drawTime = time;

      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
    });

    socket.on("update-max-rounds", (data: any) => {
      const { room_id, rounds } : { room_id: string, rounds: number } = data;

      console.log("[update-max-rounds | " + socket.id + "]: ", room_id, rounds);

      if (!room_id || rounds === undefined)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      room.settings.maxTurn = rounds;

      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
    });

    socket.on("update-language", (data: any) => {
      const { room_id, language } : { room_id: string, language: string } = data;

      console.log("[update-language | " + socket.id + "]: ", room_id, language);

      if (!room_id || !language)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      room.settings.language = language;

      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
    });

    socket.on("update-custom-words-only", (data: any) => {
      const { room_id, useCustomWordsOnly } : { room_id: string, useCustomWordsOnly: boolean } = data;

      console.log("[update-custom-words-only | " + socket.id + "]: ", room_id, useCustomWordsOnly);

      if (!room_id || useCustomWordsOnly === undefined)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      room.settings.useCustomWordsOnly = useCustomWordsOnly;

      var numberCustomWords: number = room.settings.customWords?.split(';').length || 0;

      if (useCustomWordsOnly && numberCustomWords < 3) {
        io.to(room_id).emit("message-received", SystemMessage("You need at least 3 custom words to use this option!", WarningColor) as Message);

        room.settings.useCustomWordsOnly = false;
      }

      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
    });

    socket.on("update-custom-words", (data: any) => {
      const { room_id, customWords } : { room_id: string, customWords: string } = data;

      console.log("[update-custom-words | " + socket.id + "]: ", room_id, customWords);

      if (!room_id || !customWords)
        return;
      var room: Lobby.Room | undefined = Lobby.AllRoom[room_id];

      if (!room)
        return;
      room.settings.customWords = customWords;

      io.to(room_id).emit("update-settings", room.settings as Lobby.Settings);
    });
  });
}
