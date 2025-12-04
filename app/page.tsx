"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import io, { Socket } from "socket.io-client";
import MessageList from "../components/MessageList";
import ChatInput from "../components/ChatInput";
import UserForm from "../components/UserForm";

// Tipo para mensagens
interface ChatMessage {
  id: string;
  room: string;
  senderId: string;
  senderName: string;
  content: string;
  userId: string;
  createdAt: string;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [room] = useState<string>("general");
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conectar ao Socket.IO
  useEffect(() => {
    const socketInstance = io({
      path: "/api/socketio",
    });

    socketInstance.on("connect", () => {
      console.log("Conectado ao servidor Socket.IO");
      setIsConnected(true);

      // Entrar na sala após conectar
      if (currentUser) {
        socketInstance.emit("join-room", room, (response: any) => {
          if (response.ok && response.messages) {
            setMessages(response.messages);
          }
        });
      }
    });

    socketInstance.on("disconnect", () => {
      console.log("Desconectado do servidor Socket.IO");
      setIsConnected(false);
    });

    socketInstance.on("message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [room, currentUser]);

  // Rolar para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Definir usuário
  const handleSetUser = (name: string) => {
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setCurrentUser({ id: userId, name });

    // Entrar na sala
    if (socket) {
      socket.emit("join-room", room, (response: any) => {
        if (response.ok && response.messages) {
          setMessages(response.messages);
        }
      });
    }
  };

  // Enviar mensagem
  const handleSendMessage = (content: string) => {
    if (!socket || !currentUser || !content.trim()) return;

    socket.emit(
      "chat-message",
      {
        room,
        senderId: currentUser.id,
        senderName: currentUser.name,
        content: content.trim(),
        userId: currentUser.id,
      },
      (response: any) => {
        if (response.ok) {
          console.log("Mensagem enviada com sucesso");
        }
      }
    );
  };

  if (!currentUser) {
    return <UserForm onSubmit={handleSetUser} />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Cabeçalho */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
            💬 Chat em Tempo Real
          </h1>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                {isConnected ? "Conectado" : "Desconectado"} •{" "}
                {currentUser.name}
              </span>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Trocar Usuário
            </button>
          </div>
        </header>

        {/* Área de Mensagens */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 shadow-2xl mb-6">
          <div className="h-[500px] overflow-y-auto pr-2">
            <MessageList messages={messages} currentUserId={currentUser.id} />
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input de Mensagem */}
        <ChatInput onSendMessage={handleSendMessage} />

        {/* Status */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          <p>
            Mensagens são salvas no MongoDB e sincronizadas em tempo real via
            Socket.IO
          </p>
          <p className="mt-2">Total de mensagens: {messages.length}</p>
        </div>
      </div>
    </main>
  );
}
