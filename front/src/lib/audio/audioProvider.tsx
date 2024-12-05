"use client"
import React, { createContext, useContext, useState, useRef } from 'react';

interface AudioContextProps {
    volume: number;
    setVolume: (volume: number) => void;
    playAudio: (audio: HTMLMediaElement) => void;
}

const AudioContext = createContext<AudioContextProps>({
    volume: 1,
    setVolume: () => { },
    playAudio: () => { },
});

export const useAudio = () => {
    return useContext(AudioContext);
};

interface AudioProviderProps {
    children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
    const [volume, setVolume] = useState<number>(1);

    const playAudio = (audio: HTMLMediaElement) => {
        setVolume(prev => {
            audio.volume = prev;
            return prev;
        })
        audio.play();
    };

    return (
        <AudioContext.Provider value={{ volume, setVolume, playAudio }}>
            {children}
        </AudioContext.Provider>
    );
};
