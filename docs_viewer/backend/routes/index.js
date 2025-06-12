const express = require('express');
const router = express.Router();
const path = require('path');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Import route modules
const fileRoutes = require('./file.routes');
const metaRoutes = require('./meta.routes');
const llmRoutes = require('./llm.routes');
const ragRoutes = require('./rag.routes');
const uploadRoutes = require('./upload.routes');
const teamsRoutes = require('./teams.routes');
const logRoutes = require('./log.routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: require('../../package.json').version || 'unknown'
  });
});

// API routes
router.use('/files', fileRoutes);
router.use('/meta', metaRoutes);
router.use('/llm', llmRoutes);
router.use('/rag', ragRoutes);
router.use('/upload', uploadRoutes);
router.use('/teams', teamsRoutes);
router.use('/logs', logRoutes);

// 404 handler for API routes
router.use((req, res, next) => {
  res.status(404).json({
    error: {
      message: 'API endpoint not found',
      path: req.path,
      method: req.method
    }
  });
});

// Error handler for API routes
router.use((err, req, res, next) => {
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    params: req.params,
    query: req.query,
    body: req.body,
  });

  // Default error status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Only include stack trace in development
  const errorResponse = {
    error: {
      message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  res.status(statusCode).json(errorResponse);
});

module.exports = router;
