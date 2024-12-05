import { Socket } from "socket.io-client";
import { User } from "../player/type";
import { Lobby } from "./type";

export const createRoom = (socket: Socket, profile: User.Profile) => {
    if (socket) {
        profile.id   = socket.id;
        profile.name = User.GenerateName(profile.name);

        socket.emit("create-room", profile as User.Profile);
    }
};

export const joinRoom = (socket: Socket, profile: User.Profile, code?: string) => {
    if (socket) {
        profile.id   = socket.id;
        profile.name = User.GenerateName(profile.name);

        socket.emit("join-room", {
            profile: profile as User.Profile,
            code   : code as string
        });
    }
};

export const GetPlayerWithId = (room: Lobby.Room, id: string): User.Player | undefined => {
    return room.users.find((player: User.Player) => player.profile.id === id);
};

export const IsDrawing = (gameMode: Lobby.GameMode, player: User.Player, currentDrawer: User.Player | User.Player[] | undefined): boolean => {
    if (currentDrawer === undefined)
        return false;
    if (gameMode === Lobby.GameMode.Classic) {
        return player.profile.id === (currentDrawer as User.Player).profile.id;
    } else {
        return (currentDrawer as User.Player[]).find((drawer: User.Player) => drawer.profile.id === player.profile.id) !== undefined;
    }
};
