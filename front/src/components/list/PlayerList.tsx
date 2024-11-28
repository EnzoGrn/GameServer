import { User } from "@/lib/player/type";
import { IsDrawing } from "@/lib/room/function";
import { useRoom } from "@/lib/room/RoomProvider";
import { useEffect, useState } from "react";

const PlayerList = () => {
  const { room } = useRoom();

  const [me, setMe] = useState<User.Player | undefined>(undefined);

  useEffect(() => {
    setMe(room.users?.find((player: User.Player) => player.profile.id === room.id));
  }, [room]);

  return (
    <div className="flex-grow flex flex-col h-full p-4 order-2 min-w-80 max-w-80">
      <ul className="flex-grow overflow-visible">
        {room.users && room.users.map((player: User.Player, index: number) => (
          <li key={player.profile.id} className={`p-2 rounded-md mb-2 flex flex-row items-center border-2 border-[#c44b4a] overflow-visible ${player.hasGuessed === true ? 'bg-[#22c553]' : 'bg-[#f9f9f9]'}`}>
            <span className="font-bold mr-4">#{index + 1}</span>
            <div className="flex justify-between w-full">
              <div className="flex flex-col items-start mr-2 w-1/2 max-w-[1/2]">
                <span className={`text-start ${me?.profile?.id === player.profile.id ? 'text-blue-500' : 'text-gray-800'} text-nowrap`}>
                  {player.profile.name.slice(0, 12)} {me?.profile?.id === player.profile.id ? '(You)' : ''}
                </span>
                <span className="font-extralight">
                  {player.score} points
                </span>
              </div>
              {IsDrawing(room.settings.gameMode, player, room.currentDrawer) &&
                <div
                  className="w-[48px] h-[48px] bg-center bg-cover"
                  style={{
                    backgroundImage: "url('pen.gif')",
                    transform: 'translateX(15px)',
                  }}
                />
              }
              <div className="avatar indicator">
                {player.isHost === true &&
                  <div
                    className="indicator-item w-[24px] h-[24px] bg-center bg-cover"
                    style={{
                      backgroundImage: "url('crown.gif')",
                      transform: 'scaleX(-1) translateY(-10px) translateX(-10px)',
                    }}
                  />
                }
                <div className="w-12 rounded-full">
                  <img src={player.profile.avatar} />
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
