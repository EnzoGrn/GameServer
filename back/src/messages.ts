// src/messages.ts
import { Room } from "./types";

export function addJoinMessage(room: Room, userName: string) {
  const joinMessage = {
    text: `${userName} joined the room`,
    timestamp: Date.now(),
  };
  room.messages.push(joinMessage);
}
