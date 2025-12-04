"use client";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  userId: string;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export default function MessageList({
  messages,
  currentUserId,
}: MessageListProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>Nenhuma mensagem ainda. Seja o primeiro a enviar!</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.userId === currentUserId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.userId === currentUserId
                  ? "bg-blue-600 rounded-br-none"
                  : "bg-gray-700 rounded-bl-none"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`font-semibold ${
                    message.userId === currentUserId
                      ? "text-blue-200"
                      : "text-gray-300"
                  }`}
                >
                  {message.senderName}
                </span>
                <span className="text-xs text-gray-400">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <p className="text-white">{message.content}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
