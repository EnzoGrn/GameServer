'use client';

// -- Icons -- //
import { MdArrowBackIos } from "react-icons/md";

// -- Components -- //
import Title from '@/components/header/Title';
import LabelBlock from '@/components/block/LabelBlock';

// -- Librairies -- //
import React, { useState, useEffect, useMemo } from "react";
import { useSocket } from '@/components/provider/SocketProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRoom } from '@/lib/room/RoomProvider';

// -- Types -- //
import { Room } from '@/lib/type/types';
import { User } from '@/lib/player/type';
import { Lobby } from '@/lib/room/type';
import { createRoom, joinRoom } from '@/lib/room/function';
import { useSafeEffect } from '@/lib/react/useSafeEffect';
import Image from "next/image";

export default function Home()
{
  // -- Navigation -- //

  const router = useRouter();
  const searchParams = useSearchParams();

  // -- Room -- //

  const { setRoom } = useRoom();

  useSafeEffect(() => {
    setRoom(Lobby.defaultRoom);
  }, []);

  // -- Default inputs fields values -- //
    // -- Variables -- //
  const [profile, setProfile] = useState<User.Profile>({ id: "", name: "", language: "English", avatar: 0 });

  // -- Functions -- //
  const OnPlayerNameChange = (value: string) => {
    let name: string = value;

    localStorage.setItem("player", name);

    setProfile({ ...profile, name: name });
  }

  const OnLanguageChange = (value: string) => {
    let language: string = value;

    localStorage.setItem("language", language);

    setProfile({ ...profile, language: language });
  }

  // -- On load -- //

  /*
   * @brief When the page is loaded, we get the player name and the language from the local storage.
   * Thanks to that the player can get his previous settings.
   * And if he never played before, the default values are used.
   */
  useEffect(() => {
    let name: string = localStorage.getItem("player") || "";
    let language: string = localStorage.getItem("language") || "English";

    setProfile({ ...profile, name: name, language: language });
  }, []);

  // -- Socket -- //

  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      console.log("Socket is connected");

      socket.on("send-all-rooms", (rooms: { [key: string]: Room }) => {
        setAvailableRooms(rooms);

        console.log(rooms);
      });

      socket.emit("get-all-rooms");
    }

    return () => {
      socket?.off("send-all-rooms"); // Remove the listener
    };
  }, [socket]);

  // -- Rooms management -- //

  const [availableRooms, setAvailableRooms] = useState<{ [key: string]: Room }>({}); // List of all available rooms never displayed
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");

    if (code)
      setRoomCode(code);
  }, [searchParams])

  // -- Create a room -- //

  useEffect(() => {
    if (!socket)
      return;
    socket.on("room-created", (room: Lobby.Room) => {
      console.log("[room-created]: ", room);

      setRoom(room);

      if (room.id !== undefined)
        router.push(`/${room.id}`);
    });

    return () => {
      socket.off("room-created");
    }
  }, [socket]);

  // -- Join a room -- //

  useEffect(() => {
    if (!socket)
      return;
    socket.on("room-joined", (room: Lobby.Room) => {
      console.log("[room-joined]: ", room);

      setRoom(room);

      if (room.id !== undefined)
        router.push(`/${room.id}`);
    });

    return () => {
      socket.off("room-joined");
    };
  }, [socket]);

  // -- Render -- //

  // -- Player character Management -- //
  const playerIconsLength = useMemo(() => {
    return 5;
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">

      {/* Title of the game */}
      <Title title="Draw'It Together" />

      {/* Main Section */}
      <main className='flex flex-row justify-between items-center gap-2'>
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg space-y-6">

        {/* Label Section */}
        <div className="w-full flex flex-row justify-between items-center gap-2">
          <LabelBlock blockName="Player Name">
            <input
              type="text"
              value={profile.name}
              onChange={(e) => OnPlayerNameChange(e.target.value)}
              placeholder="Enter your name"
              maxLength={15}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#f37b78] focus:outline-none"
            />
          </LabelBlock>

          <LabelBlock blockName="Language">
            <select
              value={profile.language}
              onChange={(e) => OnLanguageChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#f37b78] focus:outline-none"
            >
              <option value="English">English</option>
              <option value="French">French</option>
              {/* -- Add more option */}
            </select>
          </LabelBlock>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => joinRoom(socket!, profile, roomCode || undefined)}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 text-xl font-bold rounded-md transition-all"
          >
            Play!
          </button>

          <button
            onClick={() => createRoom(socket!, profile)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md font-medium transition-all"
          >
            Create Private Room
          </button>
        </div>

        {/* Choose Character Section */}
        <div className='w-full h-full max-w-md p-6 bg-white rounded-lg shadow-lg space-y-6'>
          <p className='text-xl font-bold'>Choose your character !</p>
          <div className='flex flex-row justify-around items-center h-full'>
            <MdArrowBackIos
              className="cursor-pointer"
              size={50}
              onClick={() => setProfile({ ...profile, avatar: (profile.avatar - 1 + playerIconsLength) % playerIconsLength })}
            />
            <Image className="select-none" src={`/player-icons/bear/${profile.avatar}.png`} alt="Player Character" width={100} height={100} />
            <MdArrowBackIos
              size={50}
              className="rotate-180 cursor-pointer"
              onClick={() => setProfile({ ...profile, avatar: (profile.avatar + 1) % playerIconsLength })}
            />
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
