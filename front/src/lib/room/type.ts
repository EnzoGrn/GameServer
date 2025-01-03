import { User } from "../player/type";

export namespace Lobby { // Drawing Together

    export enum GameMode {
        Classic,
        Team
    };

    export interface Settings {
        language          : string;
        maxPlayer         : number;
        numTeams          : number;
        gameMode          : GameMode;
        maxTurn           : number;
        useCustomWordsOnly: boolean;
        customWords      ?: string;
        drawTime          : number;
    };

    export const defaultSettings: Settings = {
        language          : "English",
        maxPlayer         : 8,
        numTeams          : 2,
        gameMode          : GameMode.Classic,
        maxTurn           : 3,
        useCustomWordsOnly: false,
        drawTime          : 80
    };

    export interface State {
        isStarted     : boolean;
        canDraw       : boolean;
        isChoosingWord: boolean;
        showScore     : boolean;
    };

    export const defaultState: State = Object.freeze({
        isStarted     : false,
        canDraw       : false,
        isChoosingWord: false,
        showScore     : false
    });

    export interface Team {
        id     : number;
        name   : string;
        players: User.Player[];
        score  : number;
    };

    export interface Room {
        id            : string;
        users         : User.Player[];
        teams        ?: Team[];
        settings      : Settings;
        isDefault     : boolean;
        currentDrawer : User.Player | User.Player[] | undefined; // Depending on the game mode
        currentTurn   : number;
        currentWord   : string | undefined;
        state         : State;
    };
    
    export const defaultRoom: Room = {
        id           : "",
        users        : [] as User.Player[],
        settings     : defaultSettings,
        isDefault    : true,
        currentDrawer: undefined,
        currentTurn  : 0,
        currentWord  : undefined,
        state        : defaultState
    };
}
