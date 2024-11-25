import { useSocket } from '../provider/SocketProvider';
import { Player, Room } from '@/lib/type/types';

const ListTeams = ({ room, player}: { room: Room | null, player?: Player}) => {
    
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
      <div>
        <h2 className="text-xl font-bold mb-4">Teams</h2>
        <button onClick={switchTeam} className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md font-medium transition-all">Switch Team</button>
        <div className="grid grid-cols-2 gap-4">
          {room?.teams.map((team, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-bold mb-2">Team {index + 1}</h3>
              <ul>
                {team.players.map((player, index) => (
                  <li key={index} className="flex items-center">
                    {/* <img src={player.userAvatar} alt={player.userName} className="w-8 h-8 rounded-full" /> */}
                    <span className="ml-2">{player.userName}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  export default ListTeams;
  