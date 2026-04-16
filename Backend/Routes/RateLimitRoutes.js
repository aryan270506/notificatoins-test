// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/Routes/RateLimitRoutes.js
/**
 * Rate Limiting & Monitoring Routes
 * Admin-only endpoints to view and manage rate limit stats
 */

const express = require('express');
const router = express.Router();
const { 
  getRateLimitStats, 
  resetUserRateLimit, 
  RATE_LIMIT_CONFIG 
} = require('../Middleware/rateLimiter');
const { getSocketStats } = require('../socket');

// Middleware to check if user is admin (customize based on your auth)
const isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'Only admins can access this endpoint',
  });
};

/**
 * GET /api/rate-limit/stats
 * Get rate limiting statistics
 */
router.get('/stats', isAdmin, (req, res) => {
  try {
    const restStats = getRateLimitStats();
    const socketStats = getSocketStats();

    return res.status(200).json({
      success: true,
      data: {
        config: RATE_LIMIT_CONFIG,
        rest: restStats,
        socket: socketStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching rate limit stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/rate-limit/reset/:userId
 * Reset rate limit for a specific user
 */
router.post('/reset/:userId', isAdmin, (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'userId is required',
      });
    }

    const success = resetUserRateLimit(userId);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        reset: success,
        message: success ? `Rate limit reset for user ${userId}` : `User ${userId} not found in rate limiter`,
      },
    });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/rate-limit/reset-all
 * Reset all rate limits (emergency admin only)
 */
router.post('/reset-all', isAdmin, (req, res) => {
  try {
    // This would require exporting additional functions from rateLimiter
    // For now, we can just recommend restarting the server
    console.warn('⚠️  Admin requested full rate limit reset');
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'To reset all rate limits, restart the server or clear rate limit memory',
        note: 'Rate limit tracking is in-memory and will be cleared on server restart',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/rate-limit/health
 * Quick health check - shows if system is under stress
 */
router.get('/health', (req, res) => {
  try {
    const socketStats = getSocketStats();
    const restStats = getRateLimitStats();

    const connectionUsage = socketStats.totalConnections / socketStats.maxConnections;
    const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    let health = 'healthy';
    if (connectionUsage > 0.8 || memUsage > 1000) {
      health = 'degraded';
    }
    if (connectionUsage > 0.95 || memUsage > 1500) {
      health = 'critical';
    }

    return res.status(200).json({
      success: true,
      data: {
        health,
        connections: {
          current: socketStats.totalConnections,
          max: socketStats.maxConnections,
          usage: `${(connectionUsage * 100).toFixed(2)}%`,
        },
        memory: {
          heapUsed: `${Math.round(memUsage)}MB`,
          threshold: '1500MB',
        },
        trackedUsers: restStats.totalTrackedUsers,
        uptime: `${Math.floor(socketStats.uptime / 60)} minutes`,
      },
    });
  } catch (error) {
    console.error('Error getting health:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

module.exports = router;