import { useRoom } from '@/lib/room/RoomProvider';
import { useSocket } from '../provider/SocketProvider';
import { Lobby } from '@/lib/room/type';
import { useEffect, useState } from 'react';
import { User } from '@/lib/player/type';

const ListTeams = ({ room }: { room: Lobby.Room }) => {

  const { socket } = useSocket();
  const { setRoom } = useRoom();

  const [teams, setTeams] = useState<Lobby.Team[]>(room.teams!);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("update-teams", (teams: Lobby.Team[]) => {
      console.log("[update-teams]: ", teams);

      setRoom({ ...room, teams });
      setTeams(teams);
    });

    return () => {
      socket.off("update-teams");
    }
  }, [socket, room]);

  const joinTeam = (team_id: number) => {
    socket?.emit('join-team', {
      room_id: room.id as string,
      team_id: team_id as number,
    });
  }

  return (
    <div className="flex-grow flex flex-col h-full p-4 order-2 min-w-80 max-w-80 max-h-96 overflow-y-visible z-10">
      <ul className="flex-grow overflow-visible">
        {teams && teams.map((team: Lobby.Team, Tindex: number) => (
          <li key={Tindex} className={`p-4 rounded-md mb-4 flex flex-col border-2 border-[#c44b4a] ${team.players.some(p => p.hasGuessed) ? 'bg-[#22c553]' : 'bg-[#f9f9f9]'}`}>
            
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-lg">{team.name}</span>
              {(!team.players.find(p => p.profile.id === socket?.id)) && (
                <button 
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                  onClick={() => joinTeam(team.id)}
                >
                  Join
                </button>
              )}
            </div>

            <ul className="mb-4">
              {team.players.map((player: User.Player, Pindex: number) => (
                <li key={Pindex} className={`p-2 rounded-md mb-2 flex items-center border-2 ${player.hasGuessed ? 'bg-[#d1ffd6]' : 'bg-[#f9f9f9]'}`}>
                  <div className="flex justify-between w-full">
                    <div className="flex flex-col items-start justify-center w-1/2 max-w-[1/2]">
                      <span className={`${socket?.id === player.profile.id ? 'text-blue-500' : 'text-gray-800'} text-nowrap`}>
                        {player.profile.name.slice(0, 12)} {socket?.id === player.profile.id ? '(You)' : ''}
                      </span>
                    </div>
                    <div className="avatar indicator">
                      {player.isHost && (
                        <div
                          className="indicator-item w-[24px] h-[24px] bg-center bg-cover"
                          style={{
                            backgroundImage: "url('crown.gif')",
                            transform: 'scaleX(-1) translateY(-10px) translateX(-10px)',
                          }}
                        />
                      )}
                      <div className="w-12">
                        <img src={`/player-icons/bear/${player.profile.avatar}.png`} alt="avatar" className="rounded-full" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex justify-end">
              <span className="font-bold text-lg">Score : {team.score}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ListTeams;
