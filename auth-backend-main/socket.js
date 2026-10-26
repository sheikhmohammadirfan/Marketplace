const { Server } = require("socket.io");
const cookie = require("cookie");
const { verifyAccessToken } = require("./utils/tokens");
const Conversation = require("./models/Conversation");
const { createMessage } = require("./controllers/chatController");

function initSocket(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  // Auth handshake: read the same httpOnly access_token cookie the REST API uses.
  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error("Authentication required"));

      const parsed = cookie.parse(rawCookie);
      const token = parsed.access_token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = verifyAccessToken(token);
      socket.userId = decoded.sub;
      next();
    } catch (err) {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    // Personal room — lets the server notify a user regardless of which conversation they're viewing.
    socket.join(`user:${socket.userId}`);

    socket.on("join-conversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;
        const isParticipant =
          conversation.buyer.toString() === socket.userId || conversation.seller.toString() === socket.userId;
        if (isParticipant) socket.join(`conv:${conversationId}`);
      } catch {
        /* ignore */
      }
    });

    socket.on("leave-conversation", (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on("send-message", async ({ conversationId, text }, ack) => {
      try {
        const { message } = await createMessage({ conversationId, senderId: socket.userId, text });
        io.to(`conv:${conversationId}`).emit("new-message", message);
        if (typeof ack === "function") ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, error: err.message });
      }
    });

    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`conv:${conversationId}`).emit("typing", { userId: socket.userId, isTyping });
    });
  });

  return io;
}

module.exports = { initSocket };
