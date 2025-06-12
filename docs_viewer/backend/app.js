const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import config and logger early to ensure they're loaded first
const config = require('./config');
const logger = require('./utils/logger');
const db = require('./db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const apiRoutes = require('./routes');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.security.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Increase timeout for long-polling or fallback scenarios
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Trust proxy if behind a reverse proxy (e.g., Nginx)
app.set('trust proxy', 1);

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// CORS configuration
app.use(cors({
  origin: config.security.cors.origin,
  methods: config.security.cors.methods,
  allowedHeaders: config.security.cors.allowedHeaders,
  credentials: config.security.cors.credentials,
  exposedHeaders: ['Content-Disposition'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many requests, please try again later.',
        status: 429,
      },
    });
  },
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Logging middleware (HTTP requests)
app.use(morgan('combined', { 
  stream: { write: (message) => logger.http(message.trim()) } 
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiRoutes);

// Serve static files from the frontend build directory
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
if (require('fs').existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  
  // Handle SPA routing - serve index.html for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New client connected', { socketId: socket.id });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
  
  // Handle custom events here
  socket.on('join', (room) => {
    socket.join(room);
    logger.debug(`Socket ${socket.id} joined room ${room}`);
  });
  
  socket.on('leave', (room) => {
    socket.leave(room);
    logger.debug(`Socket ${socket.id} left room ${room}`);
  });
  
  // Error handling for socket
  socket.on('error', (error) => {
    logger.error('Socket error', { 
      socketId: socket.id, 
      error: error.message, 
      stack: error.stack 
    });
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  // Consider restarting the process in production
  if (config.isProduction) {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { 
    error: error.message, 
    stack: error.stack 
  });
  // Consider restarting the process in production
  if (config.isProduction) {
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  try {
    // Close the HTTP server
    await new Promise((resolve) => {
      httpServer.close((err) => {
        if (err) {
          logger.error('Error closing HTTP server', { error: err.message });
        } else {
          logger.info('HTTP server closed');
        }
        resolve();
      });
    });
    
    // Close database connections
    await db.close();
    
    // Close any other resources here
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { 
      error: error.message, 
      stack: error.stack 
    });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Export the app and server for testing
module.exports = { 
  app, 
  httpServer,
  start: async (port = config.port) => {
    try {
      // Initialize database
      await db.initDB();
      
      // Start the server
      await new Promise((resolve) => {
        httpServer.listen(port, '0.0.0.0', () => {
          logger.info(`Server is running on port ${port}`);
          logger.info(`Environment: ${config.nodeEnv}`);
          logger.info(`Documentation: http://localhost:${port}/docs`);
          resolve();
        });
      });
      
      return httpServer;
    } catch (error) {
      logger.error('Failed to start server', { 
        error: error.message, 
        stack: error.stack 
      });
      await shutdown();
      throw error;
    }
  },
};
