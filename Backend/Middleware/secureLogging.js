// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/Middleware/secureLogging.js
/**
 * Secure Logging Middleware
 * Logs without exposing sensitive information
 */

const fs = require('fs');
const path = require('path');

// ── Sensitive fields to redact ──
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'ssn',
  'creditCard',
  'privateKey',
  'refreshToken',
  'accessToken',
  'auth',
  'authorization',
];

// ── Sanitize data before logging ──
const sanitizeData = (obj, depth = 0) => {
  if (depth > 5) return '***REDACTED***'; // Prevent deep recursion
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// ── Log directory setup ──
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ── File write with rotation ──
const writeLog = (filename, data) => {
  try {
    const logPath = path.join(logsDir, filename);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${JSON.stringify(data)}\n`;

    // Rotate logs if file > 10MB
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > 10 * 1024 * 1024) {
        const rotatedName = `${filename.split('.')[0]}-${Date.now()}.log`;
        fs.renameSync(logPath, path.join(logsDir, rotatedName));
      }
    }

    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    console.error('Error writing log:', err.message);
  }
};

// ── HTTP request/response logging ──
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    };

    // Log request body only for POST/PUT, sanitized
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      logData.body = sanitizeData(req.body);
    }

    // Log to appropriate file based on status
    if (res.statusCode >= 500) {
      writeLog('error.log', logData);
    } else if (res.statusCode >= 400) {
      writeLog('warn.log', logData);
    } else if (process.env.LOG_LEVEL === 'debug') {
      writeLog('access.log', logData);
    }

    // Console output in development
    if (process.env.NODE_ENV !== 'production') {
      const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(
        `${statusColor}[${res.statusCode}]\x1b[0m ${req.method} ${req.path} ${duration}ms`
      );
    }
  });

  next();
};

// ── Security event logging ──
const logSecurityEvent = (event, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    data: sanitizeData(data),
  };

  writeLog('security.log', logEntry);
  console.warn(`🔒 Security Event: ${event}`, logEntry);
};

// ── Error logging ──
const errorLogger = (err, req, res, next) => {
  const errorData = {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
  };

  writeLog('error.log', errorData);
  console.error('🔴 Error:', errorData);

  next(err);
};

module.exports = {
  sanitizeData,
  requestLogger,
  logSecurityEvent,
  errorLogger,
  writeLog,
};
