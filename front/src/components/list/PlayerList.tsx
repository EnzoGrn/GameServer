// -- Function -- //
import { isDrawing } from "@/lib/player/isDrawing";

// -- Types -- //
import { Player } from "@/lib/type/types";
import Image from "next/image";

const PlayerList = ({ players, me, drawer, scoreBoard, guessed }: { players?: Player[], me?: Player, drawer?: Player, scoreBoard?: any[], guessed ?: Player[] }) => {

  const hasGuessed = (player: Player, guessed?: Player[]): boolean => {
    if (!guessed) return false;
    return guessed.some((guessedPlayer: Player) => guessedPlayer.id === player.id);
  }

  return (
    <div className="flex-grow flex flex-col h-full p-4 order-2 min-w-80 max-w-80">
      <ul className="flex-grow overflow-visible">
        {players && players.map((player: Player, index: number) => (
          <li
            key={player.id}
            className={`p-2 rounded-md mb-2 flex flex-row items-center border-2 border-[#c44b4a] overflow-visible ${hasGuessed(player, guessed) ? 'bg-[#22c553]' : 'bg-[#f9f9f9]'}`}
          >
            <span className="font-bold mr-4">#{index + 1}</span>
            <div className="flex justify-between w-full">
              <div className="flex flex-col items-start mr-2 w-1/2 max-w-[1/2]">
                <span className={`text-start ${me?.id === player.id ? 'text-blue-500' : 'text-gray-800'} text-nowrap`}>
                  {player.userName.slice(0, 12)} {me?.id === player.id ? '(You)' : ''}
                </span>
                <span className="font-extralight">
                  {scoreBoard?.find((score: any) => score.playerId === player.id)?.score || 0} points
                </span>
              </div>
              {isDrawing(player, drawer) &&
                <div
                  className="w-[48px] h-[48px] bg-center bg-cover"
                  style={{
                    backgroundImage: "url('pen.gif')",
                    transform: 'translateX(15px)',
                  }}
                />
              }
              <div className="avatar indicator w-auto">
                {player.host === true &&
                  <div
                  className="indicator-item w-[24px] h-[24px] bg-center bg-cover"
                  style={{
                    backgroundImage: "url('crown.gif')",
                    transform: 'scaleX(-1) translateY(-10px) translateX(-10px)',
                  }}
                  />
                }
                <div className="w-12">
                <Image src={`/player-icons/bear/${player.userAvatar ?? 0}.png`} alt={`Player ${player.userName} avatar`} width={80} height={80} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlayerList;

