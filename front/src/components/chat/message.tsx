import { Message, MessageType } from "@/lib/chat/messageType";
import { useSocket } from "../provider/SocketProvider";
import { Socket } from 'socket.io-client';

const MessageView: React.FC<{ message: Message }> = ({ message }) => {
  const { socket } : { socket: Socket | null } = useSocket();

  return (
    <>
      {message.type === MessageType.MESSAGE && (
        <div key={message.timestamp} className={`flex flex-row gap-2 text-gray-800 rounded-md pl-2 ${socket?.id === message.sender_id ? 'bg-slate-200' : ''}`}>
          <span className="font-bold">
            {message.sender_name}:
          </span>
          {message.content}
        </div>
      )}
  
      {message.type === MessageType.SYSTEM && (
        <div
          key={message.timestamp} className={`flex font-semibold rounded-md pl-2`}
          style={{
            color: message.color
          }}
        >
          {message.content}
        </div>
      )}

      {message.type === MessageType.SECRET && (
        <div key={message.timestamp} className={`flex flex-row gap-2 text-green-600 rounded-md pl-2 ${socket?.id === message.sender_id ? 'bg-slate-200' : ''}`}>
          <span className="font-bold">
            {`${message.sender_name}: `}
          </span>
          {message.content}
        </div>
      )}
    </>
  );
}

export default MessageView;
