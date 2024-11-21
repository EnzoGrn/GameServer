// src/rooms.ts
import { Room, Player } from "./types";

export const rooms: { [key: string]: Room } = {};

export function createRoom(roomId: string, initialPlayer: Player, timestamp: number): Room {
  const newRoom: Room = {
    id: roomId,
    players: [initialPlayer],
    scoreBoard: [{
      playerId: initialPlayer.id,
      score: 0
    }],
    customWords: [],
    guessedPlayers: [],
    currentWord: null,
    currentDrawer: null,
    currentDrawerIndex: 0,
    currentRound: 0,
    timeLeft: 0,
    gameStarted: false,
    roomSettings: {
      players: 8,
      language: "English",
      drawTime: 80,
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

export const GetPlayerInRoom = (room: Room, player_id: string): Player | null => {
  return room.players.find((player: Player) => player.id === player_id) || null;
}

// Autres fonctions pour ajouter des joueurs, supprimer des joueurs, etc.
