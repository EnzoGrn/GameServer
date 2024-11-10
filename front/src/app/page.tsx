'use client'

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";

interface Player {
  id: string; // socket id
  userName: string; // user name
  host: boolean; // is host or not
  hasGuessed: boolean;  // has guessed the word or not
  kicksToOut: number; // number of kicks to out
  kicksGot: Player[]; // kicks got from other players
  userAvatar?: string; // user avatar
  timestamp?: number; // timestamp of joining the room
}

interface Room {
  id: string; // room code
  players: Player[]; // players in the room
  messages: any[]; // messages in the room
  scoreBoard: any[]; // score board of the room
  useCustomWords: boolean; // use custom words or not
  customWords: string[]; // custom words
  whoGuessedIt: string[]; // who guessed the word
  roomSettings: {
    players: string; // number of players
    language: string; // language
    drawTime: string; // draw time
    rounds: string; // number of rounds
    wordCount: string; // number of words to choose from
    hints: string; // number of hints
    private: boolean; // is private or not
  };
}


export default function Home() {
  const [socket, setSocket] = useState<any>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [availableRooms, setAvailableRooms] = useState<{ [key: string]: Room }>({});

  useEffect(() => {
    const socketInstance = io("http://localhost:3001");
    setSocket(socketInstance);

    socketInstance.on("send-all-rooms", (rooms: { [key: string]: Room }) => {
      setAvailableRooms(rooms);
      console.log(rooms);
    });

    socketInstance.emit("get-all-rooms");
  }, []);

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
      console.log("Creating room with socket");
      const data = {
        roomId: generateRandomString(6),
        userAvatar: "",
        userId: socket.id,
        playerName: playerName,
        timestamp: Date.now()
      };
      socket.emit("create-room", data);
      // Navigate to the room "/game/[roomId]"
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
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 text-gray-800 px-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-blue-600">Pictionary Game</h1>
        <button className="text-sm text-gray-500 mt-2">Infos</button>
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
          {/* <div className="space-y-2">
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
          </div> */}
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
    </div>
  );
}
