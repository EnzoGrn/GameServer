import { Message, MessageType } from "./messageType";
import { Socket } from 'socket.io-client';

export const SendMessage = (socket: Socket, room_id: string, text: string, username?: string): Message => {
    const message: Message = {
        sender_id  : socket.id,
        sender_name: username,
        content    : text,
        type       : MessageType.MESSAGE,
        timestamp  : Date.now()
    };

    socket?.emit('sent-message', {
        room_id: room_id as string,
        message: message as Message
    });

    return message;
}
