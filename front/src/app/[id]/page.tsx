'use client';

// -- Components -- //
import Clock from '@/components/element/Clock';
import WordDisplay, { GameState } from '@/components/element/WordDisplay';
import Round from '@/components/element/Round';
import PlayerList from '@/components/list/PlayerList';
import InvitationBox from '@/components/invitation/Invitation';

// -- Librairies -- //
import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSafeEffect } from '@/lib/react/useSafeEffect';
import { useParams } from 'next/navigation'
import { Socket } from 'socket.io-client';
import p5 from 'p5';

// -- Types -- //
import { Player, Room, Message } from '@/lib/type/types';
import { MouseData } from '@/lib/type/mouseData';

export default function Page()
{
  // -- The socket -- //
  const { socket } = useSocket();

  // -- Get the room ID from the URL -- //
  const params = useParams<{ id: string }>();
  const [inviteLink, setInviteLink] = useState<string>('');

  /*
   * @brief Generate a invite link
   */
  useEffect(() => {
    setInviteLink(`${window.location.origin}?code=${params.id}`);
  }, [params]);

  // -- Canvas -- //

  const canvasParentRef = useRef<HTMLDivElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLDivElement | null>(null); // Hidden canvas for resizing the main canvas
  const [p5Instance, setP5Instance] = useState<p5 | null>(null);

  useSafeEffect(() => {
    if (socket) {
      socket.on('send-room', (room: Room) => {
        setRoom(room);

        for (let player of room.players) {
          if (player.id === socket.id) {
            setMe(player);
          }
        }

        console.log('Room:', room);
      });

      socket.emit('get-room', params.id);

      return () => {
        socket.off('send-room');
      };
    }

    if (canvasParentRef.current && socket)
      setP5Instance(new p5((p: p5) => sketch(p, socket), canvasParentRef.current));

    return () => {
      p5Instance?.remove();
    };
  }, []);

  const sketch = (p: p5, socket: Socket) => {
    p.setup = () => {
      if (canvasParentRef.current) {
        const { width, height } = canvasParentRef.current.getBoundingClientRect();
        const canvas            = p.createCanvas(width, height);

        canvas.parent(canvasParentRef.current);

        // Écoute des dessins des autres utilisateurs
        socket.on('mouse', (data: MouseData) => {
          p.stroke(data.color);
          p.strokeWeight(data.strokeWidth);
          p.line(data.x, data.y, data.px, data.py);
        });
      }
    };

    p.mouseDragged = () => {
      if (socket?.id !== thisRoom?.currentDrawer?.id)
        return; // Bloque le dessin si ce n'est pas leur tour
      const x  = p.mouseX;
      const y  = p.mouseY;
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

  /*
   * @brief Resize the canvas when the window is resized
   */
  useEffect(() => {
    const resizeCanvas = () => {
      if (hiddenCanvasRef.current) {
        const { width, height } = hiddenCanvasRef.current.getBoundingClientRect();

        if (p5Instance)
          p5Instance.resizeCanvas(width, height); // !!! When the canvas is resized, it clears the canvas...
      }
    };

    window.addEventListener('resize', resizeCanvas);

    resizeCanvas();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [p5Instance]);

  useEffect(() => {
    socket?.on('clear-canvas', () => {
      const canvasElement = document.querySelector('canvas');

      if (canvasElement) {
        const context = canvasElement.getContext('2d');

        context?.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }
    });

    return () => {
      socket?.off('clear-canvas');
    };
  }, [socket]);

  const clearCanvas = () => {
    const canvasElement = document.querySelector('canvas');

    socket?.emit('clear-canvas');

    if (canvasElement) {
      const context = canvasElement.getContext('2d');

      context?.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
  };

  // -- My profile -- //
  const [me, setMe] = useState<Player | undefined>(undefined);

  // -- Game State -- //
  const [gameState, setGameState] = useState<GameState>('waiting');

  // -- Word List -- //
  const [wordList      , setWordList]       = useState<{ id: number, text: string }[]>([]);
  const [isChoosingWord, setIsChoosingWord] = useState<boolean>(false);

  // -- State -- //

  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0); // Exemple de timer
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil'); // Outil actif
  const [strokeWidth, setStrokeWidth] = useState(4); // Épaisseur du trait
  const [thisRoom, setRoom] = useState<Room | null>(null);
  const [renderPlay, setRenderPlay] = useState(false);

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
  }

  useEffect(() => {
    if (!socket) return;

    const handleTurnStarted = ({ drawer, round }: { drawer: Player; round: number }) => {
      console.log("Turn started:", drawer, round);
      setRoom((prevRoom) => prevRoom ? { ...prevRoom, currentDrawer: drawer, currentRound: round } : prevRoom);
      setTimeLeft(thisRoom?.roomSettings?.drawTime || 60);
      setIsChoosingWord(true);
      setRenderPlay(true);
      console.log("leaving handleTurnStarted");
    };

    socket.on("turn-started", handleTurnStarted);

    return () => {
      socket.off("turn-started", handleTurnStarted);
    };
  }, [socket, thisRoom]);

  useEffect(() => {
    if (!socket) return;

    const handleChooseWord = ({ words }: { words: { id: number, text: string }[] }) => {
      console.log("choose-word", words);
      setWordList(words);
      setIsChoosingWord(true);
      console.log("leaving handleChooseWord");
    };

    socket.on("choose-word", handleChooseWord);

    return () => {
      socket.off("choose-word", handleChooseWord);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleWordChosen = ({ currentWord, wordLength }: { currentWord: string, wordLength: number }) => {
      console.log("word-chosen", wordLength);
      setIsChoosingWord(false); // Le choix de mot est terminé
      console.log("CurrentDrawer:", thisRoom?.currentDrawer?.id);
      console.log("SocketId:", socket.id);
      if (thisRoom?.currentDrawer?.id !== socket.id) {
        console.log("Im not the drawer");
        setRoom((prevRoom) => prevRoom ? { ...prevRoom, currentWord: "_".repeat(wordLength) } : prevRoom); // Affiche un masque du mot
      } else {
        console.log("Im the drawer");
        setRoom((prevRoom) => prevRoom ? { ...prevRoom, currentWord } : prevRoom); // Affiche le mot choisi
      }
      console.log("leaving handleWordChosen");
    };

    socket.on("word-chosen", handleWordChosen);

    return () => {
      socket.off("word-chosen", handleWordChosen);
    };
  }, [socket, thisRoom]);

  const chooseWord = (word: string) => {
    socket?.emit("word-chosen", { roomId: thisRoom?.id, word });

    setIsChoosingWord(false);

    if (me?.id === thisRoom?.currentDrawer?.id)
      setGameState('drawing');
    else
      setGameState('guessing');
  };

  useEffect(() => {
    if (!socket) return;

    const handleYouGuessed = () => {
      console.log("You guessed the word!");

      setGameState("guess");
    };

    socket.on("you-guessed", handleYouGuessed);

    return () => {
      socket.off("you-guessed", handleYouGuessed);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = ({ timeLeft }: { timeLeft: number }) => {
      console.log("Timer update:", timeLeft);
      setTimeLeft(timeLeft);
    };

    socket.on("timer-update", handleTimerUpdate);

    return () => {
      socket.off("timer-update", handleTimerUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleTurnEnded = ({
      scores,
      word,
      guessedPlayers,
    }: {
      scores: { [playerId: string]: number };
      word: string;
      guessedPlayers: string[];
    }) => {
      setRoom((prevRoom) =>
        prevRoom
          ? { ...prevRoom, scores, currentWord: word, guessedPlayers: prevRoom.players.filter(player => guessedPlayers.includes(player.id)) }
          : prevRoom
      );
      console.log("Turn ended:", word, guessedPlayers);
    };

    socket.on("turn-ended", handleTurnEnded);

    return () => {
      socket.off("turn-ended", handleTurnEnded);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleGameEnded = ({
      winner,
      scores,
    }: {
      winner: { id: string; score: number };
      scores: { [playerId: string]: number };
    }) => {
      console.log("Game ended. Winner:", winner);
      setRoom((prevRoom) =>
        prevRoom
          ? { ...prevRoom, scores, gameEnded: true }
          : prevRoom
      );
    };

    socket.on("game-ended", handleGameEnded);

    return () => {
      socket.off("game-ended", handleGameEnded);
    };
  }, [socket]);

  return (
    <div className="flex flex-col min-h-screen w-full">

      {/* Header */}
      <div className="w-full bg-[#f37b78] text-white p-4 flex justify-between items-center border-b-2 border-b-[#c44b4a]">
        <Clock time={timeLeft} />
        <WordDisplay gameState={gameState} word={thisRoom?.currentWord.toLowerCase()} />
        <Round currentRound={thisRoom?.currentRound} totalRounds={thisRoom?.roomSettings.rounds} />
      </div>

      {/* Main Section */}
      <div className="flex flex-col md:flex-row flex-grow">

        {/* Liste des joueurs */}
        <PlayerList players={thisRoom?.players} me={me} drawer={thisRoom?.currentDrawer} scoreBoard={thisRoom?.scoreBoard} />

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
                {wordList?.map((word) => (
                  <button
                    key={word?.id}
                    onClick={() => chooseWord(word?.text)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md text-lg mr-4"
                  >
                    {word?.text}
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
          <div className="relative w-full">
            <div ref={canvasParentRef} className="absolute w-full h-64 md:h-96 bg-white border border-gray-300 rounded-md mb-4" />

            {isChoosingWord &&
              <div className="absolute w-full h-64 md:h-96 bg-gray-500 bg-opacity-50 border border-gray-400 rounded-md mb-4">
              </div>
            }

            <div ref={hiddenCanvasRef} className="relative top-0 left-0 w-full h-64 md:h-96 bg-transparent z-0" />
          </div>

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

      {/* Footer with the invitation link */}
      <footer className="w-full flex justify-center">
        <InvitationBox invitationCode={inviteLink} />
      </footer>
    </div>
  );
}
