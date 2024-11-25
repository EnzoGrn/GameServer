import { Message, MessageType } from "@/lib/chat/messageType";
import { useSocket } from "../provider/SocketProvider";
import { useMessages } from "@/lib/chat/chatProvider";
import { useEffect, useRef, useState } from "react";
import { SendMessage } from "@/lib/chat/message";
import { GetPlayerById } from "@/lib/player/getter";
import { Player, Room } from "@/lib/type/types";
import { Socket } from 'socket.io-client';
import MessageView from "./Message";

interface ChatProps {
  room : Room | null;
}

const Chat: React.FC<ChatProps> = ({ room }) => {
  const { socket } : { socket: Socket | null } = useSocket();
  const { messages, newMessage } : { messages: Message[], newMessage: (message: Message) => void } = useMessages();

  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref to the last message displayed in the chat.

  const [message , setMessage] = useState<string>('');     // The current message typed by the user, to send.

  useEffect(() => {
    if (!socket)
      return;
    socket.on('received-message', ({ message, guessed } : { message: Message, guessed: Player[] }) => {
      console.log("[SYSTEM] Message received: " + message.content + " from " + message.sender_name + " in room " + room?.id);

      receivedMessage(message);

      if (room != null)
        room.guessedPlayers = guessed;
    });

    return () => {
      socket.off('received-message');
    }
  }, [room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const receivedMessage = (message: Message) => {
    if (!room)
      return;
    try {
      if (message.type !== MessageType.SECRET)
        newMessage(message);
      else if (room.currentDrawer?.id === socket?.id || GetPlayerById(room, socket!.id!)?.hasGuessed === true || message.sender_id === socket?.id)
        newMessage(message);
    } catch (err) {
      console.error(err);
    }
  }

  const sendMessage = (text: string, room_id?: string) => {
    if (!room_id || !room || text === '' || !socket)
      return;
    try {
      const username = GetPlayerById(room, socket.id!)?.userName;

      SendMessage(socket, room_id, text, username);
      setMessage('');
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="w-full h-full p-4 bg-[#f9f9f9] shadow-md rounded-lg border-[#c44b4a] border-2 flex flex-col order-3 md:order-3 justify-between">
      <div className="flex-1 overflow-y-auto space-y-2 h-full max-h-[73vh]">
        {messages.map((msg: Message, index: number) => (
          <div key={index}>
            <MessageView message={msg} />

            <div ref={messagesEndRef} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              sendMessage(message, room?.id);
          }}
          placeholder="Votre message"
          className="w-full p-2 border rounded-l-md border-[#c44b4a] focus:outline-none"
        />
        <button
          onClick={() => {
            sendMessage(message, room?.id);
          }}
          className="bg-[#f37b78] hover:bg-[#c44b4a] text-white px-3 md:px-4 rounded-r-md"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

export default Chat;
