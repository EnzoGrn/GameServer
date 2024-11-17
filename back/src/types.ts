// src/types.ts
export interface Player {
    id: string;
    userName: string;
    host: boolean;
    hasGuessed: boolean;
    kicksToOut: number;
    kicksGot: Player[];
    userAvatar?: string;
    timestamp?: number;
}

export interface Room {
    id: string;
    players: Player[];
    messages: any[];
    scoreBoard: any[];
    customWords: string[];
    guessedPlayers: Player[];
    currentWord: string;
    currentDrawer: Player;
    currentDrawerIndex: number;
    currentRound: number;
    timeLeft: number;
    gameStarted: boolean, // L'état de la partie
    roomSettings: {
        players: number;
        language: string;
        drawTime: number;
        rounds: number;
        wordCount: number;
        hints: number;
        private: boolean;
        useCustomWords: boolean;
    };
}

export interface Message {
    text: string;
    timestamp: number;
    bgColor: string;
    color: string;
    isPrivate?: boolean;
    senderId?: string;
}