const fs = require('fs');
const path = require('path');

import { Room } from './types';

const loadWordsFromFile = (language: string) => {
    language = language.toLowerCase();
    const filePath = path.join(__dirname, `../data/${language}/words.json`);
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(data);
        return parsedData.words || [];  // Extract words from the 'words' property
    } catch (err) {
        console.error("Erreur de lecture du fichier de mots:", err);
        return [];
    }
};

const selectUniqueWords = (words: string[]) => {
    let word1, word2, word3;
    do {
        word1 = { id: 1, text: words[Math.floor(Math.random() * words.length)] };
        word2 = { id: 2, text: words[Math.floor(Math.random() * words.length)] };
        word3 = { id: 3, text: words[Math.floor(Math.random() * words.length)] };
    } while (
        word1.text === word2.text ||
        word2.text === word3.text ||
        word3.text === word1.text
    );
    return [word1, word2, word3];
};

export function selectWords(room: Room) {
    if (room.roomSettings.useCustomWords && room.customWords.length !== 0) {
        return selectUniqueWords(room.customWords);
    }

    const words = loadWordsFromFile(room.roomSettings.language);
    if (words.length === 0) {
        return [{ id: 1, text: "No words available" }, { id: 2, text: "No words available" }, { id: 3, text: "No words available" }];
    }

    return selectUniqueWords(words);
};
