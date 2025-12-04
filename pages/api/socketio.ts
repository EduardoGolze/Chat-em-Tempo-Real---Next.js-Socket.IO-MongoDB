import { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { PrismaClient } from "@prisma/client";

type SocketServer = HttpServer & { io?: IOServer };

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: SocketServer;
  };
};

const prisma = new PrismaClient();

const SocketHandler = async (
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) => {
  if (res.socket.server.io) {
    console.log("Socket.IO já está rodando.");
    res.end();
    return;
  }

  console.log("Inicializando Socket.IO pela primeira vez.");

  const io = new IOServer(res.socket.server, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },

    transports: ["polling"],
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    console.log("✅ Socket conectado — id:", socket.id);

    socket.on(
      "join-room",
      async (room: string, callback?: (res: any) => void) => {
        try {
          socket.join(room);
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
          const dataToSave = {
            room: payload.room,
            senderId: payload.senderId,
            senderName: payload.senderName,
            content: payload.content,
            userId: payload.userId,
          };

          const savedMessage = await prisma.message.create({
            data: dataToSave,
          });

          io.to(payload.room).emit("message", {
            ...dataToSave,
            id: savedMessage.id,
            createdAt: savedMessage.createdAt.toISOString(),
          });

          ack?.({ ok: true, messageId: savedMessage.id });
        } catch (error) {
          console.error("Erro ao salvar mensagem:", error);
          ack?.({ ok: false, error: "Falha ao enviar mensagem" });
        }
      }
    );

    socket.on("disconnect", (reason) => {
      console.log("Socket desconectado:", socket.id, "reason:", reason);
    });
  });

  res.end();
};

export default SocketHandler;
