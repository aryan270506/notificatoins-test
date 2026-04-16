// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/Middleware/securityHeaders.js
/**
 * Security Headers Middleware
 * Adds essential HTTP security headers to all responses
 */

const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'none'"],
    },
    reportUri: process.env.CSP_REPORT_URI,
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  dnsPrefetchControl: {
    allow: false,
  },
  permittedCrossDomainPolicies: false,
});

module.exports = securityHeaders;
