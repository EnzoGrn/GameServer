'use client'

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home()
{
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 text-gray-800 px-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-blue-600">Pictionary Game</h1>
        <button className="text-sm text-gray-500 mt-2">Infos</button>
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
    </div>
  );
}
