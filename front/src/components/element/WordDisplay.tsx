export type GameState = "choose" | "waiting" | "guessing" | "guess" | "drawing";

const WordDisplay = ({ gameState, word } : { gameState: GameState, word?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center text-white">
      {/* The word are currently being chosen */}
      {gameState === "choose" && (
        <p className="text-xl font-bold">Choose a word...</p>
      )}

      {/* Other players are waiting the current player to choose a word */}
      {gameState === "waiting" && (
        <p className="text-xl font-bold">Waiting...</p>
      )}

      {/* The player are guessing the current word, but don't found it */}
      {gameState === "guessing" && word && (
        <>
          <p className="text-xl font-bold">Word to Guess:</p>
          <p className="text-2xl mt-2 font-mono">
              {Array.from(word).map((char) => (char === " " ? " " : "_")).join(" ")}{" "}
              {/* Displays _ _ _ based on word length or word */}

              <span className="ml-2 text-sm">{word.length}</span>
          </p>
        </>
      )}

      {/* The player have already found */}
      {gameState === "guess" && word && (
        <>
          <p className="text-xl font-bold">Word to Guess:</p>
          <p className="text-2xl mt-2 font-mono">
              {word}
          </p>
        </>
      )}

      {/* The current player is drawing the word */}
      {gameState === "drawing" && word && (
        <>
          <p className="text-xl font-bold">Word to Draw:</p>
          <p className="text-2xl mt-2 font-mono">{word}</p>
        </>
      )}
    </div>
  );
};

export default WordDisplay;