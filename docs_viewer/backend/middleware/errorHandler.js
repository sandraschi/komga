const logger = require('../utils/logger');

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function errorHandler(err, req, res, next) {
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  let code = err.code;
  
  // Handle common error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.errors;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource Not Found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
  } else if (err.name === 'RateLimitExceeded') {
    statusCode = 429;
    message = 'Too Many Requests';
  }
  
  // Log the error
  const logContext = {
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    params: req.params,
    query: req.query,
    body: req.body,
    stack: err.stack,
    code: err.code,
    name: err.name
  };
  
  if (statusCode >= 500) {
    logger.error(message, logContext);
  } else if (statusCode >= 400) {
    logger.warn(message, logContext);
  } else {
    logger.info(message, logContext);
  }
  
  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      ...(details && { details }),
      ...(code && { code })
    }
  });
}

/**
 * Async handler wrapper to catch async/await errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped middleware function
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

/**
 * Create a custom error class
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Custom error code
 * @param {Object} details - Additional error details
 * @returns {Error} Custom error object
 */
function createError(message, statusCode = 500, code, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  error.details = details;
  return error;
}

// Common error types
class ValidationError extends Error {
  constructor(message = 'Validation Error', details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource Not Found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class RateLimitExceededError extends Error {
  constructor(message = 'Too Many Requests') {
    super(message);
    this.name = 'RateLimitExceeded';
    this.statusCode = 429;
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  createError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitExceededError
};
