import { Player, Room } from '@/lib/type/types';
import React, { useState } from 'react';
import ListTeams from './ListTeams';
import PlayerList from './PlayerList';
import { Socket } from 'socket.io-client';

const UserList = ({ thisRoom, isClassicModeRoom, me, socket }: { thisRoom: Room, isClassicModeRoom: boolean, me: Player, socket: Socket }) => {
  const [isClassicMode, setIsClassicMode] = useState<boolean>(isClassicModeRoom);

  const switchTeam = () => {
    socket?.emit('change-team-play-mode', {
        roomId: thisRoom?.id,
    });

    setIsClassicMode((prevMode) => !prevMode);
  };

  socket?.on('mode-update', ({isClassicMode}) => {
    setIsClassicMode(isClassicMode);
  });

  return (
    <div className="h-full flex w-full">
      {!isClassicMode ? (
        <ListTeams room={thisRoom} player={me} />
      ) : (
        <PlayerList players={thisRoom?.players} me={me} drawer={thisRoom?.currentDrawer} scoreBoard={thisRoom?.scoreBoard} guessed={thisRoom?.guessedPlayers} />
      )}
    </div>
  );
};

export default UserList;
