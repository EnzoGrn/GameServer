export namespace User {

    export const GenerateName = (username: string) : string => {
        return username || "Player_" + Math.floor(Math.random() * 1000);
    }

    export interface Profile {
        id      ?: string;
        name     : string;
        avatar   : number;
        language : string;
    };

    export interface Player {
        profile   : Profile;
        isHost    : boolean;
        hasGuessed: boolean;
        score     : number;
    }
};
