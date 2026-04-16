// socket/index.js  (server-side)
const { Server } = require("socket.io");
const axios      = require("axios");

let io;

// ── Rate Limiting Configuration ─────────────────────────────────────────────
const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_SEC: 100,  // 100 requests per second per user
  WINDOW_SIZE_MS: 1000,        // 1 second window
  MAX_CONNECTIONS: 5000,       // Global max connections
  MAX_CONCURRENT_AXIOS: 50,    // Max concurrent axios calls
};

// ── User rate limiting tracker ──────────────────────────────────────────────
const userRequestCounts = new Map();
const userLastWindowReset = new Map();
const axiosRequestQueue = [];
let activeAxiosRequests = 0;

// ── Cleanup old rate limit entries every 5 minutes ──────────────────────────
setInterval(() => {
  const now = Date.now();
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  for (const [userId, lastReset] of userLastWindowReset.entries()) {
    if (now - lastReset > CLEANUP_INTERVAL) {
      userRequestCounts.delete(userId);
      userLastWindowReset.delete(userId);
    }
  }
  console.log(`🧹 Rate limit cleanup: ${userRequestCounts.size} active users`);
}, 5 * 60 * 1000);

// ── Check if user has exceeded rate limit ───────────────────────────────────
const isRateLimited = (userId) => {
  const now = Date.now();
  const lastReset = userLastWindowReset.get(userId) || now;
  const requestCount = userRequestCounts.get(userId) || 0;

  // Reset window if 1 second has passed
  if (now - lastReset > RATE_LIMIT_CONFIG.WINDOW_SIZE_MS) {
    userRequestCounts.set(userId, 0);
    userLastWindowReset.set(userId, now);
    return false;
  }

  // Check if exceeded limit
  return requestCount >= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC;
};

// ── Increment user request count ────────────────────────────────────────────
const incrementRequestCount = (userId) => {
  const now = Date.now();
  const lastReset = userLastWindowReset.get(userId) || now;

  // Reset if window expired
  if (now - lastReset > RATE_LIMIT_CONFIG.WINDOW_SIZE_MS) {
    userRequestCounts.set(userId, 1);
    userLastWindowReset.set(userId, now);
  } else {
    const current = userRequestCounts.get(userId) || 0;
    userRequestCounts.set(userId, current + 1);
  }
};

// ── Queue axios requests to prevent memory overload ─────────────────────────
const queueAxiosRequest = (fn, userData) => {
  return new Promise((resolve, reject) => {
    axiosRequestQueue.push({ fn, resolve, reject, userId: userData._id, timestamp: Date.now() });
    processAxiosQueue();
  });
};

// ── Process queued axios requests ──────────────────────────────────────────
const processAxiosQueue = async () => {
  while (activeAxiosRequests < RATE_LIMIT_CONFIG.MAX_CONCURRENT_AXIOS && axiosRequestQueue.length > 0) {
    const { fn, resolve, reject, userId } = axiosRequestQueue.shift();
    activeAxiosRequests++;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      console.error(`❌ Axios error for user ${userId}:`, error.message);
      reject(error);
    } finally {
      activeAxiosRequests--;
      processAxiosQueue(); // Process next in queue
    }
  }

  // Log queue status if it's growing
  if (axiosRequestQueue.length > 20) {
    console.warn(`⚠️  Axios queue building up: ${axiosRequestQueue.length} pending requests`);
  }
};

