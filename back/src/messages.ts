// src/messages.ts
import { Room, Message, Player } from "./types";
import { levenshteinDistance } from "./levenshteinDistance";

export function addJoinMessage(room: Room, userName: string) {
  const joinMessage: Message = {
    text: `${userName} joined the room!`,
    timestamp: Date.now(),
    bgColor: "white",
    color: "green",
  };
  room?.messages?.push(joinMessage);
}

export function addStartGameConditionMessage(room: Room) {
  const startGameMessage: Message = {
    text: "Room must have at least two players to start the game!",
    timestamp: Date.now(),
    bgColor: "white",
    color: "red",
  };
  room?.messages?.push(startGameMessage);
}

export function addMessage(room: Room, userName: string, text: string) {
  const message: Message = {
    text: `${userName}: ${text}`,
    timestamp: Date.now(),
    bgColor: "white",
    color: "black",
  };
  room?.messages?.push(message);
}

export function addGuessedMessage(room: Room, userName: string) {
  const guessedMessage: Message = {
    text: `${userName} guessed the word!`,
    timestamp: Date.now(),
    bgColor: "green",
    color: "green",
  };
  room?.messages?.push(guessedMessage);
}

export function addDisconnectMessage(room: Room, userName: string) {
  const disconnectMessage: Message = {
    text: `${userName} left the room!`,
    timestamp: Date.now(),
    bgColor: "white",
    color: "red",
  };
  room?.messages?.push(disconnectMessage);
}

export function addChangeHostMessage(room: Room, userName: string) {
  const changeHostMessage: Message = {
    text: `${userName} is now the room owner!`,
    timestamp: 0,
    bgColor: "white",
    color: "orange",
  };
  if (room && room.messages) {
    // Search the message with timestamp 0 and replace it with the new message
    const index = room.messages.findIndex((message) => message.timestamp === 0);
    if (index !== -1) {
      room.messages[index] = changeHostMessage;
    } else {
      room.messages.push(changeHostMessage);
    }
  }
}

export function checkMessage(room: Room, player: Player, message: string): boolean {

  if (room.roomSettings.isClassicMode) {

    if (message === room?.currentWord && !player.hasGuessed && player.id !== room?.currentDrawer.id) {
      room?.guessedPlayers.push(player);
      console.log(room?.guessedPlayers);
      player.hasGuessed = true;
      addGuessedMessage(room, player.userName);
      return true;
    } else {
      if (!player.hasGuessed && player.id !== room?.currentDrawer?.id) {
        const distance = levenshteinDistance(message, room?.currentWord);
  
        if (distance < 2 && distance > 0) {
          const almostCorrectMessage: Message = {
            text: message + " is close!",
            timestamp: Date.now(),
            isPrivate: true,
            senderId: player.id,
            bgColor: "yellow",
            color: "yellow",
          };
          room?.messages?.push(almostCorrectMessage);
        }
      }
    }

  } else {
    const team = room.teams.find((team) => team.players.find((p) => p.id === player.id));

    if (message === room?.currentWord && !team.hasGuessed && team.id !== room?.currentTeamDrawer.id) {
      room?.guessedTeams.push(team);
      console.log(room?.guessedTeams);
      team.hasGuessed = true;
      // TODO: maybe adapt this function
      addGuessedMessage(room, player.userName);
      return true;
    } else {
      const team = room.teams.find((team) => team.players.find((p) => p.id === player.id));
     
      if (!team.hasGuessed && team.id !== room?.currentTeamDrawer?.id) {
        const distance = levenshteinDistance(message, room?.currentWord);
  
        if (distance < 2 && distance > 0) {
          const almostCorrectMessage: Message = {
            text: message + " is close!",
            timestamp: Date.now(),
            isPrivate: true,
            senderId: player.id,
            bgColor: "yellow",
            color: "yellow",
          };
          room?.messages?.push(almostCorrectMessage);
        }
      }
    }
  }
  addMessage(room, player.userName, message);
  return false;
}