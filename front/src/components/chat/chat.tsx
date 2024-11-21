import { Message, MessageType } from "@/lib/chat/messageType";
import { useSocket } from "../provider/SocketProvider";
import { useMessages } from "@/lib/chat/chatProvider";
import { useEffect, useRef, useState } from "react";
import { SendMessage } from "@/lib/chat/message";
import { GetPlayerById } from "@/lib/room/room";
import { Socket } from 'socket.io-client';
import { Room } from "@/lib/type/types";

interface ChatProps {
  room_id ?: string;
  room     : Room | null;
}

const Chat: React.FC<ChatProps> = ({ room_id, room }) => {
  const { socket } : { socket: Socket | null } = useSocket();
  const { messages, newMessage } : { messages: Message[], newMessage: (message: Message) => void } = useMessages();

  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref to the last message displayed in the chat.

  const [message , setMessage] = useState<string>('');     // The current message typed by the user, to send.

  useEffect(() => {
    if (!socket)
      return;
    socket.on('received-message', ({ message } : { message: Message }) => {
      receivedMessage(message);
    });

    return () => {
      socket.off('received-message');
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const receivedMessage = (message: Message) => {
    if (!room)
      return;
    try {
      console.log(message);
      console.log(room.currentDrawer);
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
    <div className="w-full md:w-1/4 h-full p-4 bg-white shadow-md rounded-b-md border-[#c44b4a] border-b-2 border-l-2 flex flex-col order-3 md:order-3">
      <h2 className="text-xl font-semibold mb-4">
        Chat
      </h2>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-96 max-h-96">
        {messages.map((msg: Message, index: number) => (
          <div key={index}>
            {msg.type === MessageType.MESSAGE && (
              <div key={index} className={`flex flex-row gap-2 text-gray-800 rounded-md pl-2 ${socket?.id === msg.sender_id ? 'bg-slate-200' : ''}`}>
                <span className="font-bold">
                  {msg.sender_name}:
                </span>
                {msg.content}
              </div>
            )}

            {msg.type === MessageType.SYSTEM && (
                <div key={index} className={`flex font-semibold rounded-md pl-2`} style={{
                    color: msg.color
                }}>
                  {msg.content}
                </div>
            )}

            {msg.type === MessageType.SECRET && (
              <div key={index} className={`flex flex-row gap-2 text-green-600 rounded-md pl-2 ${socket?.id === msg.sender_id ? 'bg-slate-200' : ''}`}>
                <span className="font-bold">
                  {`${msg.sender_name}: `}
                </span>
                {msg.content}
              </div>
            )}
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
              sendMessage(message, room_id);
          }}
          placeholder="Votre message"
          className="w-full p-2 border rounded-l-md border-[#c44b4a] focus:outline-none"
        />
        <button
          onClick={() => {
            sendMessage(message, room_id);
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
