// src/rooms.ts
import { Room, Player } from "./types";

export const rooms: { [key: string]: Room } = {};

export function createRoom(roomId: string, initialPlayer: Player, timestamp: number): Room {
  const newRoom: Room = {
    id: roomId,
    players: [initialPlayer],
    messages: [{
      text: `${initialPlayer.userName} is now the room owner!`,
      timestamp: 0,
    }],
    scoreBoard: [{
      playerId: initialPlayer.id,
      score: 0
    }],
    customWords: [],
    guessedPlayers: [],
    currentWord: "",
    currentDrawer: null,
    currentRound: 0,
    timeLeft: 0,
    gameStarted: false,
    roomSettings: {
      players: 8,
      language: "English",
      drawTime: 10,
      rounds: 3,
      wordCount: 3,
      hints: 2,
      useCustomWords: false,
      private: false,
    },
  };
  rooms[roomId] = newRoom;
  return newRoom;
}

// Autres fonctions pour ajouter des joueurs, supprimer des joueurs, etc.
