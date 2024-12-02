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
import Random from '@/lib/random/string';

// -- Types -- //
import { Room } from '@/lib/type/types';
import Image from "next/image";

export default function Home() {
  // -- Navigation -- //

  const router = useRouter();
  const searchParams = useSearchParams();

  // -- Default inputs fields values -- //
  // -- Variables -- //
  const [playerName, setPlayerName] = useState<string>('');
  const [language, setLanguage] = useState<string>('English');

  // -- Functions -- //
  const OnPlayerNameChange = (value: string) => {
    let name: string = value;

    localStorage.setItem("player", name);

    setPlayerName(name);

    console.log("Player name changed to " + name);
  }

  const OnLanguageChange = (value: string) => {
    let language: string = value;

    localStorage.setItem("language", language);

    setLanguage(language);

    console.log("Language changed to " + language);
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

    setPlayerName(name);
    setLanguage(language);
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

    if (code) {
      setRoomCode(code);

      console.log("Room code found: " + code);
    }
  }, [searchParams])

  const generatePlayerName = (username: string): string => {
    return username || "Player_" + Math.floor(Math.random() * 1000);
  }

  const createRoom = () => {
    if (socket) {
      const name: string = generatePlayerName(playerName);

      console.log(name + " is creating a room...");

      const data = {
        roomId: Random.RandString(6),
        userAvatar: playerCharacter,
        userId: socket.id,
        userName: name,
        timestamp: Date.now()
      };

      socket.emit("create-room", data);
      socket.emit("init-teams", data.roomId);

      console.log("Room created with id " + data.roomId);

      // -- Go to the room -- //
      router.push(`/${data.roomId}`);
    }
  };

  const join = () => {
    const joinRoom = (roomId: string) => {
      if (socket) {
        const name: string = generatePlayerName(playerName);

        const data = {
          roomId: roomId,
          userAvatar: playerCharacter,
          userId: socket.id,
          userName: name,
          timestamp: Date.now()
        };

        // TODO: Check if the room exists, if not, create it

        socket.emit("join-room", data);

        console.log(name + " is joining the room " + roomId);

        // -- Go to the room -- //
        router.push(`/${roomId}`);
      }
    }

    if (roomCode) {
      joinRoom(roomCode);
    } else {
      const keys = Object.keys(availableRooms);

      if (keys.length > 0) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];

        joinRoom(randomKey);
      } else {
        // TODO: Create a room with a random code, and default settings
        console.log("No room available, creating a new one...");
      }
    }
  }

  // -- Player character Management -- //
  const [playerCharacter, setPlayerCharacter] = useState<number>(0);

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
                value={playerName}
                onChange={(e) => OnPlayerNameChange(e.target.value)}
                placeholder="Enter your name"
                maxLength={15}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#f37b78] focus:outline-none"
              />
            </LabelBlock>

            <LabelBlock blockName="Language">
              <select
                value={language}
                onChange={(e) => OnLanguageChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#f37b78] focus:outline-none"
              >
                <option value="English">English</option>
                {/* -- Add more option */}
              </select>
            </LabelBlock>
          </div>

          <div className="space-y-2">
            <button
              onClick={join}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 text-xl font-bold rounded-md transition-all"
            >
              Play!
            </button>

            <button
              onClick={createRoom}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md font-medium transition-all"
            >
              Create Private Room
            </button>
          </div>
        </div>

        {/* Choose Character Section */}
        <div className='w-[40%] h-full max-w-md p-6 bg-white rounded-lg shadow-lg space-y-6'>
          <p className='text-xl font-bold'>Choose your character !</p>
          <div className='flex flex-row justify-around items-center h-full'>
            <MdArrowBackIos className="cursor-pointer" size={50} onClick={() => setPlayerCharacter((prev) => (prev - 1 + playerIconsLength) % playerIconsLength)} />
            <Image className="select-none" src={`/player-icons/bear/${playerCharacter ?? 0}.png`} alt="Player Character" width={100} height={100} />
            <MdArrowBackIos size={50} className="rotate-180 cursor-pointer" onClick={() => setPlayerCharacter((playerCharacter + 1) % playerIconsLength)} />
          </div>
        </div>
      </main>

    </div>
  );
}
