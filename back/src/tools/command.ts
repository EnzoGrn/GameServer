import { Server, Socket } from "socket.io";
import { Player, Room, Team } from "../types";

export const SendCommandToUser = (io: Server, socket: Socket, room: Room, command: string, args: any) => {
    if (room.roomSettings.isClassicMode) {
        socket.emit(command, args);
    } else {
        const player: Player = room.players?.find((player) => player.id === socket.id);
        const team  : Team   = room.teams.find((team) => team.players.find((p) => p.id === player.id));

        for (let player of team.players)
          io.to(player.id).emit(command, args);
    }
}
