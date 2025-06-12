#!/usr/bin/env node

/**
 * Entry point for the Docs Viewer backend server
 */

const { start } = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

// Handle uncaught exceptions (should be at the very top)
process.on('uncaughtException', (error) => {
  logger.error('FATAL - Uncaught Exception:', { 
    error: error.message, 
    stack: error.stack 
  });
  // Let's give the logger time to write before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Start the server
(async () => {
  try {
    logger.info('Starting Docs Viewer backend...');
    
    // Start the server
    await start();
    
  } catch (error) {
    logger.error('FATAL - Failed to start server', { 
      error: error.message, 
      stack: error.stack 
    });
    process.exit(1);
  }
})();

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { reason });
  console.error('Unhandled Rejection at:', promise, 'Reason:', reason);
  // Let's give the logger time to write before exiting
  setTimeout(() => process.exit(1), 1000);
  logger.error('Unhandled Rejection at:', { 
    promise, 
    reason: reason instanceof Error ? reason.stack : reason 
  });
  // Consider restarting the process in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
