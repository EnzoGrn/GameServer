import { Message, MessageType } from "@/lib/chat/messageType";
import { useSocket } from "../provider/SocketProvider";
import { useMessages } from "@/lib/chat/chatProvider";
import { useEffect, useRef, useState } from "react";
import { SendMessage } from "@/lib/chat/message";
import { GetPlayerById } from "@/lib/player/getter";
import { Player, Room } from "@/lib/type/types";
import { Socket } from 'socket.io-client';
import MessageView from "./Message";
import { useAudio } from "@/lib/audio/audioProvider";

interface ChatProps {
  room : Room | null;
}

const Chat: React.FC<ChatProps> = ({ room }) => {
  const { socket } : { socket: Socket | null } = useSocket();
  const { messages, newMessage } : { messages: Message[], newMessage: (message: Message) => void } = useMessages();

  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref to the last message displayed in the chat.

  const [message , setMessage] = useState<string>('');     // The current message typed by the user, to send.

  // -- Audio -- //
  const [messageReceivedAudio, setMessageReceivedAudio] = useState<HTMLAudioElement | null>(null);
  const [foundWordAudio, setFoundWordAudio] = useState<HTMLAudioElement | null>(null);
  const {playAudio} = useAudio();

  useEffect(() => {
    setMessageReceivedAudio(new Audio('/sounds/player-joined.mp3'));
    setFoundWordAudio(new Audio('/sounds/found-word.mp3'));
  }, []);

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
      if (message.type !== MessageType.SECRET) {
        newMessage(message);
        if (messageReceivedAudio && message.content.includes("joined the room"))
          playAudio(messageReceivedAudio);
        if (foundWordAudio && message.content.includes("found the word"))
          playAudio(foundWordAudio);
      } else if (room.currentDrawer?.id === socket?.id || GetPlayerById(room, socket!.id!)?.hasGuessed === true || message.sender_id === socket?.id)
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
      <div className="flex-1 overflow-y-auto space-y-2 h-full max-h-[73vh] no-scrollbar">
        {messages.map((msg: Message, index: number) => (
          <div key={index}>
            <MessageView message={msg} />

            <div ref={messagesEndRef} />
          </div>
        ))}
      </div>
      <div className="join w-full">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              sendMessage(message, room?.id);
          }}
          className="input input-bordered join-item border border-[#f37b78] focus:border-[#c44b4a] rounded-l-md bg-[#f9f9f9] focus:outline-none w-full"
          placeholder="Type your guess here..."
        />
        <button
          onClick={() => sendMessage(message, room?.id)}
          className="btn join-item text-white px-4 rounded-r-md bg-[#f37b78] hover:bg-[#c44b4a]"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
