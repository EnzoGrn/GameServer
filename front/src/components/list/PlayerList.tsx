import { User } from "@/lib/player/type";
import { IsDrawing } from "@/lib/room/function";
import { useSocket } from "../provider/SocketProvider";
import { Lobby } from "@/lib/room/type";
import { useEffect, useState } from "react";
import { useRoom } from "@/lib/room/RoomProvider";

const PlayerList = ({ room }: { room: Lobby.Room }) => {
  const { socket } = useSocket();
  const { setRoom } = useRoom();

  const [users, setUsers] = useState<User.Player[]>(room.users);
  const [currentDrawer, setCurrentDrawer] = useState<User.Player | null>(null);

  useEffect(() => {
    if (!socket)
      return;
    socket.on('update-room', (room: Lobby.Room) => {
      console.log("[update-room]: ", room);

      setUsers(room.users);
    });

    return () => {
      socket.off('update-room');
    }
  }, [socket, room]);

  useEffect(() => {
    if (!socket)
      return;
    socket.on('update-users', (users: User.Player[]) => {
      console.log("[update-users]: ", users);

      setUsers(users);
      setRoom({ ...room, users: users });
    }); 

    return () => {
      socket.off('update-room');
    }
  }, [socket, users, room]);

  useEffect(() => {
    if (!socket)
      return;
    socket.on('update-drawer', (drawer: User.Player) => {
      console.log("[update-drawer]: ", drawer);

      setCurrentDrawer(drawer);
    });

    return () => {
      socket.off('update-drawer');
    }
  }, [socket, room]);

  return (
    <div className="flex-grow flex flex-col h-full p-4 order-2 min-w-80 max-w-80 max-h-96 overflow-y-visible z-10">
      <ul className="flex-grow overflow-visible">
        {users && users.map((player: User.Player, index: number) => (
          <li key={index} className={`p-2 rounded-md mb-2 flex flex-row items-center border-2 border-[#c44b4a] overflow-visible ${player.hasGuessed === true ? 'bg-[#d1ffd6]' : 'bg-[#f9f9f9]'}`}>
            <span className="font-bold mr-4">#{index + 1}</span>
            <div className="flex justify-between w-full">
              <div className="flex flex-col items-start mr-2 w-1/2 max-w-[1/2]">
                <span className={`text-start ${socket?.id === player.profile.id ? 'text-blue-500' : 'text-gray-800'} text-nowrap`}>
                  {player.profile.name.slice(0, 12)} {socket?.id === player.profile.id ? '(You)' : ''}
                </span>
                <span className="font-extralight">
                  {player.score} points
                </span>
              </div>
              {currentDrawer?.profile?.id == player.profile.id &&
                <div
                  className="w-[48px] h-[48px] bg-center bg-cover"
                  style={{
                    backgroundImage: "url('pen.gif')",
                    transform: 'translateX(15px)',
                  }}
                />
              }
              <div className="indicator">
                {player.isHost === true &&
                  <div
                  className="indicator-item w-[24px] h-[24px] bg-center bg-cover"
                  style={{
                    backgroundImage: "url('crown.gif')",
                    transform: 'scaleX(-1) translateY(-10px) translateX(-10px)',
                  }}
                  />
                }
                <div className="w-12">
                  <img src={`/player-icons/bear/${player.profile.avatar}.png`} alt="avatar" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlayerList;
