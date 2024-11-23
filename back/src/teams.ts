// src/team.ts
import { Console, debug } from "console";
import { Player, Room, Team } from "./types";

export function changeTeamPlayMode(room: Room) {
  if (!room.gameStarted) {
    room.roomSettings.isClassicMode = !room.roomSettings.isClassicMode;
  }

  console.log("Room settings: ", room.roomSettings);
}

export function addPlayerToTeam(room: Room, player: Player, team: Team) {
  if (team) {
    player.teamId = team.id;
    team.players.push(player);
  }

  console.log("Player added to team: ", player);
}

export function removePlayerFromTeam(room: Room, player: Player) {
  player.teamId = undefined;
  room.teams.forEach((team) => {
    team.players = team.players.filter((p) => p.id !== player.id);
  });

  console.log("Player removed from team: ", player);
}

export function addAPlayerToATeam(room: Room, player: Player)
{
  if (!room || !player || room.roomSettings.isClassicMode || room.gameStarted) return;

  const team = room.teams.reduce((prev, current) => (prev.players.length < current.players.length ? prev : current));
  
  if (!team) return;

  addPlayerToTeam(room, player, team);
}