// src/players.ts
import { Room, Player } from "./types";

export function addPlayerToRoom(room: Room, userId: string, userAvatar: string, userName: string, timestamp: number): Player {
  const newPlayer: Player = {
    id: userId,
    userAvatar,
    userName,
    host: false,
    timestamp,
    kicksToOut: 0,
    kicksGot: [],
    hasGuessed: false,
  };
  room.players.push(newPlayer);

  // Ajouter le score initial pour le joueur
  room.scoreBoard.push({ playerId: userId, score: 0 });

  return newPlayer;
}
