export namespace User {

    export interface Profile {
        id       : string;
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

    export const CreateUser = (profile: Profile) : Player => {
        return {
            profile   : profile,
            isHost    : false,
            hasGuessed: false,
            score     : 0
        };
    }
};
