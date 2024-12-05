namespace Random {

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    export const RandString = (length: number) : string => {
      const possibleCharacters: number = characters.length;
      let   result            : string = "";
  
          for (let i = 0; i < length; i++)
            result += characters.charAt(Math.floor(Math.random() * possibleCharacters));
        return result;
    };
};
  
export default Random;
  