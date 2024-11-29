import Random from "../tools/random";
import { User } from "../user/type";

export namespace Lobby { // Drawing Together

    export const AllRoom: { [key: string]: Room } = {};

    export enum GameMode {
        Classic,
        Team
    }

    export interface Settings {
        language          : string;
        maxPlayer         : number;
        gameMode          : GameMode;
        maxTurn           : number;
        useCustomWordsOnly: boolean;
        customWords       : string[];
    };

    export const defaultSettings: Settings = Object.freeze({
        language          : "English",
        maxPlayer         : 8,
        gameMode          : GameMode.Classic,
        maxTurn           : 3,
        useCustomWordsOnly: false,
        customWords       : []
    });

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

    export interface Room {
        id           ?: string;
        users         : User.Player[];
        settings      : Settings;
        isDefault     : boolean;
        currentDrawer : User.Player | User.Player[] | undefined; // Depending on the game mode
        currentTurn   : number;
        currentWord   : string | undefined;
        state         : State;
    };

    export const defaultRoom: Room = Object.freeze({
        users        : [] as User.Player[],
        settings     : defaultSettings,
        isDefault    : true,
        currentDrawer: undefined,
        currentTurn  : 0,
        currentWord  : undefined,
        state        : defaultState
    });

    export const GetRoomLanguage = (language: string): Lobby.Room[] => {
        var rooms: Lobby.Room[] = [];

        for (var key in Lobby.AllRoom) {
            var room: Lobby.Room = Lobby.AllRoom[key];

            if (room.settings.language === language)
                rooms.push(room);
        }
        return rooms;
    }

    const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

    export const CreateRoom = (profile: User.Profile, isDefault: boolean = true, code: string | undefined = undefined): Lobby.Room => {
        var newRoom: Lobby.Room = deepCopy(Lobby.defaultRoom);

        newRoom.id                = code !== undefined ? code : Random.RandString(6);
        newRoom.isDefault         = isDefault;
        newRoom.settings.language = profile.language;

        Lobby.AllRoom[newRoom.id] = newRoom;

        var newPlayer = User.CreateUser(profile);

        if (!isDefault)
            newPlayer.isHost = true;
        newRoom.users.push(newPlayer);

        return newRoom;
    }

    export const JoinRoom = (profile: User.Profile, code: string | undefined): { room: Lobby.Room, isNew: boolean } => {
        if (code) {
            var room: Lobby.Room | undefined = Lobby.AllRoom[code];

            if (room) {
                var newPlayer = User.CreateUser(profile);

                newPlayer.isHost = false;

                room.users.push(newPlayer);

                return { room: room, isNew: false };
            }
        } else {
            var rooms: Lobby.Room[] = Lobby.GetRoomLanguage(profile.language);

            for (var i = 0; i < rooms.length; i++) {
                if (rooms[i].users.length + 1 <= rooms[i].settings.maxPlayer) {
                    var newPlayer = User.CreateUser(profile);

                    newPlayer.isHost = false;

                    rooms[i].users.push(newPlayer);

                    return { room: rooms[i], isNew: false };
                }
            }
        }

        return { room: Lobby.CreateRoom(profile, true, code), isNew: true };
    }
}
