import { Message, MessageType, SuccessColor, WarningColor } from "./messageType";
import { levenshteinDistance } from "../levenshteinDistance";
import { GetPlayerInRoom, rooms } from "../rooms";
import { Player, Room } from "../types";
import { Socket } from "socket.io";

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

export const SecretMessage = (room: Room, message: Message): Message => {
    message.type = MessageType.SECRET;

    return message;
}

export const SystemMessage = (room: Room, content: string, color: string): Message => {
    const message: Message = {
        type: MessageType.SYSTEM,
        content: content,
        color: color,
        timestamp: Date.now()
    };

    return message;
}

export const ReceivedMessage = (socket: Socket, room_id: string, message: Message): Message | null => {
    const room: Room | null = rooms[room_id];

    if (!room)
        return null;
    const player: Player | null = GetPlayerInRoom(room, message.sender_id);

    if (!player)
        return null;
    console.log("[SYSTEM] Message received: " + message.content + " from " + player.userName + " in room " + room_id);

    if (player.hasGuessed || (room.currentDrawer && player.id === room.currentDrawer.id)) // Check if the player already found it, or if it's the drawer.
        return SecretMessage(room, message);
    let result: number = _CheckMessage(room, player, message.content);

    if (result === 1) {
        socket.emit("you-guessed", {
            word: room.currentWord
        });

        // TODO: Notify all the players that the word has been found.

        return SystemMessage(room, `${player.userName} found the word!`, SuccessColor);
    } else if (result === 0) {
        return SystemMessage(room, `${message.content} is close!`, WarningColor);
    }
    return message;
}
