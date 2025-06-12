const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
require('fs').mkdirSync(logDir, { recursive: true });

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'docs-viewer' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add a stream for morgan logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Helper function to log errors with context
logger.logError = (error, context = {}) => {
  const { message, stack } = error;
  logger.error(message, { 
    ...context,
    stack,
    errorName: error.name,
    ...(error.response && { 
      responseStatus: error.response.status,
      responseData: error.response.data 
    })
  });
};

// Helper function to log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { 
    promise, 
    reason: reason instanceof Error ? reason.stack : reason 
  });
});

// Helper function to log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.logError(error, { type: 'uncaughtException' });
  // Don't exit immediately, give time for logs to be written
  setTimeout(() => process.exit(1), 1000);
});

module.exports = logger;
