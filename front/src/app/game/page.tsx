'use client'

import { useState } from "react";

export default function Game()
{  
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(45); // Example timer value
  const wordToGuess = "Chat"; // Example word to guess

  const handleSendMessage = () => {
    setMessage('');
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Top Bar */}
      <div className="w-full bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="text-lg font-bold">Temps restant : {timeLeft}s</div>
        <div className="text-lg font-semibold">Mot à deviner : {wordToGuess}</div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Players List */}
        <div className="w-full md:w-1/4 p-4 bg-white shadow-md order-2 md:order-1">
          <h2 className="text-xl font-semibold mb-4">Joueurs</h2>
          <ul>
            <li className="p-2 bg-blue-100 rounded-md mb-2">Joueur 1 (Dessine)</li>
            <li className="p-2 bg-gray-100 rounded-md mb-2">Joueur 2</li>
            <li className="p-2 bg-gray-100 rounded-md mb-2">Joueur 3</li>
          </ul>
        </div>

        {/* Drawing Area */}
        <div className="flex-1 p-4 flex flex-col items-center order-1 md:order-2">
          <div className="w-full h-64 md:h-96 bg-white border border-gray-300 rounded-md mb-4">
            <p className="text-center text-gray-400 pt-24 md:pt-32">Zone de Dessin (Canvas)</p>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <button className="bg-gray-200 px-3 md:px-4 py-1 md:py-2 rounded-md">Crayon</button>
            <button className="bg-gray-200 px-3 md:px-4 py-1 md:py-2 rounded-md">Gomme</button>
            <button className="bg-gray-200 px-3 md:px-4 py-1 md:py-2 rounded-md">Annuler</button>
            <button className="bg-red-400 px-3 md:px-4 py-1 md:py-2 rounded-md text-white">Réinitialiser</button>
          </div>
        </div>

        {/* Chat */}
        <div className="w-full md:w-1/4 p-4 bg-white shadow-md flex flex-col order-3 md:order-3">
          <h2 className="text-xl font-semibold mb-4">Chat</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="bg-blue-100 p-2 rounded-md">
              <span className="font-bold">Joueur 1:</span> Bonne réponse !
            </div>
          </div>
          <div className="mt-4 flex">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message"
              className="w-full p-2 border border-gray-300 rounded-l-md"
            />
            <button onClick={handleSendMessage} className="bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-4 rounded-r-md">Envoyer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
