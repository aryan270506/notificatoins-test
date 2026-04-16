// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/Middleware/csrfProtection.js
/**
 * CSRF Protection Middleware
 * Implements CSRF token validation for state-changing operations
 */

const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// ── CSRF protection middleware ──
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  },
});

// ── Skip CSRF for specific routes (e.g., APIs with JWT) ──
const skipCsrfForAPI = (req, res, next) => {
  // Skip CSRF check for API routes with valid JWT
  if (req.headers.authorization || req.method === 'GET') {
    return next();
  }
  csrfProtection(req, res, next);
};

// ── Add CSRF token to response ──
const addCsrfToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken?.() || null;
  next();
};

// ── CSRF error handler ──
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      success: false,
      error: 'CSRF Validation Failed',
      message: 'The security token is invalid or missing',
    });
  } else {
    next(err);
  }
};

module.exports = {
  cookieParser: cookieParser(),
  csrfProtection,
  skipCsrfForAPI,
  addCsrfToken,
  csrfErrorHandler,
};
