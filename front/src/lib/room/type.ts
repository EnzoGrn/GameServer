import { User } from "../player/type";

export namespace Lobby { // Drawing Together

    export enum GameMode {
        Classic,
        Team
    };

    export interface Settings {
        language : string;
        maxPlayer: number;
        gameMode : GameMode;
    };

    export const defaultSettings: Settings = {
        language : "English",
        maxPlayer: 8,
        gameMode : GameMode.Classic
    };

    export interface Room {
        id          ?: string;
        users        : User.Player[];
        settings     : Settings;
        isDefault    : boolean;
        currentDrawer: User.Player | User.Player[] | undefined; // Depending on the game mode
    };
    
    export const defaultRoom: Room = {
        users        : [] as User.Player[],
        settings     : defaultSettings,
        isDefault    : true,
        currentDrawer: undefined
    };
}
