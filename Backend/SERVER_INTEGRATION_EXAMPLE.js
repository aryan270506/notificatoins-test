// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/SERVER_INTEGRATION_EXAMPLE.js
/**
 * Example Server.js Integration with Rate Limiting
 * Shows exactly where to add rate limiting middleware
 * 
 * Copy-paste the relevant sections into your actual Server.js
 */

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');

// ── Initialize Environment ──
dotenv.config();
const app = express();
const server = http.createServer(app);

// ── Initialize Socket.io ──
const { initSocket, getSocketStats } = require('./socket');
const io = initSocket(server);

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ STEP 1: Import Rate Limiting Middleware
// ═══════════════════════════════════════════════════════════════════════════════
const { rateLimitMiddleware } = require('./Middleware/rateLimiter');
const rateLimitRoutes = require('./Routes/RateLimitRoutes');

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE SETUP
// ═══════════════════════════════════════════════════════════════════════════════

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ STEP 2: Add Request Logging Middleware (Optional but recommended)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 400 ? '\x1b[31m' : '\x1b[32m'; // Red for errors, green for success
    console.log(`${color}[${status}]\x1b[0m ${req.method} ${req.path} ${duration}ms`);
  });
  next();
});

// ✅ STEP 3: Authentication Middleware (Must come before rate limiting)
// This ensures req.user is populated so rate limiter can identify users
const { verifyToken } = require('./Middleware/auth');
app.use(verifyToken);

// ✅ STEP 4: Apply Rate Limiting Middleware (After auth, before routes)
app.use(rateLimitMiddleware);

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ✅ STEP 5: Add Rate Limit Monitoring Routes (Optional but recommended)
app.use('/api/rate-limit', rateLimitRoutes);

// Your existing routes
const studentsRoutes = require('./Routes/StudentsRoutes');
const teacherRoutes = require('./Routes/TeacherRoutes');
const adminRoutes = require('./Routes/AdminRoutes');
const messagesRoutes = require('./Routes/MessagesRoutes');
const notificationRoutes = require('./Routes/NotificationRoutes');
const authRoutes = require('./Routes/AuthRoutes');

app.use('/api/students', studentsRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);

// ... all your other routes ...

// ✅ STEP 6: Health Check Endpoint
app.get('/health', (req, res) => {
  const socketStats = getSocketStats();
  const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  
  return res.status(200).json({
    success: true,
    status: 'operational',
    timestamp: new Date().toISOString(),
    connections: {
      current: socketStats.totalConnections,
      max: socketStats.maxConnections,
    },
    memory: {
      heapUsed: Math.round(memUsage),
      limit: 2048,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

// 404 Handler
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler (Must be last)
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Rate limit errors are already handled by middleware
  if (res.statusCode === 429) {
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    error: 'Server Error',
    message,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50, // ✅ Connection pooling for better performance
      minPoolSize: 10,
      socketTimeoutMS: 30000,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Start server
  server.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════╗`);
    console.log(`║  🚀 Backend Server Running        ║`);
    console.log(`║  Port: ${PORT}                           ║`);
    console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}     ║`);
    console.log(`║  Rate Limit: 100 req/sec per user ║`);
    console.log(`╚════════════════════════════════════╝\n`);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════════

const gracefulShutdown = async () => {
  console.log('\n⏳ Shutting down gracefully...');

  // Close server
  server.close(() => {
    console.log('✅ Server closed');
  });

  // Close database connection
  await mongoose.connection.close();
  console.log('✅ Database connection closed');

  // Exit process
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
