// src/types.ts
export interface ScoreBoard {
    playerId: string;
    score: number;
}

export interface Player {
    id: string;
    userName: string;
    host: boolean;
    hasGuessed: boolean;
    kicksToOut: number;
    kicksGot: Player[];
    userAvatar?: string;
    timestamp?: number;
    teamId?: string;
}

export interface Room {
    id: string;
    players: Player[];
    scoreBoard: ScoreBoard[];
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
        isClassicMode: boolean;
    };
    // Teams
    teams: Team[];
    teamScoreBoard: TeamScoreBoard[];
    currentTeamDrawer: Team;
    currentTeamDrawerIndex: number;
    guessedTeams: Team[];
}

export interface Team {
    id: string;
    players: Player[];
    hasGuessed: boolean;
}

export interface TeamScoreBoard {
    teamId: string;
    score: number;
}