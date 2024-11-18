// -- Function -- //
import { isDrawing } from "@/lib/player/isDrawing";

// -- Types -- //
import { Player } from "@/lib/type/types";

const PlayerList = ({ players, me, drawer, scoreBoard } : { players?: Player[], me?: Player, drawer?: Player, scoreBoard?: any[] }) => {
  return (
    <div className="w-full h-full md:w-1/4 p-4 order-2 md:order-1">
      <ul>
        {players && players.map((player: Player, index: number) => (
          <li
            key={player.id}
            className={`p-2 rounded-md mb-2 flex flex-row items-center border-2 border-[#c44b4a] ${isDrawing(player, drawer) ? 'bg-slate-200' : 'bg-gray-100'}`}
          >
            <span className="font-bold mr-4">#{index + 1}</span>
            <div className="flex flex-col items-center mr-2">
              <span className={`text-center ${me?.id === player.id ? 'text-blue-500' : 'text-gray-800'}`}>{player.userName} {me?.id === player.id ? '(You)' : ''}</span>
              <span className={"font-extralight"}>
                {scoreBoard?.find((score: any) => score.playerId === player.id)?.score || 0} points
              </span>
            </div>
            <span>{isDrawing(player, drawer) ? '(Draw)' : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlayerList;
