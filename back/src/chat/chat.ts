import { Message, MessageType } from "./messageType";
import { levenshteinDistance } from "../levenshteinDistance";
import { GetPlayerInRoom, rooms } from "../rooms";
import { Player, Room } from "../types";
import { Server, Socket } from "socket.io";
import { SuccessColor } from "../tools/color";
import { SendCommandToUser } from "../tools/command";

/*
 * @brief Function to check if the message is the current word.
 * @note Returns a number between ]-1; 1[
 * - -1: The message is not the word.
 * -  0: The word is close. (mean that the distance between the message and the word is less than 2)
 * -  1: The message is the word.
 */
const _CheckMessage = (room: Room, player: Player, message: string): number => {
    if (message === room.currentWord) {
        room.guessedPlayers.push(player);

        player.hasGuessed = true;

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

export const ReceivedMessage = (io: Server, socket: Socket, room_id: string, message: Message): { message: Message | null, room: Room | null, isClose: boolean } => {
    const room: Room | null = rooms[room_id];

    if (!room)
        return { message: null, room: null, isClose: false };
    const player: Player | null = GetPlayerInRoom(room, message.sender_id);

    if (!player)
        return { message: null, room: room, isClose: false };
    if (player.hasGuessed || (room.currentDrawer && player.id === room.currentDrawer.id)) // Check if the player already found it, or if it's the drawer.
        return { message: SecretMessage(message), room: room, isClose: false };
    let result: number = _CheckMessage(room, player, message.content);

    if (result === 1) {
        SendCommandToUser(io, socket, room, "you-guessed", {
            word: room.currentWord as string
        });

        return { message: SystemMessage(`${player.userName} found the word!`, SuccessColor), room: room, isClose: false };
    } else if (result === 0) {
        return { message: message, room: room, isClose: true };
    }
    return { message: message, room: room, isClose: false };
}

