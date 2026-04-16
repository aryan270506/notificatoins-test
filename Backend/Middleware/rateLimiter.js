// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/Middleware/rateLimiter.js
/**
 * Rate Limiting Middleware
 * Enforces 100 requests per second per user across all REST endpoints
 * Works with JWT tokens and session-based authentication
 */

const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_SEC: 100,
  WINDOW_SIZE_MS: 1000, // 1 second
  CLEANUP_INTERVAL: 5 * 60 * 1000, // Clean up every 5 minutes
};

// Store request counts per user: userId -> { count, resetTime }
const userRequestTracking = new Map();

// ── Cleanup old entries every 5 minutes ──────────────────────────────────
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [userId, data] of userRequestTracking.entries()) {
    if (now - data.resetTime > RATE_LIMIT_CONFIG.CLEANUP_INTERVAL) {
      userRequestTracking.delete(userId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Rate limiter cleanup: removed ${cleaned} expired entries`);
  }
}, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL);

/**
 * Check if user has exceeded rate limit
 * Returns: { isLimited: boolean, remaining: number, resetTime: number }
 */
const checkRateLimit = (userId) => {
  const now = Date.now();
  let userdata = userRequestTracking.get(userId);

  // Initialize or reset if window expired
  if (!userdata || now - userdata.resetTime > RATE_LIMIT_CONFIG.WINDOW_SIZE_MS) {
    userdata = {
      count: 0,
      resetTime: now,
    };
    userRequestTracking.set(userId, userdata);
  }

  // Increment request count
  userdata.count++;

  const isLimited = userdata.count > RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC;
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC - userdata.count);
  const resetTime = userdata.resetTime + RATE_LIMIT_CONFIG.WINDOW_SIZE_MS;
  const resetInSeconds = Math.ceil((resetTime - now) / 1000);

  return {
    isLimited,
    count: userdata.count,
    remaining,
    resetTime,
    resetInSeconds,
  };
};

/**
 * Express middleware for rate limiting
 * Attach after authentication middleware so you have user info
 */
const rateLimitMiddleware = (req, res, next) => {
  // Extract user ID from JWT token or session
  const userId = req.user?._id || req.user?.id || req.session?.userId;

  // Skip rate limiting for unauthenticated requests (optional - remove if needed)
  if (!userId) {
    return next();
  }

  const limitStatus = checkRateLimit(String(userId));

  // Set rate limit headers on response
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC);
  res.setHeader('X-RateLimit-Remaining', limitStatus.remaining);
  res.setHeader('X-RateLimit-Reset', limitStatus.resetTime);

  // If rate limited, send 429 Too Many Requests
  if (limitStatus.isLimited) {
    console.warn(`⛔ Rate limit exceeded for user ${userId}: ${limitStatus.count}/${RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC}`);

    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `You have exceeded the limit of ${RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC} requests per second.`,
      retryAfter: limitStatus.resetInSeconds,
      resetTime: new Date(limitStatus.resetTime).toISOString(),
    });
  }

  // Log if getting close to limit (80%+)
  if (limitStatus.count > RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC * 0.8) {
    console.log(`⚠️  User ${userId} approaching rate limit: ${limitStatus.count}/${RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC}`);
  }

  next();
};

/**
 * Get stats for monitoring
 */
const getRateLimitStats = () => {
  return {
    totalTrackedUsers: userRequestTracking.size,
    maxRequestsPerSec: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_SEC,
    windowSizeMs: RATE_LIMIT_CONFIG.WINDOW_SIZE_MS,
    activeUsers: Array.from(userRequestTracking.entries()).map(([userId, data]) => ({
      userId,
      requests: data.count,
      window: Date.now() - data.resetTime,
    })),
  };
};

/**
 * Reset a specific user's rate limit (admin only)
 */
const resetUserRateLimit = (userId) => {
  const removed = userRequestTracking.delete(String(userId));
  console.log(`🔄 Reset rate limit for user ${userId}: ${removed ? 'success' : 'not found'}`);
  return removed;
};

/**
 * Bypass rate limiting for specific user (admin/system calls)
 */
const bypassRateLimit = (userId) => {
  // For system operations, use a special user ID like 'system' or 'admin'
  // And check this in the middleware
  return userId === 'system' || userId === 'admin-bypass';
};

module.exports = {
  rateLimitMiddleware,
  checkRateLimit,
  getRateLimitStats,
  resetUserRateLimit,
  bypassRateLimit,
  RATE_LIMIT_CONFIG,
};