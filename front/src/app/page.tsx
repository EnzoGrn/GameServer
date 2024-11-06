'use client'

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home()
{
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-base-content px-4">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-bold text-center bg-white border border-gray-400 p-2 rounded-md shadow-md font-patrick-hand">
          <span className="text-red-500 border-b-2 border-red-700">D</span>
          <span className="text-green-500 border-b-2 border-green-700">r</span>
          <span className="text-blue-500 border-b-2 border-blue-700">a</span>
          <span className="text-yellow-500 border-b-2 border-yellow-700">w</span>
          <span className="text-purple-500 border-b-2 border-purple-700">i</span>
          <span className="text-orange-500 border-b-2 border-orange-700">n</span>
          <span className="text-pink-500 border-b-2 border-pink-700">g</span>
          <span className="text-teal-500 border-b-2 border-teal-700">T</span>
          <span className="text-indigo-500 border-b-2 border-indigo-700">o</span>
          <span className="text-lime-500 border-b-2 border-lime-700">g</span>
          <span className="text-cyan-500 border-b-2 border-cyan-700">e</span>
          <span className="text-gray-500 border-b-2 border-gray-700">t</span>
          <span className="text-red-500 border-b-2 border-red-700">h</span>
          <span className="text-green-500 border-b-2 border-green-700">e</span>
          <span className="text-blue-500 border-b-2 border-blue-700">r</span>
        </h1>
      </header>

      <main className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-10">
        <div className="w-full md:w-96 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Créer une Salle</h2>
          <input
            type="text"
            placeholder="Nom de la salle"
            className="w-full p-2 mb-4 border border-gray-300 rounded-md"
          />
          <div className="space-y-2">
            <label className="block">
              Nombre de joueurs :
              <input type="number" defaultValue="4" min="2" max="10" className="w-full mt-1 p-2 border border-gray-300 rounded-md" />
            </label>
            <label className="block">
              Langue :
              <select className="w-full mt-1 p-2 border border-gray-300 rounded-md">
                <option>Français</option>
                <option>Anglais</option>
              </select>
            </label>
          </div>
          <button className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md">Créer la Salle</button>
        </div>

        <div className="w-full md:w-96 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Rejoindre une Salle</h2>
          <input
            type="text"
            placeholder="Nom de la salle"
            className="w-full p-2 mb-4 border border-gray-300 rounded-md"
          />
          <Link href={"/game"}>
            <button className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-2 rounded-md">Rejoindre</button>
          </Link>
        </div>
      </main>

      <footer className="mt-10 text-gray-400 text-center">
        <p>Besoin d'aide ? Consultez notre <a href="#" className="text-blue-500">FAQ</a></p>
      </footer>
    </main>
  );
}
