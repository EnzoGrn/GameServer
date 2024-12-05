import { Message, MessageType } from "./messageType";
import { levenshteinDistance } from "../levenshteinDistance";
import { GetPlayerInRoom, rooms } from "../rooms";
import { Player, Room } from "../types";
import { Server, Socket } from "socket.io";
import { SuccessColor } from "../tools/color";
import { SendCommandToUser } from "../tools/command";
import { Lobby } from "../room/type";
import { User } from "../user/type";

/*
 * @brief Function to check if the message is the current word.
 * @note Returns a number between ]-1; 1[
 * - -1: The message is not the word.
 * -  0: The word is close. (mean that the distance between the message and the word is less than 2)
 * -  1: The message is the word.
 */
const _CheckMessage = (room: Lobby.Room, player: User.Player, message: string): number => {
    if (message === room.currentWord) {
        if (room.settings.gameMode === Lobby.GameMode.Classic) {
            player.hasGuessed = true;
        } else {
            // Every player in the team has to find the word.
        }

        return 1;
    } else {
        const distance: number = levenshteinDistance(message, room.currentWord);

        if (distance < 2 && distance > 0)
            return 0;
    }
    return -1;
}

export const SecretMessage = (message: Message): Message => {
    message.type = MessageType.SECRET;

    return message;
}

export const SystemMessage = (content: string, color: string): Message => {
    const message: Message = {
        type: MessageType.SYSTEM,
        content: content,
        color: color,
        timestamp: Date.now()
    };

    return message;
}

export const ReceivedMessage = (io: Server, socket: Socket, room_id: string, message: Message): { message: Message | null, room: Lobby.Room | null, isClose: boolean } => {
    const room: Lobby.Room | null = Lobby.AllRoom[room_id];

    if (!room)
        return { message: null, room: null, isClose: false };
    const player: User.Player | null = Lobby.GetPlayerInRoom(room, message.sender_id);

    if (!player)
        return { message: null, room: room, isClose: false };
    if (player.hasGuessed || (room.currentDrawer && (room.settings.gameMode === Lobby.GameMode.Classic && player.profile.id === (room.currentDrawer as User.Player).profile.id) || (room.settings.gameMode === Lobby.GameMode.Team && (room.currentDrawer as User.Player[]).find((p: User.Player) => p.profile.id === player.profile.id))))
        return { message: SecretMessage(message), room: room, isClose: false };
    let result: number = _CheckMessage(room, player, message.content);

    if (result === 1) {
        SendCommandToUser(io, socket, room, "you-guessed", {
            word: room.currentWord as string
        });

        return { message: SystemMessage(`${player.profile.name} found the word!`, SuccessColor), room: room, isClose: false };
    } else if (result === 0) {
        return { message: message, room: room, isClose: true };
    }
    return { message: message, room: room, isClose: false };
}

