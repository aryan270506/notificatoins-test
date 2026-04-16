// filepath: /Users/aryanbhoge/Desktop/notificatoins-test/Backend/Middleware/inputValidation.js
/**
 * Input Validation & Sanitization Middleware
 * Validates and sanitizes all incoming data
 */

const { body, validationResult, param, query } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// ── Sanitize MongoDB queries ──
const sanitizeData = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️  Potential MongoDB injection in ${key}`);
  },
});

// ── Clean XSS attacks ──
const cleanXSS = xss();

// ── Handle validation errors ──
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// ── Common validators ──
const validators = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  // Password validation (min 8 chars, uppercase, number, special char)
  password: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  // MongoDB ObjectId validation
  objectId: (fieldName = 'id') => param(fieldName)
    .isMongoId()
    .withMessage(`Invalid ${fieldName} format`),

  // Username validation
  username: () => body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscore, and hyphen'),

  // Name validation
  name: (fieldName = 'name') => body(fieldName)
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage(`${fieldName} must be 2-100 characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`),

  // Phone number validation
  phone: () => body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format (E.164 format)'),

  // URL validation
  url: (fieldName = 'url') => body(fieldName)
    .isURL()
    .withMessage(`Invalid ${fieldName} format`),

  // Date validation
  date: (fieldName = 'date') => body(fieldName)
    .isISO8601()
    .withMessage(`${fieldName} must be a valid ISO date`),

  // Pagination
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
};

module.exports = {
  sanitizeData,
  cleanXSS,
  handleValidationErrors,
  validators,
};
