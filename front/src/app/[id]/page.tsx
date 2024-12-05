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
import DrawingTools, { ToolsType } from '@/components/Canvas/Tools';

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

  const [settings, setSettings] = useState<Lobby.Settings>(room.settings);
  const settingRef = useRef(settings);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("update-settings", (settings: Lobby.Settings) => {
      console.log("[update-settings]: ", settings);

      setRoom({ ...room, settings });
      setSettings(settings);
    });

    return () => {
      socket.off("update-settings");
    }
  }, [socket, room, settings]);

  const [teams, setTeams] = useState<Lobby.Team[]>([]);

  useEffect(() => {
    if (!socket)
      return;
    socket.on("update-teams", (teams: Lobby.Team[]) => {
      console.log("[update-teams]: ", teams);

      setRoom({ ...room, teams });
      setTeams(teams);
    });

    return () => {
      socket.off("update-teams");
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

  const [tool       , setTool] = useState<ToolsType>('pencil');
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [color      , setColor] = useState<string>('#000000');

  const colorRef = useRef(color);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  const strokeWidthRef = useRef(strokeWidth);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  useSafeEffect(() => {
    if (canvasParentRef.current && socket && !p5Instance) {
      setP5Instance(new p5((p: p5) => sketch(p, socket), canvasParentRef.current));
    }

    return () => {
      p5Instance?.remove();
    };
  }, [room, socket, currentDrawer, color, strokeWidth, tool]);


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
      const currentColor = colorRef.current;
      const currentStrokeWidth  = strokeWidthRef.current;
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
        color      : currentTool === 'eraser' ? '#FFFFFF' : currentColor,
        strokeWidth: currentTool === 'eraser' ? currentStrokeWidth * 2 : currentStrokeWidth,
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
  const toolRef = useRef(tool);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const handleToolChange = ({ tool, color, size } : { tool: ToolsType, color: string, size: number }) => {
    console.log("[handleToolChange]: ", tool, color, size);
    setTool(tool);
    setColor(color);
    setStrokeWidth(size);
  };

  // -- Settings -- //
  useEffect(() => {
    settingRef.current = settings;
  }, [settings]);

  useEffect(() => {
    setRoom({ ...room, settings });
  }, [settings]);

  const handleMaxPlayersChange = (value: number) => {
    setRoom({ ...room, settings: { ...room.settings, maxPlayer: value } });
    setSettings({ ...settings, maxPlayer: value });

    socket?.emit("update-max-players", {
      room_id: room.id as string,
      maxPlayer: value as number
    });
  };

  const handleMaxTeamsChange = (value: number) => {
    setRoom({ ...room, settings: { ...room.settings, numTeams: value } });
    setSettings({ ...settings, numTeams: value });

    socket?.emit("update-number-teams", {
      room_id: room.id as string,
      numTeams: value as number
    });
  };

  const handleMaxTimeDrawingChange = (value: number) => {
    setRoom({ ...room, settings: { ...room.settings, drawTime: value } });
    setSettings({ ...settings, drawTime: value });

    socket?.emit("update-draw-time", {
      room_id: room.id as string,
      time: value as number
    });
  };

  const handleMaxRoundsChange = (value: number) => {
    setRoom({ ...room, settings: { ...room.settings, maxTurn: value } });
    setSettings({ ...settings, maxTurn: value });

    socket?.emit("update-max-rounds", {
      room_id: room.id as string,
      rounds: value as number
    });
  };

  const handleLanguageChange = (value: string) => {
    setRoom({ ...room, settings: { ...room.settings, language: value } });
    setSettings({ ...settings, language: value });

    socket?.emit("update-language", {
      room_id: room.id as string,
      roomLanguage: value as string
    });
  };

  const handleGameModeChange = (value: string) => {
    var gameMode: Lobby.GameMode = value === "Classic" ? Lobby.GameMode.Classic : Lobby.GameMode.Team;

    setRoom({ ...room, settings: { ...room.settings, gameMode } });
    setSettings({ ...settings, gameMode: gameMode });

    socket?.emit("update-gamemode", {
      room_id: room.id as string,
      mode: gameMode as Lobby.GameMode
    });
  };

  const handleCustomWordsOnlyChange = (value: boolean) => {
    setRoom({ ...room, settings: { ...room.settings, useCustomWordsOnly: value } });
    setSettings({ ...settings, useCustomWordsOnly: value });

    socket?.emit("update-custom-words-only", {
      room_id: room.id as string,
      useCustomWordsOnly: value as boolean
    });
  };

  const handleCustomWordsChange = (value: string) => {
    setRoom({ ...room, settings: { ...room.settings, customWords: value } });
    setSettings({ ...settings, customWords: value });

    socket?.emit("update-custom-words", {
      room_id: room.id as string,
      customWords: value as string
    });
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-[auto_2fr_1fr] grid-rows-[auto_1fr_auto] gap-2">

      {/* Header */}
      <div className="col-span-3 w-full bg-[#f37b78] text-white p-4 flex justify-between items-center border-b-2 border-b-[#c44b4a]">
        <Clock time={timeLeft} />
        <WordDisplay gameState={gameState} word={word.toLowerCase()}  />
        <Round currentRound={currentTurn} totalRounds={room.settings.maxTurn} />
      </div>

      {/* Player List */}
      <UserList room={room} options={settings} />

      {/* Canvas Section */}
      <div className="p-4 flex flex-col items-center w-full h-full">

        {/* Canvas */}
        <div className="relative w-full">
          <div
            ref={canvasParentRef}
            className="absolute w-full h-64 md:h-96 bg-white border border-gray-300 rounded-md shadow-sm"
          >
            {/* The canvas will dynamically load here */}
          </div>

          {/* Overlay if game has not started */}
          {!isStarted && !showScore && (
            <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-70 rounded-md flex flex-col justify-center items-center z-10">
              {!room.isDefault && me?.isHost && (
                <div className="w-full h-auto max-h-full rounded-md overflow-y-auto p-4">
                <div className="flex flex-row w-full justify-between gap-4">
                  {/* Mode de jeu */}
                  <div className="flex flex-col space-y-2 w-full">
                    <label htmlFor="gameMode" className="text-[#f9f9f9] font-semibold">
                      Game Mode
                    </label>
                    <select
                      id="gameMode"
                      className="p-2 border rounded-md shadow-sm"
                      value={settingRef.current.gameMode === Lobby.GameMode.Classic ? "Classic" : "Team"}
                      onChange={(e) => handleGameModeChange(e.target.value)}
                    >
                      <option value="Classic">Classic</option>
                      <option value="Team">Team</option>
                    </select>
                  </div>
              
                  {/* Langue */}
                  <div className="flex flex-col space-y-2 w-full">
                    <label htmlFor="language" className="text-[#f9f9f9] font-semibold">
                      Language
                    </label>
                    <select
                      id="language"
                      className="p-2 border rounded-md shadow-sm"
                      value={settings.language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                    >
                      <option value="English">English</option>
                      <option value="French">French</option>
                    </select>
                  </div>
                </div>
              
                <div className="flex flex-row w-full justify-between gap-4">
                  {/* Nombre max de joueurs */}
                  <div className="flex flex-col space-y-2 w-full">
                    <label htmlFor="maxPlayers" className="text-[#f9f9f9] font-semibold">
                      Max Players
                    </label>
                    <input
                      id="maxPlayers"
                      type="number"
                      className="p-2 border rounded-md shadow-sm"
                      value={settings.maxPlayer}
                      min={2}
                      max={16}
                      onChange={(e) => handleMaxPlayersChange(Number(e.target.value))}
                    />
                  </div>
              
                  {/* Nombre d'équipes */}
                  {settings.gameMode === Lobby.GameMode.Team && (
                    <div className="flex flex-col space-y-2 w-full">
                      <label htmlFor="teams" className="text-[#f9f9f9] font-semibold">
                        Number of Teams
                      </label>
                      <input
                        id="teams"
                        type="number"
                        className="p-2 border rounded-md shadow-sm"
                        value={settings.numTeams}
                        min={2}
                        max={4}
                        onChange={(e) => handleMaxTeamsChange(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              
                <div className="flex flex-row w-full justify-between gap-4">
                  {/* Temps par dessin */}
                  <div className="flex flex-col space-y-2 w-full">
                    <label htmlFor="drawTime" className="text-[#f9f9f9] font-semibold">
                      Time Per Drawing (seconds)
                    </label>
                    <input
                      id="drawTime"
                      type="number"
                      className="p-2 border rounded-md shadow-sm"
                      value={settings.drawTime}
                      min={10}
                      max={300}
                      onChange={(e) => handleMaxTimeDrawingChange(Number(e.target.value))}
                    />
                  </div>
              
                  {/* Nombre de rounds */}
                  <div className="flex flex-col space-y-2 w-full">
                    <label htmlFor="rounds" className="text-[#f9f9f9] font-semibold">
                      Number of Rounds
                    </label>
                    <input
                      id="rounds"
                      type="number"
                      className="p-2 border rounded-md shadow-sm"
                      value={settings.maxTurn}
                      min={1}
                      max={20}
                      onChange={(e) => handleMaxRoundsChange(Number(e.target.value))}
                    />
                  </div>
                </div>
              
                <div className="flex flex-row w-full justify-between gap-4">
                  {/* Utiliser uniquement les mots personnalisés */}
                  <div className="flex items-center space-x-2 w-full">
                    <input
                      id="customWordsOnly"
                      type="checkbox"
                      className="h-5 w-5 text-[#f9f9f9] rounded"
                      checked={settings.useCustomWordsOnly}
                      onChange={(e) => handleCustomWordsOnlyChange(e.target.checked)}
                    />
                    <label htmlFor="customWordsOnly" className="text-[#f9f9f9] font-semibold">
                      Use Custom Words Only
                    </label>
                  </div>
                </div>
              
                {/* Mots personnalisés */}
                <div className="flex flex-col space-y-2">
                  <label htmlFor="customWords" className="text-[#f9f9f9] font-semibold w-full">
                    Custom Words (separated by <code>;</code>)
                  </label>
                  <textarea
                    id="customWords"
                    className="p-2 border rounded-md shadow-sm"
                    value={settings.customWords}
                    onChange={(e) => handleCustomWordsChange(e.target.value)}
                    placeholder="e.g., apple;dog;sun"
                    rows={3}
                  />
                </div>
              </div>
              )}
              {(me?.isHost || room.isDefault) && (
                <button
                  onClick={handleStartGame}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md text-lg font-extrabold transition"
                >
                  Start!
                </button>
              )}
            </div>
          )}

          {/* Choosing word */}
          {isStarted && !canDraw && (
            <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-70 rounded-md flex flex-col justify-center items-center z-10">
              {isChoosingWord && wordList?.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="text-white font-bold text-lg mb-4">
                    Choose a word
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {wordList.map((word, index) => (
                      <button
                        key={index}
                        onClick={() => ChooseWord(word?.text)}
                        className="bg-white hover:bg-gray-100 text-gray-800 px-6 py-2 rounded-md shadow-md text-lg font-semibold transition"
                      >
                        {word?.text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : wordReveal === false ? (
                <div className="text-white text-center font-lg">
                  {room.settings.gameMode === Lobby.GameMode.Classic
                    ? `${(currentDrawer as User.Player)?.profile.name} is choosing the word!`
                    : `${(currentDrawer as User.Player[])[0]?.profile.name} is choosing the word!`}
                </div>
              ) : (
                <div className="text-white text-center font-lg">
                  The word was:{" "}
                  <span className="font-bold text-yellow-400">{word}</span>
                </div>
              )}
            </div>
          )}

          {/* Game ended / Show scores */}
          {showScore && (
            <div className="absolute w-full h-64 md:h-96 bg-gray-800 bg-opacity-70 rounded-md flex flex-col justify-center items-center z-10">
              <div className="w-32 h-32 bg-center bg-cover mb-4" style={{ backgroundImage: "url('score.gif')" }} />
              {winners?.map((winner, index) => (
                <div
                  key={index}
                  className="bg-white bg-opacity-90 text-black text-lg font-bold px-4 py-2 rounded-md shadow-md mb-2"
                >
                  {winner?.profile.name} #{index + 1} - Score {winner?.score}
                </div>
              ))}
              {(me?.isHost || room.isDefault) && (
                <button
                  onClick={handleStartGame}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md text-lg font-extrabold mt-4 transition"
                >
                  Play Again!
                </button>
              )}
            </div>
          )}

          {/* Invisible canvas for interaction */}
          <div
            ref={hiddenCanvasRef}
            className="relative top-0 left-0 w-full h-64 md:h-96 bg-transparent z-[-1]"
          />
        </div>

        {/* Tools (brush) */}
        {isStarted && canDraw && IsDrawing(room.settings.gameMode, GetPlayerWithId(room, socket?.id!)!, currentDrawer) && (
          <DrawingTools onToolChange={handleToolChange} />
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
