// socket/index.js  (server-side)
const { Server } = require("socket.io");
const axios      = require("axios");

let io;

// ── Room key — MUST match subjectRooms.js: `${subject}_${year}` ─────────────
const roomKey = (subjectName, year) => `${subjectName}_${year}`;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin:  "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔥 Socket Connected:", socket.id);

    // ── userConnected — join personal room + save session ──────────────────
    socket.on("userConnected", async (userData) => {
      console.log("👤 User Connected:", userData.name, "| role:", userData.role);

      // Join a personal room keyed by user _id
      if (userData._id) socket.join(String(userData._id));

      io.emit("user-status", {
        userId:   userData._id,
        status:   "connected",
        socketId: socket.id,
      });

      try {
        const response = await axios.post(
          "http://127.0.0.1:5000/api/users/register-session",
          {
            userId:       userData._id,
            socketId:     socket.id,
            name:         userData.name,
            email:        userData.email,
            role:         userData.role,
            profilePhoto: userData.profilePhoto || null,
          }
        );
        console.log("✅ Session saved:", response.data.message);
      } catch (error) {
        console.error("❌ Error saving session:", error.message);
      }
    });

    // ── join-room ──────────────────────────────────────────────────────────
    // Called by BOTH students and teachers.
    // Payload: { subjectName, year }
    // Room key must match roomKey() in subjectRooms.js: `${subject}_${year}`
    socket.on("join-room", ({ subjectName, year } = {}) => {
      if (!subjectName || !year) {
        console.warn("⚠️  join-room called with missing params:", { subjectName, year });
        return;
      }

      const room = roomKey(subjectName, year);
      socket.join(room);
      console.log(`✅ [join-room] socket ${socket.id} joined room: "${room}"`);
    });

    // ── leave-room ─────────────────────────────────────────────────────────
    // Called when a user navigates away from the chat screen.
    socket.on("leave-room", ({ subjectName, year } = {}) => {
      if (!subjectName || !year) return;

      const room = roomKey(subjectName, year);
      socket.leave(room);
      console.log(`🚪 [leave-room] socket ${socket.id} left room: "${room}"`);
    });

    // ── sendMessage (legacy direct emit — kept for backwards compat) ───────
    // The primary message flow goes through the REST API which calls
    // io.to(room).emit("new-message", ...) — this handler is a fallback.
    socket.on("sendMessage", (data) => {
      console.log("📨 sendMessage received:", data);
      io.to(data.roomId).emit("receiveMessage", data);
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log("❌ Client Disconnected:", socket.id);
      try {
        await axios.post("http://127.0.0.1:5000/api/users/remove-session", {
          socketId: socket.id,
        });
        console.log("✅ Session removed");
      } catch (error) {
        console.error("❌ Error removing session:", error.message);
      }
    });
  });

  return io;
};

// Function to emit notification to specific user
const emitNotificationToUser = (userId, notificationData) => {
  io.to(userId.toString()).emit('new_notification', notificationData);
};

// Function to emit notification to multiple users
const emitNotificationToUsers = (userIds, notificationData) => {
  userIds.forEach(userId => {
    io.to(userId.toString()).emit('new_notification', notificationData);
  });
};

// Export socket functions
// Function to get io instance
const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Export socket functions
module.exports = {
  initSocket,
  getIO,
  emitNotificationToUser,
  emitNotificationToUsers
};