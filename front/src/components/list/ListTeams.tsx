import { useSocket } from '../provider/SocketProvider';
import { Player, Room } from '@/lib/type/types';

const ListTeams = ({ room, player }: { room: Room | null, player ?: Player }) => {
  // -- Socket -- //
  const { socket } = useSocket();

  // Make a function that allow a player to switch team
  const switchTeam = () => {
      socket?.emit('switch-player-team', {
          roomId: room?.id,
          playerId: player?.id,
      });
  };

  return (
    <div className="flex-grow flex flex-col h-full p-4 order-2 min-w-80 max-w-80">
      <div className="grid gap-4">
        {room?.teams.map((team, index) => (
          <div key={index} className="p-4 rounded-lg shadow-md">
            <h3 className="font-bold mb-4">Team {index + 1}</h3>
            <ul>
              {team.players.map((p: Player, index: number) => (
                <li
                  key={p.id}
                  className={`p-2 rounded-md mb-2 flex flex-row items-center justify-between w-full border-2 border-[#c44b4a] bg-[#f9f9f9] overflow-visible`}
                >
                  <div className="flex flex-col items-start mr-2 w-1/2 max-w-[1/2]">
                    <span className={`text-start ${player?.id === p.id ? 'text-blue-500' : 'text-gray-800'} text-nowrap`}>
                      {p.userName.slice(0, 12)} {player?.id === p.id ? '(You)' : ''}
                    </span>
                  </div>
                  <div className="avatar indicator">
                    {p.host === true &&
                      <div
                        className="indicator-item w-[24px] h-[24px] bg-center bg-cover"
                        style={{
                          backgroundImage: "url('crown.gif')",
                          transform: 'scaleX(-1) translateY(-10px) translateX(-10px)',
                        }}
                      />
                    }
                    <div className="w-12 rounded-full">
                      <img src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" /> {/* TODO: Put profile picture */}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button onClick={switchTeam} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md font-medium transition-all">Switch Team</button>
    </div>
  );
}

export default ListTeams;
