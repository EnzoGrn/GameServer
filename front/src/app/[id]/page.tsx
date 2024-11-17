'use client';

import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import { Socket } from 'socket.io-client';
import { useSocket } from '@/components/provider/SocketProvider';
import { useParams } from 'next/navigation'
import { Player, Room, Message } from '@/types';

export default function Page() {
  const params = useParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0); // Exemple de timer
  const canvasParentRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil'); // Outil actif
  const [strokeWidth, setStrokeWidth] = useState(4); // Épaisseur du trait
  const { socket } = useSocket();
  const [thisRoom, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [renderPlay, setRenderPlay] = useState(false);
  const [wordList, setWordList] = useState<{ id: number, text: string }[]>([]);
  const [isChoosingWord, setIsChoosingWord] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('send-room', (room: Room) => {
        setRoom(room);
        for (let player of room.players) {
          if (player.id === socket.id) {
            setMe(player);
            console.log('Me:', player);
          }
        }
        console.log('Room:', room);
      });
      socket.emit('get-room', params.id);
    }
    // Initialise p5.js
    if (canvasParentRef.current && socket) {
      new p5((p: p5) => sketch(p, socket), canvasParentRef.current);
    }
  }, []);

  const sketch = (p: p5, socket: Socket) => {
    p.setup = () => {
      const canvas = p.createCanvas(600, 400);
      canvas.parent(canvasParentRef.current!);
      p.background(255);

      // Écoute des dessins des autres utilisateurs
      socket.on('mouse', (data: MouseData) => {
        p.stroke(data.color);
        p.strokeWeight(data.strokeWidth);
        p.line(data.x, data.y, data.px, data.py);
      });
    };

    p.mouseDragged = () => {

      if (me?.id !== thisRoom?.currentDrawer?.id) {
        return; // Bloque le dessin si ce n'est pas leur tour
      }

      const x = p.mouseX;
      const y = p.mouseY;
      const px = p.pmouseX;
      const py = p.pmouseY;

      // Envoi des données au serveur via Socket.IO
      const data: MouseData = {
        x,
        y,
        px,
        py,
        color: tool === 'eraser' ? '#FFFFFF' : '#000000',
        strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
      };

      socket.emit('mouse', data);

      // Dessine localement aussi
      p.stroke(data.color);
      p.strokeWeight(data.strokeWidth);
      p.line(data.x, data.y, data.px, data.py);
    };

    p.draw = () => {
      // Pas d'animation en continu nécessaire
    };
  };

  const clearCanvas = () => {
    socket?.emit('clear-canvas'); // Émet un événement pour demander à tous de réinitialiser leur canvas
    const canvasElement = document.querySelector('canvas');
    if (canvasElement) {
      const context = canvasElement.getContext('2d');
      context?.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
  };

  useEffect(() => {
    // Écoute des commandes pour réinitialiser le canvas
    socket?.on('clear-canvas', () => {
      const canvasElement = document.querySelector('canvas');
      if (canvasElement) {
        const context = canvasElement.getContext('2d');
        context?.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }
    });
  }, [socket]);

  const SendChatMessage = () => {
    socket?.emit('message-sent', { roomCode: thisRoom?.id, message });
    setMessage('');
  }

  socket?.on('room-data-updated', ({ room }: { room: Room }) => {
    if (room) {
      console.log('Room updated:', room);
      setRoom(room);
    } else {
      console.error('Received null room data');
    }
  });

  socket?.on('game-started', ({ room }: { room: Room }) => {
    setRenderPlay(true);
    setRoom(room);
  });

  const isDrawing = (player: Player): boolean => {
    return player.id === thisRoom?.currentDrawer?.id;
  }

  const handleStartGame = () => {
    if (me?.host == false) return;

    socket?.emit("start-game", { roomCode: thisRoom?.id });
    playTurn();
  }

  const playTurn = () => {
    getWordList();
  };

  socket?.on("send-word-list", ({ selectedWords }: { selectedWords: { id: number, text: string }[] }) => {
    setWordList(selectedWords);
    setIsChoosingWord(true);
  });

  const getWordList = () => {
    socket?.emit("get-word-list", { roomCode: thisRoom?.id });
    setIsChoosingWord(true);
  };

  const chooseWord = (word: string) => {
    socket?.emit("word-chosen", { roomCode: thisRoom?.id, word });
    setIsChoosingWord(false);
  };

  useEffect(() => {
    if (!socket) return;

    const handleStartTimer = ({ room }: { room: Room }) => {
      if (room) {
        setRoom(room);
        setIsChoosingWord(false);
        setTimeLeft(room.roomSettings.drawTime);

        let interval = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(interval); // Stop the interval
              socket.emit('end-turn', { roomCode: room.id }); // Utilisez les données à jour
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        console.error('Received null room during start-timer');
      }
    };

    socket.on('start-timer', handleStartTimer);

    return () => {
      socket.off('start-timer', handleStartTimer);
    };
  }, [socket]);

  useEffect(() => {
    socket?.on("you-guessed", () => {
      console.log("you-guessed", me);
      socket?.emit("player-guessed", { roomCode: thisRoom?.id, playerId: me?.id });
    });
  }, [socket]);

  useEffect(() => {
    socket?.on("next-turn", ({ room }: { room: Room }) => {
      console.log("next-turn", room.currentDrawer, room.currentRound, room.timeLeft);
      setRoom((prevRoom) => prevRoom ? ({
        ...prevRoom,
        currentDrawer: room.currentDrawer,
        currentRound: room.currentRound,
        timeLeft: room.timeLeft,
      }) : prevRoom);
      setIsChoosingWord(true);
      getWordList();
    });

    return () => {
      socket?.off("next-turn");
    };
  }, [socket, thisRoom]);

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Barre du haut */}
      <div className="w-full bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="text-lg font-bold">Temps restant : {timeLeft}s</div>
        <div className="text-lg font-semibold">Mot à deviner : {thisRoom?.currentWord}</div>
        <div className="text-lg font-semibold">Manche {thisRoom?.currentRound} / {thisRoom?.roomSettings.rounds}</div>
      </div>

      {/* Contenu principal */}
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Liste des joueurs */}
        <div className="w-full md:w-1/4 p-4 bg-white shadow-md order-2 md:order-1">
          <h2 className="text-xl font-semibold mb-4">Joueurs</h2>
          <ul>
            {thisRoom?.players.map((player: Player) => (
              <li
                key={player.id}
                className={`p-2 rounded-md mb-2 ${isDrawing(player) ? 'bg-blue-100' : 'bg-gray-100'}`}
              >
                <span className="mr-2">{player.userName} {me?.id === player.id ? '(Vous)' : ''}</span>
                <span className="mr-2">
                  {thisRoom?.scoreBoard.find((score: any) => score.playerId === player.id)?.score}
                </span>
                <span>{isDrawing(player) ? '(Dessine)' : ''}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Zone de dessin */}
        <div className="flex-1 p-4 flex flex-col items-center order-1 md:order-2">
          {/* Bouton pour lancer la partie */}
          {!renderPlay && (
            <div className="w-full flex justify-center m-4">
              <button
                onClick={() => handleStartGame()}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md text-lg"
              >
                Lancer la partie
              </button>
            </div>
          )}

          {/* Choix du mot */}
          {isChoosingWord && (
            isDrawing(me!) ? (
              <div className="w-full flex justify-center m-4">
                {wordList.map((word) => (
                  <button
                    key={word.id}
                    onClick={() => chooseWord(word.text)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md text-lg mr-4"
                  >
                    {word.text}
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full flex justify-center m-4">
                <div className="bg-blue-500 text-white px-6 py-2 rounded-md text-lg">
                  {thisRoom?.currentDrawer?.userName} is choosing a word
                </div>
              </div>
            )
          )}

          {/* Canvas */}
          <div
            ref={canvasParentRef}
            className="w-full h-64 md:h-96 bg-white border border-gray-300 rounded-md mb-4"
          ></div>

          {/* Contrôles pour les outils */}
          {renderPlay && isDrawing(me!) && (
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                onClick={() => setTool('pencil')}
                className={`px-3 md:px-4 py-1 md:py-2 rounded-md ${tool === 'pencil' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
              >
                Crayon
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`px-3 md:px-4 py-1 md:py-2 rounded-md ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
              >
                Gomme
              </button>
              <button
                onClick={clearCanvas}
                className="bg-red-400 px-3 md:px-4 py-1 md:py-2 rounded-md text-white"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="w-full md:w-1/4 p-4 bg-white shadow-md flex flex-col order-3 md:order-3">
          <h2 className="text-xl font-semibold mb-4">Chat</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {/* Boucle à travers les messages dans room.messages */}
            {thisRoom?.messages
              ?.filter((msg: Message) => msg.timestamp >= (me?.timestamp ?? Infinity) || msg.timestamp === 0)
              .map((msg: Message, index: number) => (
                !msg.isPrivate || msg.isPrivate && msg.senderId === socket?.id ? (
                  <div key={index} className="bg-blue-100 p-2 rounded-md">
                    {msg.text}
                  </div>
                ) : null
              ))}
          </div>
          <div className="mt-4 flex">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message"
              className="w-full p-2 border border-gray-300 rounded-l-md"
            />
            <button
              onClick={() => SendChatMessage()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-4 rounded-r-md"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Interface pour les données envoyées via Socket.IO
interface MouseData {
  x: number;
  y: number;
  px: number;
  py: number;
  color: string;
  strokeWidth: number;
}
