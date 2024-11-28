"use client";

import { createContext, useContext, useEffect, useState, } from 'react';
import { Lobby } from './type';
import { useSocket } from '@/components/provider/SocketProvider';
import { User } from '../player/type';

const RoomContext = createContext<{
  room: Lobby.Room,
  setRoom: (room: Lobby.Room) => void
}>({
  room: Lobby.defaultRoom,
  setRoom: (room: Lobby.Room) => {},
});

export const RoomProvider = ({ children }: any) => {
  const [room, setRoom] = useState<Lobby.Room>(Lobby.defaultRoom);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket)
      return;
    socket.on('update-users', (players: User.Player[]) => {
        console.log("[update-users]: ", players);

        setRoom({ ...room, users: players });
    });

    return () => {
      socket.off('update-users');
    }
  }, [socket]);

  return (
    <RoomContext.Provider value={{ room, setRoom }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  return useContext(RoomContext);
};