// ── Room key — MUST match subjectRooms.js: `${subject}_${year}` ─────────────
const roomKey = (subjectName, year) => `${subjectName}_${year}`;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin:  "*",
      methods: ["GET", "POST"],
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6, // 1MB max message size
    connectTimeout: 45000,
  });

  io.on("connection", (socket) => {
    // Check global connection limit
    if (io.engine.clientsCount > RATE_LIMIT_CONFIG.MAX_CONNECTIONS) {
      console.warn(`🚨 Max connections (${RATE_LIMIT_CONFIG.MAX_CONNECTIONS}) exceeded, rejecting socket ${socket.id}`);
      socket.disconnect(true);
      return;
    }

    console.log(`🔥 Socket Connected: ${socket.id} (${io.engine.clientsCount}/${RATE_LIMIT_CONFIG.MAX_CONNECTIONS})`);

    // ── userConnected — join personal room + save session ──────────────────
    socket.on("userConnected", async (userData) => {
      // Rate limit check
      if (isRateLimited(userData._id)) {
        console.warn(`⛔ Rate limit exceeded for user ${userData._id}`);
        socket.emit("rate-limit-exceeded", {
          message: "Too many requests. Max 100 per second.",
          retryAfter: 1000,
        });
        return;
      }

      incrementRequestCount(userData._id);
      console.log(`👤 User Connected: ${userData.name} | role: ${userData.role} | requests: ${userRequestCounts.get(userData._id)}/100`);

      // Join a personal room keyed by user _id
      if (userData._id) socket.join(String(userData._id));

      // ✅ FIXED: Broadcast only to other users, not this one
      socket.broadcast.emit("user-status", {
        userId:   userData._id,
        status:   "connected",
        socketId: socket.id,
      });

      // Queue axios call instead of running directly
      try {
        await queueAxiosRequest(
          () => axios.post("http://127.0.0.1:5001/api/users/register-session", {
            userId:       userData._id,
            socketId:     socket.id,
            name:         userData.name,
            email:        userData.email,
            role:         userData.role,
            profilePhoto: userData.profilePhoto || null,
          }),
          userData
        );
        console.log(`✅ Session saved for user ${userData._id}`);
      } catch (error) {
        console.error(`❌ Error saving session for ${userData._id}:`, error.message);
      }
    });

    // ── join-room ──────────────────────────────────────────────────────────
    socket.on("join-room", ({ subjectName, year, userId } = {}) => {
      if (!subjectName || !year || !userId) {
        console.warn("⚠️  join-room called with missing params:", { subjectName, year, userId });
        return;
      }

      // Rate limit check
      if (isRateLimited(userId)) {
        socket.emit("rate-limit-exceeded", { message: "Too many requests" });
        return;
      }

      incrementRequestCount(userId);
      const room = roomKey(subjectName, year);
      socket.join(room);
      console.log(`✅ [join-room] socket ${socket.id} joined room: "${room}"`);
    });

    // ── leave-room ─────────────────────────────────────────────────────────
    socket.on("leave-room", ({ subjectName, year } = {}) => {
      if (!subjectName || !year) return;

      const room = roomKey(subjectName, year);
      socket.leave(room);
      console.log(`🚪 [leave-room] socket ${socket.id} left room: "${room}"`);
    });

    // ── sendMessage with rate limiting ─────────────────────────────────────
    socket.on("sendMessage", ({ data, userId } = {}) => {
      if (!userId) {
        console.warn("⚠️  sendMessage missing userId");
        return;
      }

      // Rate limit check
      if (isRateLimited(userId)) {
        socket.emit("rate-limit-exceeded", { message: "Message rate limited" });
        return;
      }

      incrementRequestCount(userId);
      console.log(`📨 sendMessage received from user ${userId}`);
      io.to(data.roomId).emit("receiveMessage", data);
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", async (reason) => {
      console.log(`❌ Client Disconnected: ${socket.id} | Reason: ${reason} | Remaining: ${io.engine.clientsCount}`);
      
      // Queue the removal request
      try {
        await queueAxiosRequest(
          () => axios.post("http://127.0.0.1:5001/api/users/remove-session", {
            socketId: socket.id,
          }, { timeout: 5000 }),
          { _id: 'system' }
        );
        console.log(`✅ Session removed for socket ${socket.id}`);
      } catch (error) {
        console.error(`❌ Error removing session for ${socket.id}:`, error.message);
      }
    });

    // ── Error handler ──────────────────────────────────────────────────────
    socket.on("error", (error) => {
      console.error(`🔴 Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

// Function to emit notification to specific user
const emitNotificationToUser = (userId, notificationData) => {
  io.to(userId.toString()).emit('new_notification', notificationData);
};

// Function to emit notification to multiple users with batch processing
const emitNotificationToUsers = (userIds, notificationData) => {
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    setImmediate(() => {
      batch.forEach(userId => {
        io.to(userId.toString()).emit('new_notification', notificationData);
      });
    });
  }
};

// Function to get io instance
const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// ── Monitoring/Stats function ──────────────────────────────────────────────
const getSocketStats = () => {
  return {
    totalConnections: io.engine.clientsCount,
    maxConnections: RATE_LIMIT_CONFIG.MAX_CONNECTIONS,
    activeUsers: userRequestCounts.size,
    axiosQueueLength: axiosRequestQueue.length,
    activeAxiosRequests,
    uptime: process.uptime(),
  };
};

// Export socket functions
module.exports = {
  initSocket,
  getIO,
  emitNotificationToUser,
  emitNotificationToUsers,
  getSocketStats,
};