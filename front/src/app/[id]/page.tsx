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
import { isDrawing } from '@/lib/player/isDrawing';

export default function Page()
{
  // -- The socket -- //
  const { socket } = useSocket();
  const roomRef    = useRef<Room | null>(null);
  const [thisRoom, setRoom] = useState<Room | null>(null);

  socket?.on('room-data-updated', ({ room }: { room: Room }) => {
    if (room) {
      console.log('Room updated:', room);
      setRoom(room);
      for (let player of room.players) {
        if (player.id === socket.id) {
          setMe(player);
        }
      }
    }
  });

  // -- Get the room ID from the URL -- //
  const params = useParams<{ id: string }>();
  const [inviteLink, setInviteLink] = useState<string>('');

  /*
   * @brief Generate a invite link
   */
  useEffect(() => {
    if (params.id) {
      setInviteLink(`${window.location.origin}?code=${params.id}`);
    }
  }, [params]);

  // -- Canvas -- //

  const canvasParentRef = useRef<HTMLDivElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLDivElement | null>(null); // Hidden canvas for resizing the main canvas
  const [p5Instance, setP5Instance] = useState<p5 | null>(null);

  useSafeEffect(() => {
    if (socket && !p5Instance) {
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
    }

    if (canvasParentRef.current && socket && !p5Instance) {
      console.log('Creating P5 instance...');

      setP5Instance(new p5((p: p5) => sketch(p, socket), canvasParentRef.current));
    }

    return () => {
      p5Instance?.remove();
    };
  }, [thisRoom, socket]);

  useEffect(() => {
    roomRef.current = thisRoom;
  }, [thisRoom]);

  const sketch = (p: p5, socket: Socket) => {
    p.setup = () => {
      if (canvasParentRef.current) {
        const { width, height } = canvasParentRef.current.getBoundingClientRect();
        const canvas            = p.createCanvas(width, height);

        p.background(255);

        canvas.parent(canvasParentRef.current);

        socket.on('mouse', (data: MouseData) => {
          if (socket?.id === data?.senderId)
            return;

          p.stroke(data.color);
          p.strokeWeight(data.strokeWidth);
          p.line(data.x, data.y, data.px, data.py);
        });
      }
    };

    p.mouseDragged = () => {
      const room: Room | null     = roomRef.current;
      const draw: boolean         = canDrawRef.current;
      const choosingWord: boolean = isChoosingWordRef.current;

      if (!draw || choosingWord || !room || !socket)
        return;
      if (room?.currentDrawer?.id !== socket.id)
        return;
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
        senderId: socket.id || '',
        roomCode: room?.id || '',
      };

      socket.emit('mouse', data);

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

  // -- Word List -- //
  const [wordList      , setWordList]       = useState<{ id: number, text: string }[]>([]);
  const [isChoosingWord, setIsChoosingWord] = useState<boolean>(false);

  const isChoosingWordRef = useRef<boolean>(isChoosingWord);

  useEffect(() => {
    isChoosingWordRef.current = isChoosingWord;
  }, [isChoosingWord]);

  // -- Game State -- //
  const [gameState  , setGameState]   = useState<GameState>('waiting');
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [canDraw    , setCanDraw]     = useState<boolean>(false);
  const [timeLeft   , setTimeLeft]    = useState<number>(0);

  const canDrawRef = useRef<boolean>(canDraw);

  useEffect(() => {
    canDrawRef.current = canDraw;
  }, [canDraw]);

  /*
   * @brief Callback of the started button for launching the game
   * @note Only the host can start the game
   */
  const handleStartGame = () => {
    if (me?.host == false)
      return;
    socket?.emit("start-game", {
      roomCode: thisRoom?.id
    });
  }

  /*
   * @brief Function call every time a turn is started
   */
  useEffect(() => {
    if (!socket)
      return;
    const handleTurnStarted = ({ drawer, round }: { drawer: Player; round: number }) => {
      setRoom((prevRoom) => prevRoom ? { ...prevRoom, currentDrawer: drawer, currentRound: round } : prevRoom);
      setTimeLeft(thisRoom?.roomSettings?.drawTime || 60);
      setCanDraw(false);
      setGameStarted(true);

      clearCanvas();
    };

    socket.on("turn-started", handleTurnStarted);

    return () => {
      socket.off("turn-started", handleTurnStarted);
    };
  }, [socket, thisRoom]);

  // -- Chat -- //
  const [message, setMessage] = useState<string>("");

  const SendChatMessage = () => {
    socket?.emit('message-sent', {
      roomCode: thisRoom?.id, message
    });

    setMessage("");
  }

  useEffect(() => {
    if (!socket)
      return;
    const handleChooseWord = ({ words }: { words: { id: number, text: string }[] }) => {
      console.log("Words to choose: ", words);

      setGameState('choose');
      setWordList(words);
      setIsChoosingWord(true);
    };

    socket.on("choose-word", handleChooseWord);

    return () => {
      socket.off("choose-word", handleChooseWord);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket)
      return;
    const handleNewMessage = ({ messages }: { messages: Message[] }) => {
      setRoom((prevRoom) => prevRoom ? { ...prevRoom, messages } : prevRoom);
    }

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket, thisRoom]);

  useEffect(() => {
    if (!socket)
      return;
    const handleWordChosen = ({ currentWord, wordLength }: { currentWord: string, wordLength: number }) => {
      setIsChoosingWord(false);

      if (thisRoom?.currentDrawer?.id !== socket.id)
        setRoom((prevRoom) => prevRoom ? { ...prevRoom, currentWord: "_".repeat(wordLength) } : prevRoom);
      else
        setRoom((prevRoom) => prevRoom ? { ...prevRoom, currentWord } : prevRoom);

      if (me?.id === thisRoom?.currentDrawer?.id)
        setGameState('drawing');
      else
        setGameState('guessing');
      setCanDraw(true);
    };

    socket.on("word-chosen", handleWordChosen);

    return () => {
      socket.off("word-chosen", handleWordChosen);
    };
  }, [socket, thisRoom]);

  const chooseWord = (word: string) => {
    socket?.emit("word-chosen", { roomId: thisRoom?.id, word });
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
    if (!socket)
      return;
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
    if (!socket)
      return;
    const handleTurnEnded = ({ scores, word, guessedPlayers } : { scores: { [playerId: string]: number }, word: string, guessedPlayers: string[] }) => {
      setRoom((prevRoom) => prevRoom ? { ...prevRoom, scores, currentWord: word, guessedPlayers: prevRoom.players.filter(player => guessedPlayers.includes(player.id)) } : prevRoom);

      console.log("Turn ended:", word, guessedPlayers);
    };

    socket.on("turn-ended", handleTurnEnded);

    return () => {
      socket.off("turn-ended", handleTurnEnded);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket)
      return;
    const handleGameEnded = ({ winner, scores } : { winner: { id: string; score: number }, scores: { [playerId: string]: number } }) => {
      console.log("Game ended. Winner:", winner);

      setRoom((prevRoom) => prevRoom ? { ...prevRoom, scores, gameEnded: true } : prevRoom);
    };

    socket.on("game-ended", handleGameEnded);

    return () => {
      socket.off("game-ended", handleGameEnded);
    };
  }, [socket]);

  // -- Tools -- //

  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil'); // Outil actif
  const [strokeWidth, setStrokeWidth] = useState(4); // Épaisseur du trait

  return (
    <div className="flex flex-col min-h-screen w-full">

      {/* Header */}
      <div className="w-full bg-[#f37b78] text-white p-4 flex justify-between items-center border-b-2 border-b-[#c44b4a]">
        <Clock time={timeLeft} />
        <WordDisplay gameState={gameState} word={thisRoom?.currentWord?.toLowerCase()} />
        <Round currentRound={thisRoom?.currentRound} totalRounds={thisRoom?.roomSettings.rounds} />
      </div>

      {/* Main Section */}
      <div className="flex flex-col md:flex-row flex-grow h-full">

        {/* Liste des joueurs */}
        <PlayerList players={thisRoom?.players} me={me} drawer={thisRoom?.currentDrawer} scoreBoard={thisRoom?.scoreBoard} />

        {/* Zone de dessin */}
        <div className="flex-1 p-4 flex flex-col items-center order-1 md:order-2">

          {/* Canvas */}          
          <div className="relative w-full">
            <div ref={canvasParentRef} className="absolute w-full h-64 md:h-96 bg-white border border-gray-300 rounded-md mb-4">
              {/* The canvas will dynamically being load here.. */}
            </div>

            {/* If the game is not start */}
            {!gameStarted &&
              <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-50 border border-gray-900 rounded-md mb-4 flex justify-center items-center z-100">
                {/* Settings of the game */}
              </div>
            }

            {/* If the game is started, and you can't draw */}
            {gameStarted && !canDraw &&
              <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-50 border border-gray-900 rounded-md mb-4 flex justify-center items-center z-100">
                {isChoosingWord && isDrawing(me!, thisRoom?.currentDrawer!) ?
                  (
                    <div className="flex-col justify-center items-center">
                      <div className='text-white font-bold text-lg text-center'>
                        Choose a word
                      </div>
                      <div className="w-full flex justify-center m-4">
                        {wordList?.length > 0 && wordList?.map((word) => (
                          <button
                            key={word?.id} onClick={() => chooseWord(word?.text)}
                            className="bg-white hover:bg-slate-100 text-gray-800 px-6 py-2 rounded-md text-lg mr-4"
                          >
                            {word?.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className='text-white font-lg'>
                      {thisRoom?.currentDrawer?.userName} is choosing the word!
                    </div>
                  )
                }
              </div>
            }

            <div ref={hiddenCanvasRef} className="relative top-0 left-0 w-full h-64 md:h-96 bg-transparent z-[-1]" />
          </div>

          {/* Tools (brush) */}
          {gameStarted && canDraw && isDrawing(me!, thisRoom?.currentDrawer) && (
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

          {/* Bouton pour lancer la partie */}
          {!gameStarted && me?.host === true && (
            <div className="w-full flex justify-center m-4">
              <button
                onClick={() => handleStartGame()}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md text-lg font-extrabold"
              >
                Start!
              </button>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="w-full md:w-1/4 p-4 bg-white shadow-md rounded-b-md border-[#c44b4a] border-b-2 border-l-2 flex flex-col order-3 md:order-3">
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
