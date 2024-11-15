'use client';

import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import { Socket } from 'socket.io-client';
import { useSocket } from '@/components/provider/SocketProvider';

export default function Page({ params }: { params: { id: string } }) {
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(45); // Exemple de timer
  const wordToGuess = "Chat"; // Exemple de mot à deviner
  const canvasParentRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil'); // Outil actif
  const [strokeWidth, setStrokeWidth] = useState(4); // Épaisseur du trait
  const { socket } = useSocket();

  useEffect(() => {
    console.log('Socket:', socket);
    // Initialise p5.js
    if (canvasParentRef.current && socket) {
      new p5((p: p5) => sketch(p, socket), canvasParentRef.current);
    }
  }, []);

  const sketch = (p: p5, socket: Socket) => {
    p.setup = () => {
      const canvas = p.createCanvas(600, 400);
      canvas.parent(canvasParentRef.current!);
      p.background(255);

      // Écoute des dessins des autres utilisateurs
      socket.on('mouse', (data: MouseData) => {
        p.stroke(data.color);
        p.strokeWeight(data.strokeWidth);
        p.line(data.x, data.y, data.px, data.py);
      });
    };

    p.mouseDragged = () => {
      const x = p.mouseX;
      const y = p.mouseY;
      const px = p.pmouseX;
      const py = p.pmouseY;

      // Envoi des données au serveur via Socket.IO
      const data: MouseData = {
        x,
        y,
        px,
        py,
        color: tool === 'eraser' ? '#FFFFFF' : '#000000',
        strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
      };

      socket.emit('mouse', data);

      // Dessine localement aussi
      p.stroke(data.color);
      p.strokeWeight(data.strokeWidth);
      p.line(data.x, data.y, data.px, data.py);
    };

    p.draw = () => {
      // Pas d'animation en continu nécessaire
    };
  };

  const clearCanvas = () => {
    socket?.emit('clear'); // Émet un événement pour demander à tous de réinitialiser leur canvas
  };

  useEffect(() => {
    // Écoute des commandes pour réinitialiser le canvas
    socket?.on('clear', () => {
      const canvasElement = document.querySelector('canvas');
      if (canvasElement) {
        const context = canvasElement.getContext('2d');
        context?.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }
    });
  }, [socket]);

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Barre du haut */}
      <div className="w-full bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="text-lg font-bold">Temps restant : {timeLeft}s</div>
        <div className="text-lg font-semibold">Mot à deviner : {wordToGuess}</div>
      </div>

      {/* Contenu principal */}
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Liste des joueurs */}
        <div className="w-full md:w-1/4 p-4 bg-white shadow-md order-2 md:order-1">
          <h2 className="text-xl font-semibold mb-4">Joueurs</h2>
          <ul>
            <li className="p-2 bg-blue-100 rounded-md mb-2">Joueur 1 (Dessine)</li>
            <li className="p-2 bg-gray-100 rounded-md mb-2">Joueur 2</li>
            <li className="p-2 bg-gray-100 rounded-md mb-2">Joueur 3</li>
          </ul>
        </div>

        {/* Zone de dessin */}
        <div className="flex-1 p-4 flex flex-col items-center order-1 md:order-2">
          <div
            ref={canvasParentRef}
            className="w-full h-64 md:h-96 bg-white border border-gray-300 rounded-md mb-4"
          ></div>

          {/* Contrôles pour les outils */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setTool('pencil')}
              className={`px-3 md:px-4 py-1 md:py-2 rounded-md ${
                tool === 'pencil' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Crayon
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`px-3 md:px-4 py-1 md:py-2 rounded-md ${
                tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Gomme
            </button>
            <button
              onClick={clearCanvas}
              className="bg-red-400 px-3 md:px-4 py-1 md:py-2 rounded-md text-white"
            >
              Réinitialiser
            </button>
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
            <button
              onClick={() => setMessage('')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-4 rounded-r-md"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Interface pour les données envoyées via Socket.IO
interface MouseData {
  x: number;
  y: number;
  px: number;
  py: number;
  color: string;
  strokeWidth: number;
}
