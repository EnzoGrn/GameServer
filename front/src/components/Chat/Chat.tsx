import { Message, MessageType } from "@/lib/chat/messageType";
import { useSocket } from "../provider/SocketProvider";
import { useMessages } from "@/lib/chat/chatProvider";
import { useEffect, useRef, useState } from "react";
import { SendMessage } from "@/lib/chat/message";
import { Socket } from 'socket.io-client';
import { Lobby } from "@/lib/room/type";
import MessageView from "./Message";
import { useAudio } from "@/lib/audio/audioProvider";
import { User } from "@/lib/player/type";
import { GetPlayerWithId } from "@/lib/room/function";
import { useRoom } from "@/lib/room/RoomProvider";

const Chat = () => {
  const { socket               } = useSocket();
  const { room                 } = useRoom();
  const { messages, newMessage } = useMessages();

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
    socket.on('message-received', (message: Message) => {
      console.log("[message-received]: ", message);

      messageReceived(message);
    });

    return () => {
      socket.off('message-received');
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const messageReceived = (message: Message) => {
    if (!room)
      return;
    try {
      if (message.type !== MessageType.SECRET) {
        setMessageReceivedAudio((prev) => {
          if (prev && message.content.includes("joined the room")) {
            playAudio(prev);
          }
          return prev;
        });
        setFoundWordAudio((prev) => {
          if (prev && message.content.includes("found the word")) {
            playAudio(prev);
          }
          return prev;
        });
        newMessage(message);
      } else if (room.settings.gameMode === Lobby.GameMode.Classic) {
        const user: User.Player | undefined = room.currentDrawer as User.Player | undefined;

        if (user?.profile?.id === socket?.id || GetPlayerWithId(room, socket!.id!)?.hasGuessed === true || message.sender_id === socket?.id)
          newMessage(message);
      } else {
        const users: User.Player[]           = room.currentDrawer as User.Player[] | [];
        const me   : User.Player | undefined = users.find((player: User.Player) => player.profile.id === socket?.id);

        if (me !== undefined || message.sender_id === socket?.id)
          newMessage(message);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const sendMessage = (text: string, room_id?: string) => {
    if (!room_id || !room || text === '' || !socket)
      return;
    try {
      const username = GetPlayerWithId(room, socket.id!)?.profile.name;

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
