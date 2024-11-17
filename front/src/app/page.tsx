'use client';

// -- Components -- //
import Title from '@/components/header/Title';
import LabelBlock from '@/components/block/LabelBlock';

// -- Librairies -- //
import React, { useState, useEffect } from "react";
import { useSocket } from '@/components/provider/SocketProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import Random from '@/lib/random/string';

// -- Types -- //
import { Room } from '@/lib/type/types';

export default function Home()
{
  // -- Navigation -- //

  const router       = useRouter();
  const searchParams = useSearchParams();

  // -- Default inputs fields values -- //
    // -- Variables -- //
  const [playerName, setPlayerName] = useState<string>('');
  const [language  , setLanguage]   = useState<string>('English');

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
    let name    : string = localStorage.getItem("player")   || "";
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
  const [roomCode      , setRoomCode]       = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      setRoomCode(code);

      console.log("Room code found: " + code);
    }
  }, [searchParams])

  const generatePlayerName = (username: string) : string => {
    return username || "Player_" + Math.floor(Math.random() * 1000);
  }

  const createRoom = () => {
    if (socket) {
      const name: string = generatePlayerName(playerName);

      console.log(name + " is creating a room...");

      const data = {
        roomId    : Random.RandString(6),
        userAvatar: "", // TODO: Add avatar selection
        userId    : socket.id,
        userName  : name,
        timestamp : Date.now()
      };

      socket.emit("create-room", data);

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
          roomId    : roomId,
          userAvatar: "", // TODO: Add avatar selection
          userId    : socket.id,
          userName  : name,
          timestamp : Date.now()
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

  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-base-content px-4">

      {/* Title of the game */}
      <Title title={'Drawing Together'} />

      {/* Main Section */}
      <div className="w-full p-6 bg-white rounded-lg shadow-md">

        {/* Label Section */}
        <div className="w-full flex flex-row justify-between items-center gap-2">
          <LabelBlock blockName="Player Name">
            <input
              type="text" value={playerName} onChange={(e) => OnPlayerNameChange(e.target.value)}
              placeholder="Enter your name" className="w-full p-2 mb-4 border border-gray-300 rounded-md"
            />
          </LabelBlock>

          <LabelBlock blockName="Language">
            <select
              value={language} onChange={(e) => OnLanguageChange(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded-md"
            >
              <option value="English">English</option>
              {/* -- Add more option */}
            </select>
          </LabelBlock>
        </div>

        <button onClick={join} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 font-bold text-[2rem] rounded-md">
          Play!
        </button>

        <button onClick={createRoom} className="w-full mt-4 bg-blue-500 hover:bg-blue-600 font-bold text-white py-2 text-[1rem] rounded-md">
          Create Private Room
        </button>
      </div>
    </main>
  );
}
