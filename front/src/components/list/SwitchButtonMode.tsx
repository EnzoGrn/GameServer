import React, { useEffect, useState } from 'react';
import ListTeams from './ListTeams';
import PlayerList from './PlayerList';
import { useSocket } from '../provider/SocketProvider';
import { Lobby } from '@/lib/room/type';

const UserList = ({ room } : { room: Lobby.Room }) => {
  const { socket } = useSocket();

  const [isClassicMode, setIsClassicMode] = useState<Lobby.GameMode>(Lobby.GameMode.Classic);

  useEffect(() => {
    setIsClassicMode(room?.settings.gameMode);
  }, [room]);

  /*const switchTeam = () => {
    socket?.emit('change-team-play-mode', {
        roomId: thisRoom?.id,
    });

    setIsClassicMode((prevMode) => !prevMode);
  };

  socket?.on('mode-update', ({isClassicMode}) => {
    setIsClassicMode(isClassicMode);
  });*/

  return (
    <div className="h-full flex w-full">
      {isClassicMode === Lobby.GameMode.Team ? (
        <ListTeams />
      ) : (
        <PlayerList room={room} />
      )}
    </div>
  );
};

export default UserList;
