import http from "http";
import next from "next";
import { Server as IOServer } from "socket.io";
import { parse } from "url";
import { PrismaClient } from "@prisma/client";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || "4000", 10);

// Instância do Prisma
const prisma = new PrismaClient();

async function main() {
  await app.prepare();

  // Criar servidor HTTP nativo
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  // Configurar Socket.IO
  const io = new IOServer(server, {
    path: "/api/socketio", // Usar /api/socketio em vez de /socket.io
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Configuração do Socket.IO
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
            take: 50, // Limitar a 50 últimas mensagens
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
          console.log("mensagem recebida:", payload);

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
          io.to(payload.room).emit("message", {
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

  server.listen(PORT, () => {
    console.log(
      `> Servidor Next + Socket.IO rodando em http://localhost:${PORT}`
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
