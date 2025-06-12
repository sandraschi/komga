const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * GET /api/logs
 * Get the last N lines from the combined log file
 */
router.get('/', asyncHandler(async (req, res) => {
  const lines = parseInt(req.query.lines) || 500;
  const logPath = path.join(__dirname, '../../logs/combined.log');
  
  try {
    // Check if log file exists
    try {
      await fs.access(logPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Log file not found' });
      }
      throw err;
    }
    
    // Read the log file
    let content = await fs.readFile(logPath, 'utf8');
    
    // Get last N lines
    const allLines = content.split('\n');
    const lastLines = allLines.slice(-lines).join('\n');
    
    res.type('text/plain').send(lastLines);
  } catch (error) {
    logger.error('Error reading log file', {
      error: error.message,
      stack: error.stack,
      path: logPath
    });
    throw error;
  }
}));

module.exports = router;
