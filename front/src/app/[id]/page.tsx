'use client';

// -- Components -- //
import Clock from '@/components/element/Clock';
import WordDisplay, { GameState } from '@/components/element/WordDisplay';
import Round from '@/components/element/Round';
import InvitationBox from '@/components/invitation/Invitation';

// -- Librairies -- //
import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSafeEffect } from '@/lib/react/useSafeEffect';
import { useParams } from 'next/navigation'
import { Socket } from 'socket.io-client';
import p5 from 'p5';

// -- Types -- //
import { Player, Room, ScoreBoard, Team } from '@/lib/type/types';
import { MouseData } from '@/lib/type/mouseData';
import UserList from '@/components/list/SwitchButtonMode';
import Chat from '@/components/Chat/Chat';
import { MessagesProvider } from '@/lib/chat/chatProvider';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/lib/room/RoomProvider';
import { User } from '@/lib/player/type';
import { Lobby } from '@/lib/room/type';
import { GetPlayerWithId, IsDrawing } from '@/lib/room/function';

export default function Page()
{
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

  // -- Socket & Room -- //

  const { socket        } = useSocket();
  const { room, setRoom } = useRoom();
  
  const router = useRouter();

  useEffect(() => {
    if (!params.id) {
      router.push('/');

      return;
    }
    const user: User.Player | undefined = room.users.find((player) => player.profile.id === socket?.id);

    if (!user)
      router.push('/');
  }, [params, room]);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("go-home", () => {
      router.push("/");
    });

    return () => {
      socket.off("go-home");
    }
  }, [socket]);

  const [gameState, setGameState] = useState<GameState>('waiting');
  const [canDraw  , setCanDraw]   = useState<boolean>(false); // Allow the user to draw on canvas (disable, during score reveal, choosing word, etc.)
  const [isStarted, setIsStarted] = useState<boolean>(false);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("pre-starting-turn", ({ drawer, round, words }: { drawer: User.Player | User.Player[], round: number, words: { id: number, text: string }[] }) => {
      console.log("[pre-starting-turn]: ", drawer, round, words);

      setRoom({ ...room, currentDrawer: drawer, currentTurn: round });
      setCurrentTurn(round);
      setCurrentDrawer(drawer);
      setWordReveal(false);

      clearCanvas();

      if (room.settings.gameMode === Lobby.GameMode.Classic) {
        if ((drawer as User.Player).profile.id === socket.id) {
          setGameState('choose');
          setWordList(words);
        } else {
          setGameState('waiting');
        }
      } else {
        if ((drawer as User.Player[]).find((player) => player.profile.id === socket.id)) {
          setGameState('choose');
          setWordList(words);
        } else {
          setGameState('waiting');
        }
      }
    });

    return () => {
      socket.off("pre-starting-turn");
    }
  }, [socket, room]);

  const [me, setMe] = useState<User.Player | undefined>(undefined);
  
  useEffect(() => {
    setMe(room.users.find((player) => player.profile.id === socket?.id));
  }, [room]);

  const [wordList      , setWordList]       = useState<{ id: number, text: string }[]>([]);
  const [word          , setWord] = useState<string>('');
  const [isChoosingWord, setIsChoosingWord] = useState<boolean>(false);

  const handleStartGame = () => {
    if (room.isDefault || me?.isHost === true) {
      socket?.emit("start-game", room.id as string);

      setGameState('waiting');
      setWordList([]);
      setWord('');
    }
  }

  const ChooseWord = (word: string) => {
    socket?.emit("word-chosen", {
      room_id: room.id as string,
      word   : word as string
    });
  };

  useEffect(() => {
    if (!socket)
      return;
    socket.on("word-chosen", (word: string) => {
      setRoom({ ...room, currentWord: word });
      setWordList([]);
      setWord(word);

      if (gameState === 'choose') {
        setGameState('drawing');
      } else {
        setGameState('guessing');
      }
    });

    return () => {
      socket.off("word-chosen");
    }
  }, [socket, gameState]);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("update-state", (state: Lobby.State) => {
      console.log("[update-state]: ", state);

      setRoom({ ...room, state });

      setCanDraw(state.canDraw);
      setIsChoosingWord(state.isChoosingWord);
      setIsStarted(state.isStarted);
      setShowScore(state.showScore);
      
      if (state.isChoosingWord)
        setWordReveal(false);
      if (!canDraw)
        setTimeLeft(room.settings.drawTime);
    });

    return () => {
      socket.off("update-state");
    }
  }, [socket, room]);

  const [currentDrawer, setCurrentDrawer] = useState<User.Player | User.Player[] | undefined>(undefined);

  // -- Canvas -- //

  const canvasParentRef = useRef<HTMLDivElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLDivElement | null>(null); // Hidden canvas for resizing the main canvas
  const [p5Instance, setP5Instance] = useState<p5 | null>(null);
  const [canvas, setCanvas] = useState<p5.Renderer | null>(null);
  const canDrawRef = useRef<boolean>(canDraw);
  const isChoosingWordRef = useRef<boolean>(isChoosingWord);
  const drawersRef = useRef<User.Player | User.Player[] | undefined>(currentDrawer);

  useEffect(() => {
    isChoosingWordRef.current = isChoosingWord;
  }, [isChoosingWord]);

  useEffect(() => {
    drawersRef.current = currentDrawer;
  }, [currentDrawer]);

  useEffect(() => {
    canDrawRef.current = canDraw;
  }, [canDraw]);

  useSafeEffect(() => {
    if (canvasParentRef.current && socket && !p5Instance) {
      setP5Instance(new p5((p: p5) => sketch(p, socket), canvasParentRef.current));
    }

    return () => {
      p5Instance?.remove();
    };
  }, [room, socket, currentDrawer]);


  const sketch = (p: p5, socket: Socket) => {
    p.setup = () => {
      if (canvasParentRef.current) {
        const { width, height } = canvasParentRef.current.getBoundingClientRect();
        const canvas: p5.Renderer = p.createCanvas(width, height);

        p.background(255);

        canvas.parent(canvasParentRef.current);

        setCanvas(canvas);

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
      const draw: boolean         = canDrawRef.current;
      const choosingWord: boolean = isChoosingWordRef.current;

      if (!draw || choosingWord || !room || !socket)
        return;
      const drawers = drawersRef.current;

      if (room.settings.gameMode === Lobby.GameMode.Classic) {
        if ((drawers as User.Player | undefined)?.profile.id !== socket.id)
          return;
      } else {
        if (!(drawers as User.Player[])?.find((player: User.Player) => player.profile.id === socket.id))
          return;
      }
      
      const currentTool = toolRef.current;
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
        color: currentTool === 'eraser' ? '#FFFFFF' : '#000000',
        strokeWidth: currentTool === 'eraser' ? strokeWidth * 2 : strokeWidth,
        senderId: socket.id || '',
        roomCode: room.id || '',
      };

      socket.emit('mouse', data);

      p.stroke(data.color);
      p.strokeWeight(data.strokeWidth);
      p.line(data.x, data.y, data.px, data.py);
    };

    p.draw = () => {
    };
  };

  useEffect(() => {
    if (!socket)
      return;

    const handleYouGuessed = () => {
      setGameState("guess");
    };

    socket.on("you-guessed", handleYouGuessed);

    return () => {
      socket.off("you-guessed", handleYouGuessed);
    };
  }, [socket]);

  /*
   * @brief Resize the canvas when the window is resized
   */
  useEffect(() => {
    const resizeCanvas = () => { // TODO: Find a way to get the canvas from server for refreshing the canvas
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

  const [currentTurn, setCurrentTurn] = useState<number>(0);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("update-round", (round: number) => {
      setCurrentTurn(round);
      setRoom({ ...room, currentTurn: round });
    });

    return () => {
      socket.off("update-round");
    };
  }, [socket, currentTurn, room]);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("turn-ended", (word: string) => {
      setWord(word);
      setWordReveal(false);
      setIsChoosingWord(false);
      setWordList([]);
      setCanDraw(false);
      
      if (gameState !== 'drawing')
        setGameState('guess');
      setWordReveal(true);
    });

    return () => {
      socket.off("turn-ended");
    };
  }, [socket, room]);

  const [wordReveal, setWordReveal] = useState<boolean>(false);
  const [timeLeft  , setTimeLeft]    = useState<number>(0);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("timer-update", (timeLeft: number) => {
      console.log("[timer-update]: ", timeLeft);

      setTimeLeft(timeLeft);
    });

    return () => {
      socket.off("timer-update");
    };
  }, [socket, timeLeft]);

  const [winners  , setWinners]     = useState<User.Player[]>([]);
  const [showScore, setShowScore]   = useState<boolean>(false);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("game-ended", (winners: User.Player[]) => {
      setShowScore(true);
      setCanDraw(false);
      setIsStarted(false);

      setWinners(winners);
    });

    return () => {
      socket.off("game-ended");
    };
  }, [socket, winners]);

  // -- Tools -- //
  const [tool       , setTool] = useState<'pencil' | 'eraser'>('pencil'); // Outil actif
  const [strokeWidth, setStrokeWidth] = useState(4);                      // Épaisseur du trait
  const [color      , setColor] = useState('#000000');                    // Couleur du crayon

  const toolRef = useRef(tool);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  return (
    <div className="min-h-screen w-full grid grid-cols-[auto_2fr_1fr] grid-rows-[auto_1fr_auto] gap-2">

      {/* Header */}
      <div className="col-span-3 w-full bg-[#f37b78] text-white p-4 flex justify-between items-center border-b-2 border-b-[#c44b4a]">
        <Clock time={timeLeft} />
        <WordDisplay gameState={gameState} word={word.toLowerCase()}  />
        <Round currentRound={currentTurn} totalRounds={room.settings.maxTurn} />
      </div>

      {/* Player List */}
      <UserList room={room} />

      {/* Canvas Section */}
      <div className="p-4 flex flex-col items-center w-full h-full">

        {/* Canvas */}
        <div className="relative w-full">
          <div ref={canvasParentRef} className="absolute w-full h-64 md:h-96 bg-white border border-gray-300 rounded-md mb-4">
            {/* The canvas will dynamically being load here.. */}
          </div>

          {/* If the game is not start */}
          {!isStarted && !showScore &&
            <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-50 border border-gray-900 rounded-md mb-4 flex justify-center items-center z-100">
              {!room.isDefault &&
                <>{/* Settings of the game */}</>
              }
              {(me?.isHost === true || room.isDefault) && (
                <div className="w-full flex justify-center m-4">
                  <button onClick={() => handleStartGame()} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md text-lg font-extrabold">
                    Start!
                  </button>
                </div>
              )}
            </div>
          }

          {/* Choosing word */}
          {isStarted && !canDraw &&
            <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-50 border border-gray-900 rounded-md mb-4 flex justify-center items-center z-100">
              {isChoosingWord && wordList?.length > 0 ?
                (
                  <div className="flex-col justify-center items-center">
                    <div className='text-white font-bold text-lg text-center'>
                      Choose a word
                    </div>
                    <div className="w-full flex justify-center m-4">
                      {wordList?.length > 0 && wordList?.map((word, index) => (
                        <button
                          key={index} onClick={() => ChooseWord(word?.text)}
                          className="bg-white hover:bg-slate-100 text-gray-800 px-6 py-2 rounded-md text-lg mr-4"
                        >
                          {word?.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  wordReveal === false ?
                  (
                    <div className='text-white font-lg'>
                      {room.settings.gameMode === Lobby.GameMode.Classic ? `${(currentDrawer as User.Player | undefined)?.profile.name} is choosing the word!` : `${(currentDrawer as User.Player[])[0]?.profile.name} is choosing the word!`}
                    </div>
                  ) : (
                    <div className='text-white font-lg'>
                      The word was: {word}
                    </div>
                  )
                )
              }
            </div>
          }

          {/* If the game is started, and you can't draw */}
          {!isStarted && !canDraw && showScore &&
            <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-50 border border-gray-900 rounded-md mb-4 flex justify-center items-center z-100">
              <div className="flex-col justify-center items-center">
                <div className="relative w-[124px] h-[124px] flex items-center justify-center bg-center bg-cover" style={{ backgroundImage: "url('score.gif')" }} />
                {winners?.map((winner, index) => (
                    <div key={index} className="w-full h-full flex items-center justify-center">
                      <div className="bg-opacity-50 p-4 rounded-md">
                        <div className="text-black font-bold text-lg text-center">
                          {winner?.profile.name} #{index + 1} - Score {winner?.score}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(me?.isHost === true || room.isDefault) && (
                  <div className="w-full flex justify-center m-4">
                    <button onClick={() => handleStartGame()} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md text-lg font-extrabold">
                      Start!
                    </button>
                  </div>
                )}
              </div>
            </div>
          }

          <div ref={hiddenCanvasRef} className="relative top-0 left-0 w-full h-64 md:h-96 bg-transparent z-[-1]" />
        </div>

        {/* Tools (brush) */}

        {isStarted && canDraw && IsDrawing(room.settings.gameMode, GetPlayerWithId(room, socket?.id!)!, currentDrawer) && (
          <div className="flex items-center space-x-2 md:space-x-4">
            <button onClick={() => setTool('pencil')}>Pencil</button>
            <button onClick={() => setTool('eraser')}>Eraser</button>

            <button
              onClick={clearCanvas}
              className="bg-red-400 px-3 md:px-4 py-1 md:py-2 rounded-md text-white"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="row-span-2 p-4">
        <MessagesProvider>
          <Chat />
        </MessagesProvider>
      </div>

      {/* Footer with the invitation link */}
      <footer className="col-span-2 p-4 flex items-end justify-center">
        <InvitationBox invitationCode={inviteLink} />
      </footer>
    </div>
  );
}
