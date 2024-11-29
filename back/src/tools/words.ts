const fs   = require('fs');
const path = require('path');

import { Lobby } from '../room/type';

const _LoadWordsFromFile = (language: string) => {
    language = language.toLowerCase();

    const filePath = path.join(__dirname, `../../data/${language}/words.json`);

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(data);

        return parsedData.words || []; // Extract words from the 'words' property
    } catch (err) {
        console.error("Erreur de lecture du fichier de mots:", err);

        return [];
    }
};

const _SelectRandWords = (words: string[]): { id: number, text: string }[] => {
    let word1, word2, word3: { id: number, text: string };

    do {
        word1 = { id: 1, text: words[Math.floor(Math.random() * words.length)] };
        word2 = { id: 2, text: words[Math.floor(Math.random() * words.length)] };
        word3 = { id: 3, text: words[Math.floor(Math.random() * words.length)] };
    } while (word1.text === word2.text || word2.text === word3.text || word3.text === word1.text);

    return [word1, word2, word3];
};

export const SelectWords = (room: Lobby.Room): { id: number, text: string }[] => {
    if (room.settings.useCustomWordsOnly && room.settings.customWords.length > 0)
        return _SelectRandWords(room.settings.customWords);
    var words = _LoadWordsFromFile(room.settings.language);

    if (room.settings.customWords.length > 0)
        words = words.concat(room.settings.customWords);
    if (words.length === 0)
        return [{ id: 1, text: "No words available" }, { id: 2, text: "No words available" }, { id: 3, text: "No words available" }];
    return _SelectRandWords(words);
};
