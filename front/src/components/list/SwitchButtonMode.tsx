import { Player, Room } from '@/lib/type/types';
import React, { useState } from 'react';
import ListTeams from './ListTeams';
import PlayerList from './PlayerList';
import { Socket } from 'socket.io-client';

const SwitchButtonMode = ({ thisRoom, me, socket }: { thisRoom: Room | null, me?: Player, socket?: Socket }) => {
    // State to track if it is classic mode or team mode
    const [isClassicMode, setIsClassicMode] = useState(thisRoom?.roomSettings.isClassicMode);

    const switchTeam = () => {
        console.log("Switching team mode");

        // Emit the event to the server
        socket?.emit('change-team-play-mode', {
            roomId: thisRoom?.id,
        });

        // Toggle the mode locally
        setIsClassicMode((prevMode) => !prevMode);
    };

    /* listen on mode-update with a socket for every client */

    socket?.on('mode-update', ({isClassicMode}) => {
        console.log("Mode updated to: ", isClassicMode);
        setIsClassicMode(isClassicMode);
    });

    return (
        <div className="">
            {/* Button to switch modes */}
            {me?.host && (
                <div className="mb-4">
                    <button
                        onClick={switchTeam}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md font-medium transition-all"
                    >
                        Switch Mode
                    </button>
                </div>
            )}

            {/* Conditionally render UI based on the mode */}
            <div className="flex-grow flex">
                {!isClassicMode ? (
                    <div className="flex-grow flex flex-col items-center justify-center border border-gray-200 rounded-md p-4">
                        <ListTeams room={thisRoom} player={me} />
                    </div>
                ) : (
                    <div className="w-full flex-grow flex flex-col items-center justify-center border border-gray-200 rounded-md p-4">
                        <PlayerList
                            players={thisRoom?.players}
                            me={me}
                            drawer={thisRoom?.currentDrawer}
                            scoreBoard={thisRoom?.scoreBoard}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SwitchButtonMode;
