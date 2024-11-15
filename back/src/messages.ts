// src/messages.ts
import { Room } from "./types";

export function addJoinMessage(room: Room, userName: string) {
  const joinMessage = {
    text: `${userName} joined the room`,
    timestamp: Date.now(),
  };
  room.messages.push(joinMessage);
}

export function addStartGameConditionMessage(room: Room) {
  const startGameMessage = {
    text: "Room must have at least two players to start the game!",
    timestamp: Date.now(),
  };
  room.messages.push(startGameMessage);
}

export function addMessage(room: Room, userName: string, text: string) {
  const message = {
    text: `${userName}: ${text}`,
    timestamp: Date.now(),
  };
  room.messages.push(message);
}