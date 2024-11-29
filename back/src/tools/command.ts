import { Server, Socket } from "socket.io";
import { Lobby } from "../room/type";
import { User } from "../user/type";

export const SendCommandToUser = (io: Server, socket: Socket, room: Lobby.Room, command: string, args: any) => {
    if (room.settings.gameMode === Lobby.GameMode.Classic) {
        socket.emit(command, args);
    } else {
        const player: User.Player = room.users.find((player) => player.profile.id === socket.id);
        // TODO: Team implémentation
        /*const team  : Team   = room.teams.find((team) => team.players.find((p) => p.id === player.id));

        for (let player of team.players)
          io.to(player.id).emit(command, args);*/
    }
}
