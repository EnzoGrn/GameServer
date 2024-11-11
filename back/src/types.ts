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
    whoGuessedIt: string[];
    roomSettings: {
        players: string;
        language: string;
        drawTime: string;
        rounds: string;
        wordCount: string;
        hints: string;
        private: boolean;
        useCustomWords: boolean;
    };
}
