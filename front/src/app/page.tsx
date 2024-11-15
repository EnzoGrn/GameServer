'use client';

import { useSocket } from '@/components/provider/SocketProvider';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from "react";
import io, { Socket } from "socket.io-client";

interface Player {
  id: string; 
  userName: string; 
  host: boolean; 
  hasGuessed: boolean;  
  kicksToOut: number; 
  kicksGot: Player[]; 
  userAvatar?: string; 
  timestamp?: number; 
}

interface Room {
  id: string; 
  players: Player[]; 
  messages: any[]; 
  scoreBoard: any[]; 
  useCustomWords: boolean; 
  customWords: string[]; 
  whoGuessedIt: string[]; 
  roomSettings: {
    players: string; 
    language: string; 
    drawTime: string; 
    rounds: string; 
    wordCount: string; 
    hints: string; 
    private: boolean; 
  };
}

export default function Home() {
  const router = useRouter();
  const { socket, setSocket } = useSocket();
  const [playerName, setPlayerName] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<{ [key: string]: Room }>({});

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
      socket?.off("send-all-rooms"); // Nettoie les événements pour éviter les duplications
    };
  }, [socket]);

  const generateRandomString = (length: number) => {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  };

  const createRoom = () => {
    if (socket) {
      console.log(playerName + " created a room");
      const data = {
        roomId: generateRandomString(6),
        userAvatar: "",
        userId: socket.id,
        userName: playerName,
        timestamp: Date.now()
      };

      socket.emit("create-room", data);
      router.push(`/${data.roomId}`); // Navigue vers la salle créée
    }
  };

  const joinRoom = (roomId: string) => {
    if (socket) {
      const data = {
        roomId,
        userAvatar: "",
        userId: socket.id,
        playerName: playerName,
        timestamp: Date.now()
      };

      socket.emit("join-room", data);
      router.push(`/${roomId}`); // Navigue vers la salle
    }
  };

  return (
      <main className="flex flex-col items-center justify-center min-h-screen text-base-content px-4">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-center bg-white border border-gray-400 p-2 rounded-md shadow-md font-patrick-hand">
            <span className="text-red-500 border-b-2 border-red-700">D</span>
            <span className="text-green-500 border-b-2 border-green-700">r</span>
            <span className="text-blue-500 border-b-2 border-blue-700">a</span>
            <span className="text-yellow-500 border-b-2 border-yellow-700">w</span>
            <span className="text-purple-500 border-b-2 border-purple-700">i</span>
            <span className="text-orange-500 border-b-2 border-orange-700">n</span>
            <span className="text-pink-500 border-b-2 border-pink-700">g</span>
            <span className="text-teal-500 border-b-2 border-teal-700">T</span>
            <span className="text-indigo-500 border-b-2 border-indigo-700">o</span>
            <span className="text-lime-500 border-b-2 border-lime-700">g</span>
            <span className="text-cyan-500 border-b-2 border-cyan-700">e</span>
            <span className="text-gray-500 border-b-2 border-gray-700">t</span>
            <span className="text-red-500 border-b-2 border-red-700">h</span>
            <span className="text-green-500 border-b-2 border-green-700">e</span>
            <span className="text-blue-500 border-b-2 border-blue-700">r</span>
          </h1>
        </header>

        <main className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-10">
          <div className="w-full md:w-96 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Créer une Salle</h2>
            <input
              type="text"
              placeholder="Nom du joueur"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded-md"
            />
            {/*<div className="space-y-2">
            <label className="block">
              Nombre de joueurs :
              <input
                type="number"
                value={playersCount}
                onChange={(e) => setPlayersCount(Number(e.target.value))}
                min="2"
                max="10"
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              />
            </label>
            <label className="block">
              Langue :
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              >
                <option>Français</option>
                <option>Anglais</option>
              </select>
            </label>
          </div>*/}
            <button
              onClick={createRoom}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md"
            >
              Créer la Salle
            </button>
          </div>

          <div className="w-full md:w-96 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Rejoindre une Salle</h2>
            <ul className="mb-4">
              {Object.keys(availableRooms).map((room) => (
                availableRooms[room].roomSettings.private === false && (
                  <li key={room} className="flex justify-between items-center">
                    <span>{room}</span>
                    <button
                      onClick={() => joinRoom(room)}
                      className="ml-4 bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded-md"
                    >
                      Rejoindre
                    </button>
                  </li>
                )
              ))}
            </ul>
          </div>
        </main>

        <footer className="mt-10 text-gray-400 text-center">
          <p>Besoin d'aide ? Consultez notre <a href="#" className="text-blue-500">FAQ</a></p>
        </footer>
      </main>
    // <main className="flex flex-col items-center justify-center min-h-screen text-base-content px-4">
    //   <header className="mb-8 text-center">
    //     <h1 className="text-5xl font-bold text-center bg-white border border-gray-400 p-2 rounded-md shadow-md font-patrick-hand">
    //       <span className="text-red-500 border-b-2 border-red-700">D</span>
    //       <span className="text-green-500 border-b-2 border-green-700">r</span>
    //       <span className="text-blue-500 border-b-2 border-blue-700">a</span>
    //       <span className="text-yellow-500 border-b-2 border-yellow-700">w</span>
    //       <span className="text-purple-500 border-b-2 border-purple-700">i</span>
    //       <span className="text-orange-500 border-b-2 border-orange-700">n</span>
    //       <span className="text-pink-500 border-b-2 border-pink-700">g</span>
    //       <span className="text-teal-500 border-b-2 border-teal-700">T</span>
    //       <span className="text-indigo-500 border-b-2 border-indigo-700">o</span>
    //       <span className="text-lime-500 border-b-2 border-lime-700">g</span>
    //       <span className="text-cyan-500 border-b-2 border-cyan-700">e</span>
    //       <span className="text-gray-500 border-b-2 border-gray-700">t</span>
    //       <span className="text-red-500 border-b-2 border-red-700">h</span>
    //       <span className="text-green-500 border-b-2 border-green-700">e</span>
    //       <span className="text-blue-500 border-b-2 border-blue-700">r</span>
    //     </h1>
    //   </header>
    //   <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
    //     <h2 className="text-2xl font-bold mb-4 text-center">Welcome to the Game</h2>

    //     <label className="block mb-4">
    //       <span className="text-gray-700">Player Name</span>
    //       <input
    //         type="text"
    //         value={playerName}
    //         onChange={(e) => setPlayerName(e.target.value)}
    //         placeholder="Enter your name"
    //         className="w-full p-2 mb-4 border border-gray-300 rounded-md"
    //         />
    //     </label>

    //     <label className="block mb-4">
    //       <span className="text-gray-700">Language</span>
    //       <select
    //         value={language}
    //         onChange={(e) => setLanguage(e.target.value)}
    //         className="w-full p-2 mb-4 border border-gray-300 rounded-md"
    //         >
    //         <option value="English">English</option>
    //         <option value="French">French</option>
    //         <option value="Spanish">Spanish</option>
    //       </select>
    //     </label>

    //     {!showJoinOptions && !showCreateOptions && (
    //       <div className="flex gap-4">
    //         <button
    //           onClick={() => setShowJoinOptions(true)}
    //           className="w-full bg-green-500 text-white p-3 rounded-md hover:bg-green-600 transition"
    //         >
    //           Join Room
    //         </button>
    //         <button
    //           onClick={() => setShowCreateOptions(true)}
    //           className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 transition"
    //         >
    //           Create Room
    //         </button>
    //       </div>
    //     )}

    //     {showJoinOptions && (
    //       <div className="mt-4">
    //         <h3 className="text-xl font-semibold mb-2">Join a Room</h3>
    //         <label className="block mb-4">
    //           <span className="text-gray-700">Room Key (Optional)</span>
    //           <input
    //             type="text"
    //             value={roomKey}
    //             onChange={(e) => setRoomKey(e.target.value)}
    //             placeholder="Enter room key or leave blank for random"
    //             className="w-full p-2 mb-4 border border-gray-300 rounded-md"
    //           />
    //         </label>
    //         <button
    //           onClick={handleJoinRoom}
    //           className="w-full bg-green-500 text-white p-3 rounded-md hover:bg-green-600 transition"
    //         >
    //           Join Room
    //         </button>
    //         <button
    //           onClick={() => setShowJoinOptions(false)}
    //           className="w-full bg-gray-500 text-white p-3 rounded-md hover:bg-gray-600 transition mt-2"
    //         >
    //           Back
    //         </button>
    //       </div>
    //     )}

    //     {showCreateOptions && (
    //       <div className="mt-4">
    //         <h3 className="text-xl font-semibold mb-2">Create a Room</h3>

    //         <label className="block mb-4">
    //           <span className="text-gray-700">Number of Players</span>
    //           <select
    //             name="maxPlayers"
    //             value={roomSettings.maxPlayers}
    //             // onChange={(e) => setRoomSettings({ ...roomSettings, maxPlayers: e.target.value })}
    //             className="w-full p-2 mb-4 border border-gray-300 rounded-md"
    //           >
    //             {[2, 3, 4, 5, 6, 7, 8].map((num) => (
    //               <option key={num} value={num}>
    //                 {num}
    //               </option>
    //             ))}
    //           </select>
    //         </label>

    //         <label className="block mb-4">
    //           <span className="text-gray-700">Time per Turn (seconds)</span>
    //           <input
    //             type="number"
    //             value={roomSettings.timePerTurn}
    //             // onChange={(e) => setRoomSettings({ ...roomSettings, timePerTurn: e.target.value })}
    //             className="w-full p-2 mb-4 border border-gray-300 rounded-md"
    //           />
    //         </label>

    //         <label className="block mb-4">
    //           <span className="text-gray-700">Number of Rounds</span>
    //           <input
    //             type="number"
    //             value={roomSettings.rounds}
    //             // onChange={(e) => setRoomSettings({ ...roomSettings, rounds: e.target.value })}
    //             className="w-full p-2 mb-4 border border-gray-300 rounded-md"
    //           />
    //         </label>

    //         <button
    //           onClick={handleCreateRoom}
    //           className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 transition"
    //         >
    //           Create Room
    //         </button>
    //         <button
    //           onClick={() => setShowCreateOptions(false)}
    //           className="w-full bg-gray-500 text-white p-3 rounded-md hover:bg-gray-600 transition mt-2"
    //         >
    //           Back
    //         </button>
    //       </div>
    //     )}
    //   </div>
    // </main>
  );
}
