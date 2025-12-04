import http from "http";
import next from "next";
import { Server as IOServer } from "socket.io";
import { parse } from "url";
import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next"; // Tipos auxiliares

// --- Váriaveis Globais (Singleton Pattern) ---
// ESSENCIAL: Mantêm o Socket.IO Server e o HTTP Server vivos entre as chamadas Serverless
let io: IOServer | null = null;
let httpServer: http.Server | null = null;

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Instância do Prisma
const prisma = new PrismaClient();

// --- Função de Inicialização do Servidor ---
const initServer = async () => {
  await app.prepare();

  // 1. Criar servidor HTTP nativo
  const server = http.createServer((req, res) => {
    // Por padrão, delega a requisição para o Next.js
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  httpServer = server; // Armazena a referência global

  // 2. Configurar Socket.IO
  io = new IOServer(server, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    // RECOMENDADO: Forçar polling, que é mais estável em ambientes Serverless
    transports: ["polling"],
  });

  // 3. Configuração do Socket.IO (Lógica de Chat)
  io.on("connection", (socket) => {
    console.log("✅ Socket conectado — id:", socket.id);

    // Entrar em uma sala
    socket.on(
      "join-room",
      async (room: string, callback?: (res: any) => void) => {
        try {
          socket.join(room);
          console.log(`${socket.id} entrou na sala ${room}`);

          // Buscar histórico de mensagens
          const messages = await prisma.message.findMany({
            where: { room },
            orderBy: { createdAt: "asc" },
            take: 50,
          });

          callback?.({ ok: true, messages });
        } catch (error) {
          console.error("Erro ao entrar na sala:", error);
          callback?.({ ok: false, error: "Falha ao buscar histórico" });
        }
      }
    );

    // Enviar mensagem
    socket.on(
      "chat-message",
      async (
        payload: {
          room: string;
          senderId: string;
          senderName: string;
          content: string;
          userId: string;
        },
        ack?: (res: any) => void
      ) => {
        try {
          // Salvar no banco de dados
          const savedMessage = await prisma.message.create({
            data: {
              room: payload.room,
              senderId: payload.senderId,
              senderName: payload.senderName,
              content: payload.content,
              userId: payload.userId,
            },
          });

          // Emitir mensagem para todos na sala
          io?.to(payload.room).emit("message", {
            id: savedMessage.id,
            room: savedMessage.room,
            senderId: savedMessage.senderId,
            senderName: savedMessage.senderName,
            content: savedMessage.content,
            userId: savedMessage.userId,
            createdAt: savedMessage.createdAt.toISOString(),
          });

          ack?.({ ok: true, messageId: savedMessage.id });
        } catch (error) {
          console.error("Erro ao salvar mensagem:", error);
          ack?.({ ok: false, error: "Falha ao enviar mensagem" });
        }
      }
    );

    // Desconectar
    socket.on("disconnect", (reason) => {
      console.log("Socket desconectado:", socket.id, "reason:", reason);
    });
  });

  return httpServer;
};

// --- Exportação do Handler Serverless ---
// A Vercel/Next.js irá chamar esta função para processar as requisições.
export default async (req: http.IncomingMessage, res: http.ServerResponse) => {
  // Inicializa o servidor apenas na primeira vez
  if (!io) {
    await initServer();
  }

  // CRÍTICO: Se a requisição for para o Socket.IO, devemos passá-la
  // para o servidor HTTP que o Socket.IO está escutando,
  // simulando um evento de requisição HTTP
  if (req.url?.startsWith("/api/socketio") && httpServer) {
    // Usamos .emit('request') para que o servidor que está anexado ao Socket.IO
    // possa processar a requisição /api/socketio
    return httpServer.emit("request", req, res);
  }

  // Para todas as outras requisições (Next.js pages, assets),
  // usamos o handler padrão do Next.js.
  const parsedUrl = parse(req.url || "", true);
  return handle(req, res, parsedUrl);
};
