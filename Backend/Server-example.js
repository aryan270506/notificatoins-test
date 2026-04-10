const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Import routes
const authRoutes = require('./Routes/AuthRoutes');
const notificationRoutes = require('./Routes/NotificationRoutes');
// ...import other routes as needed...

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date(),
    routes: {
      notifications: 'Registered ✅',
      auth: 'Registered ✅'
    }
  });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
// ...register other routes...

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date()
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management')
  .then(() => {
    console.log('✅ MongoDB connected');
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📍 Notifications: http://localhost:${PORT}/api/notifications`);
      console.log('\n✅ Notification routes registered!');
      console.log('Ready to receive requests...\n');
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

module.exports = app;
