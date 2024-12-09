import { Server, Socket } from "socket.io";
import { Lobby } from "../room/type";
import { User } from "../user/type";

export const SendCommandToUser = (io: Server, socket: Socket, room: Lobby.Room, command: string, args: any) => {
    if (room.settings.gameMode === Lobby.GameMode.Classic) {
        socket.emit(command, args);
    } else {
        const player: User.Player = room.users.find((player) => player.profile.id === socket.id);

        if (!player)
            return;
        var inTeamIndex: number = -1;

        room.teams.forEach((team, index) => {
            if (team.players.find(p => p.profile.id === player.profile.id))
                inTeamIndex = index;
        });

        if (inTeamIndex === -1)
            return;
        room.teams[inTeamIndex].players.forEach((player) => {
            io.to(player.profile.id).emit(command, args);
        });
    }
}
