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
      setCurrentDrawer(drawer);

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
      console.log(canvas?.elt.toDataURL());
    };
  };







  const roomRef    = useRef<Room | null>(null);
  const [thisRoom, setRooom] = useState<Room | null>(null);

  useEffect(() => {
    roomRef.current = thisRoom;
  }, [thisRoom]);

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

  // -- Game State -- //
  const [timeLeft   , setTimeLeft]    = useState<number>(0);
  const [showScore  , setShowScore]   = useState<boolean>(false);
  const [winner     , setWinner]      = useState<{ id: string; score: number } | null>(null);

  /*
   * @brief Function call every time a turn is started
   */
  useEffect(() => {
    if (!socket)
      return;
    const handleTurnStarted = ({ drawer, round }: { drawer: Player; round: number }) => {
      setRooom((prevRoom) => prevRoom ? { ...prevRoom, currentDrawer: drawer, currentRound: round } : prevRoom);
      setTimeLeft(thisRoom?.roomSettings?.drawTime || 60);
      setCanDraw(false);

      clearCanvas();
    };

    const handleTurnStartedTeam = ({ currentTeamDrawer, round, currentDrawer }: { currentTeamDrawer: Team; round: number, currentDrawer: Player }) => {
      setRooom((prevRoom) => prevRoom ? { ...prevRoom, currentTeamDrawer: currentTeamDrawer, currentDrawer: currentDrawer, currentRound: round } : prevRoom);
      setTimeLeft(thisRoom?.roomSettings?.drawTime || 60);
      setCanDraw(false);

      clearCanvas();
    }

    socket.on("turn-started", handleTurnStarted);
    socket.on("turn-started-team", handleTurnStartedTeam);

    return () => {
      socket.off("turn-started", handleTurnStarted);
      socket.off("turn-started-team", handleTurnStartedTeam);
    };
  }, [socket, thisRoom]);

  /*useEffect(() => {
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
  }, [socket]);*/

  useEffect(() => {
    if (!socket)
      return;
    const handleWordChosen = ({ currentWord, wordLength }: { currentWord: string, wordLength: number }) => {
      setIsChoosingWord(false);

      if (thisRoom?.currentDrawer?.id !== socket.id)
        setRooom((prevRoom) => prevRoom ? { ...prevRoom, currentWord: "_".repeat(wordLength) } : prevRoom);
      else
        setRooom((prevRoom) => prevRoom ? { ...prevRoom, currentWord } : prevRoom);

      if (me?.profile.id === thisRoom?.currentDrawer?.id)
        setGameState('drawing');
      else
        setGameState('guessing');
      setCanDraw(true);
    };

    const HandleWordChosenTeam = ({ currentWord, wordLength, DrawerPlayersTeam }: { currentWord: string, wordLength: number, DrawerPlayersTeam: Player[] }) => {

      setIsChoosingWord(false);

      if (DrawerPlayersTeam.find((player) => player.id === me?.profile.id)) {
        setRooom((prevRoom) => prevRoom ? { ...prevRoom, currentWord } : prevRoom);
      } else {
        setRooom((prevRoom) => prevRoom ? { ...prevRoom, currentWord: "_".repeat(wordLength) } : prevRoom);
      }

      // check if the player is in the team that can draw
      if (DrawerPlayersTeam.find((player) => player.id === me?.profile.id)) {
        setGameState('drawing');
      } else {
        setGameState('guessing');
      }
      setCanDraw(true);
    };

    //socket.on("word-chosen", handleWordChosen);
    socket.on("word-chosen-team", HandleWordChosenTeam);

    return () => {
      //socket.off("word-chosen", handleWordChosen);
      socket.off("word-chosen-team", HandleWordChosenTeam);
    };
  }, [socket, thisRoom]);

  useEffect(() => {
    if (!socket) return;

    const handleYouGuessed = () => {
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
    const handleTurnEnded = ({ scores, word, guessedPlayers } : { scores: ScoreBoard[], word: string, guessedPlayers: Player[] }) => {
      setRooom((prevRoom) => prevRoom ? { ...prevRoom, scoreBoard: scores, guessedPlayers, currentWord: word } : prevRoom);

      console.log("Turn ended:", word, guessedPlayers, scores);
    };

    socket.on("turn-ended", handleTurnEnded);

    return () => {
      socket.off("turn-ended", handleTurnEnded);
    };
  }, [socket, thisRoom]);

  useEffect(() => {
    if (!socket)
      return;
    const handleGameEnded = ({ winner, scores } : { winner: { id: string; score: number }, scores: { [playerId: string]: number } }) => {
      setCanDraw(false);
      setShowScore(true);

      setRooom((prevRoom) => prevRoom ? { ...prevRoom, scores, gameEnded: true } : prevRoom);

      if (socket && !p5Instance) {
        socket.on('send-room', (room: Room) => {
          setRooom(room);
        });
  
        socket.emit('get-room', params.id);
      }
    };

    socket.on("game-ended", handleGameEnded);

    return () => {
      socket.off("game-ended", handleGameEnded);
    };
  }, [socket]);

  // -- Tools -- //
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil'); // Outil actif
  const [strokeWidth, setStrokeWidth] = useState(4); // Épaisseur du trait
  const [color, setColor] = useState('#000000'); // Couleur du crayon

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
        <Round currentRound={room.currentTurn} totalRounds={room.settings.maxTurn} />
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
          {!isStarted &&
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
                  <div className='text-white font-lg'>
                    {room.settings.gameMode === Lobby.GameMode.Classic ? `${(room.currentDrawer as User.Player | undefined)?.profile.name} is choosing the word!` : `${(room.currentDrawer as User.Player[])[0]?.profile.name} is choosing the word!`}
                  </div>
                )
              }
            </div>
          }

          {/* If the game is started, and you can't draw */}
          {/*!gameStarted && !canDraw && showScore &&
            <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-50 border border-gray-900 rounded-md mb-4 flex justify-center items-center z-100">
              <div className="flex-col justify-center items-center">
                <div
                  className="relative w-[124px] h-[124px] flex items-center justify-center bg-center bg-cover"
                  style={{ backgroundImage: "url('score.gif')" }}
                ></div>
                <div className='text-white font-lg'>
                </div>
              </div>
            </div>
          */}

          <div ref={hiddenCanvasRef} className="relative top-0 left-0 w-full h-64 md:h-96 bg-transparent z-[-1]" />
        </div>

        {/* Tools (brush) */}

        {/*thisRoom?.roomSettings.isClassicMode && gameStarted && canDraw && isDrawing(me!, thisRoom?.currentDrawer) && (
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

        {(!thisRoom?.roomSettings.isClassicMode && gameStarted && canDraw && thisRoom?.currentTeamDrawer?.players.find((player : Player) => player.id === me?.id)) && (
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
        )*/}
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
