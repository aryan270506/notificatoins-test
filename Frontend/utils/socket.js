import { io } from "socket.io-client/dist/socket.io";

import axiosInstance from "../Src/Axios";

let socket = null;

export const connectSocket = (user) => {
  if (!socket) {
    // ✅ Extract socket URL from axios baseURL - remove /api path
    const baseURL = axiosInstance.defaults.baseURL; // "http://192.168.137.1:5001/api"
    const socketURL = baseURL.replace(/\/api$/, ""); // Remove trailing /api to get "http://192.168.137.1:5001"
    
    socket = io(socketURL, {
      transports: ["websocket", "polling"], // important for React Native - added fallback
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", async () => {
      console.log("🔥 Socket Connected with User:", {
        socketId: socket.id,
        userId: user._id,
        userName: user.name,
        userRole: user.role,
      });

      try {
        // Register session with backend - save user data with socket ID
        const response = await axiosInstance.post("/users/register-session", {
          userId: user._id,
          socketId: socket.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePhoto: user.profilePhoto || null,
        });
        console.log("✅ Session registered in MongoDB:", response.data);
      } catch (error) {
        console.error("❌ Error registering session:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
      }

      // Tell backend who connected
      socket.emit("userConnected", {
        _id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        profilePhoto: user.profilePhoto || null,
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket Disconnected for user:", user.name);
    });

    // ✅ Add error handlers to catch connection failures
    socket.on("connect_error", (error) => {
      console.error("❌ Socket Connection Error:", {
        message: error.message,
        type: error.type,
      });
    });

    socket.on("error", (error) => {
      console.error("❌ Socket Error:", error);
    });
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.log("⚠️ Socket not initialized yet");
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};