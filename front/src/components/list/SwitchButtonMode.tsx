import React, { useEffect, useState } from 'react';
import ListTeams from './ListTeams';
import PlayerList from './PlayerList';
import { useSocket } from '../provider/SocketProvider';
import { Lobby } from '@/lib/room/type';

const UserList = ({ room, options } : { room: Lobby.Room, options?: Lobby.Settings }) => {
  const { socket } = useSocket();

  const [isClassicMode, setIsClassicMode] = useState<Lobby.GameMode>(room.settings.gameMode);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("update-settings", (settings: Lobby.Settings) => {
      console.log("[update-settings]: ", settings);

      setIsClassicMode(settings.gameMode);
    });

    return () => {
      socket.off("update-settings");
    }
  }, [socket, room]);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("update-gamemode", (mode: Lobby.GameMode) => {
      console.log("[update-gamemode]: ", mode);

      setIsClassicMode(mode);
    });

    return () => {
      socket.off("update-settings");
    }
  }, [socket, room]);

  return (
    <div className="h-full flex w-full">
      {isClassicMode === Lobby.GameMode.Team ? (
        <ListTeams room={room} />
      ) : (
        <PlayerList room={room} />
      )}
    </div>
  );
};

export default UserList;
