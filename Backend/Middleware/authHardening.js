// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/Middleware/authHardening.js
/**
 * Authentication Hardening Middleware
 * JWT verification, token validation, secure session handling
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// ── Brute force protection for login ──
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST',
  keyGenerator: (req) => req.body.email || req.ip,
});

// ── Brute force protection for registration ──
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: 'Too many registrations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

// ── Brute force protection for password reset ──
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset attempts
  message: 'Too many password reset attempts',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email || req.ip,
});

// ── Verify JWT token ──
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify token hasn't been tampered
    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Token',
        message: 'Token is missing required fields',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token Expired',
        message: 'Your session has expired. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Authentication failed',
    });
  }
};

// ── Verify refresh token ──
const verifyRefreshToken = (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No refresh token provided',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid Refresh Token',
      message: 'Please login again',
    });
  }
};

// ── Role-based access control ──
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Only ${allowedRoles.join(', ')} can access this resource`,
      });
    }
    next();
  };
};

// ── Check if user owns resource ──
const checkOwnership = (req, res, next) => {
  const resourceOwnerId = req.body.userId || req.params.userId;

  if (req.user.id !== resourceOwnerId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You do not have permission to access this resource',
    });
  }

  next();
};

// ── Generate secure tokens ──
const generateTokens = (userId, role, email) => {
  const accessToken = jwt.sign(
    { id: userId, role, email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: userId, role, email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  verifyToken,
  verifyRefreshToken,
  authorize,
  checkOwnership,
  generateTokens,
};
