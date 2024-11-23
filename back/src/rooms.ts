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
      bgColor: "white",
      color: "black",
    }],
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
      isClassicMode: false,
    },
    teams: [
      { id: "0", players: [], hasGuessed: false },
      { id: "1", players: [], hasGuessed: false },
    ],
    teamScoreBoard: [
      { teamId: "0", score: 0 },
      { teamId: "1", score: 0 },
    ],
    currentTeamDrawer: null,
    currentTeamDrawerIndex: 0,
    guessedTeams: [],
  };
  rooms[roomId] = newRoom;
  return newRoom;
}

// Autres fonctions pour ajouter des joueurs, supprimer des joueurs, etc.
