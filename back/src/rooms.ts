// src/rooms.ts
import { Room, Player } from "./types";

export const rooms: { [key: string]: Room } = {};

export function createRoom(roomId: string, initialPlayer: Player): Room {
  const newRoom: Room = {
    id: roomId,
    players: [initialPlayer],
    messages: [{
      text: `${initialPlayer.userName} is now the room owner!`,
      timestamp: Date.now()
    }],
    scoreBoard: [{
      playerId: initialPlayer.id,
      score: 0
    }],
    whoGuessedIt: [],
    customWords: [],
    roomSettings: {
      players: "8",
      language: "English",
      drawTime: "80",
      rounds: "3",
      wordCount: "3",
      hints: "2",
      useCustomWords: false,
      private: false,
    },
  };
  rooms[roomId] = newRoom;
  return newRoom;
}

// Autres fonctions pour ajouter des joueurs, supprimer des joueurs, etc.
