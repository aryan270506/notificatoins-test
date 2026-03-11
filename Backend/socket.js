const { Server } = require("socket.io");
const axios = require("axios");
// Use the same base URL as your backend API

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // allow all for development
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("🔥 Socket Connected:", socket.id);

    socket.on("userConnected", async (userData) => {
      console.log("👤 User Connected After Login:", userData.name);
      console.log("📱 Socket ID:", socket.id);
      
      // Join personal room using user id
      socket.join(userData._id);

      // Broadcast status update to other clients (optional)

      io.emit("user-status", { userId: userData._id, status: "connected", socketId: socket.id });

      // Save user session with socket ID to database
      try {
        // ✅ Use 127.0.0.1 (localhost) to register session
        const response = await axios.post("http://127.0.0.1:5000/api/users/register-session", {
          userId: userData._id,
          socketId: socket.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          profilePhoto: userData.profilePhoto || null,
        });
        console.log("✅ User session saved:", response.data.message);
      } catch (error) {
        console.error("❌ Error saving user session:", error.message);
      }
    });

    // Receive message
    socket.on("sendMessage", (data) => {
      console.log("Message Received:", data);

      // Send to specific room
      io.to(data.roomId).emit("receiveMessage", data);
    });

    socket.on("disconnect", async () => {
      console.log("❌ Client Disconnected:", socket.id);
      
      // Remove session from database
      try {
        await axios.post("http://127.0.0.1:5000/api/users/remove-session", {
          socketId: socket.id
        });
        console.log("✅ Session removed from database");
      } catch (error) {
        console.error("❌ Error removing session:", error.message);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };