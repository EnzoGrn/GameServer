import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '../provider/SocketProvider';

const RoomSettings = ({ roomId }: { roomId?: number }) => {
    
    // -- Socket -- //
    const { socket } = useSocket();

    const [isTeamMode, setIsTeamMode] = useState(false);

    const handleTeamModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsTeamMode(e.target.checked); // Update state based on checkbox value

        if (socket === null) {
            console.error('Socket is not initialized');
            return;
        }

        // Send the new value to the server with the room id        
        socket.emit('change-team-play-mode', {
            roomId,
        });
    };
    
    return (
        <div>
        {/* CheckBox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={isTeamMode}
            onChange={handleTeamModeChange} // Handle checkbox change
          />
          <label htmlFor="team-play-mode" className="ml-2 text-sm">
            Team Play Mode
          </label>
        </div>
      </div>
    );
  }
  
  export default RoomSettings;
  