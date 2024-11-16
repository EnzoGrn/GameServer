// src/messages.ts
import { Room, Message } from "./types";
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
    timestamp: Date.now(),
    bgColor: "white",
    color: "orange",
  };
  room?.messages?.push(changeHostMessage);
}

export function checkMessage(room: Room, player: any, message: string) {
  if (message === room?.currentWord && !player.hasGuessed && player.id !== room?.currentDrawer.id) {
    room?.whoGuessedIt.push(player.userName);
    player.hasGuessed = true;
    addGuessedMessage(room, player.userName);
  } else {
    if (!player.hasGuessed && player.id !== room?.currentDrawer.id) {
      const distance = levenshteinDistance(message, room?.currentWord);

      if (distance < 2) {
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
      addMessage(room, player.userName, message);
    }
  }
}