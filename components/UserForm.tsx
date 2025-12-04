"use client";

import { useState, FormEvent } from "react";

interface UserFormProps {
  onSubmit: (name: string) => void;
}

export default function UserForm({ onSubmit }: UserFormProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 md:p-12 max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-2">
          💬 Bem-vindo ao Chat
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Digite seu nome para começar a conversar
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Seu Nome
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
              maxLength={30}
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            Entrar no Chat
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2">✨ Funcionalidades:</h3>
          <ul className="text-gray-400 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Chat em tempo real com Socket.IO</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Mensagens salvas no MongoDB</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Histórico automático ao conectar</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Interface responsiva e moderna</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
