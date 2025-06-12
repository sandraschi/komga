const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');
const db = require('../db');

/**
 * GET /api/meta
 * Get file metadata
 */
router.get('/', asyncHandler(async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    throw new ValidationError('Missing file path parameter');
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.join(config.rootDir, filePath);
  
  try {
    // Security check: prevent directory traversal
    if (!absPath.startsWith(config.rootDir)) {
      throw new Error('Access denied');
    }

    // Check if file exists and is accessible
    let stats;
    try {
      stats = await fs.stat(absPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError('File not found');
      }
      throw new Error(`Error accessing file: ${err.message}`);
    }

    // Get metadata from database if available
    let dbMeta = null;
    try {
      dbMeta = await db.get(
        'SELECT * FROM file_meta WHERE file_path = ?',
        [path.relative(config.rootDir, absPath)]
      );
    } catch (err) {
      logger.warn('Error getting metadata from database', {
        path: absPath,
        error: err.message
      });
      // Continue with default metadata if database query fails
    }

    // Default metadata based on file stats
    const defaultMeta = {
      file_path: path.relative(config.rootDir, absPath),
      name: path.basename(absPath),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      type: stats.isDirectory() ? 'directory' : 'file',
      extension: stats.isFile() ? path.extname(absPath).toLowerCase().substring(1) : undefined,
      tags: [],
      starred: false,
      comments: []
    };

    // Merge with database metadata if available
    const metadata = dbMeta ? {
      ...defaultMeta,
      ...dbMeta,
      tags: dbMeta.tags ? JSON.parse(dbMeta.tags) : [],
      comments: dbMeta.comments ? JSON.parse(dbMeta.comments) : [],
      starred: Boolean(dbMeta.starred)
    } : defaultMeta;

    res.json(metadata);

  } catch (error) {
    logger.error('Error getting file metadata', {
      path: absPath,
      error: error.message,
      stack: error.stack
    });
    throw error; // Let the error handler take care of it
  }
}));

/**
 * POST /api/meta
 * Update file metadata
 */
router.post('/', asyncHandler(async (req, res) => {
  const { file_path, tags, starred, comments } = req.body;
  
  if (!file_path) {
    throw new ValidationError('Missing file_path in request body');
  }

  const absPath = path.isAbsolute(file_path) ? file_path : path.join(config.rootDir, file_path);
  
  try {
    // Security check: prevent directory traversal
    if (!absPath.startsWith(config.rootDir)) {
      throw new Error('Access denied');
    }

    // Check if file exists and is accessible
    try {
      await fs.access(absPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError('File not found');
      }
      throw new Error(`Error accessing file: ${err.message}`);
    }

    const relPath = path.relative(config.rootDir, absPath);
    const now = new Date();

    // Prepare metadata to update
    const updateData = {
      file_path: relPath,
      updated_at: now
    };

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(Array.isArray(tags) ? tags : []);
    }

    if (starred !== undefined) {
      updateData.starred = starred ? 1 : 0;
    }

    if (comments !== undefined) {
      updateData.comments = JSON.stringify(Array.isArray(comments) ? comments : []);
    }

    // Update or insert metadata
    const columns = Object.keys(updateData);
    const placeholders = columns.map(() => '?').join(',');
    const values = columns.map(col => updateData[col]);
    
    const updateSet = columns.map(col => `${col} = ?`).join(',');
    
    // Add values again for the ON CONFLICT UPDATE part
    values.push(...Object.values(updateData));
    
    const sql = `
      INSERT INTO file_meta (${columns.join(',')}) 
      VALUES (${placeholders})
      ON CONFLICT(file_path) DO UPDATE SET ${updateSet}
    `;

    await db.run(sql, values);

    // Get updated metadata
    const updatedMeta = await db.get(
      'SELECT * FROM file_meta WHERE file_path = ?',
      [relPath]
    );

    // Format response
    const response = {
      ...updatedMeta,
      tags: updatedMeta.tags ? JSON.parse(updatedMeta.tags) : [],
      comments: updatedMeta.comments ? JSON.parse(updatedMeta.comments) : [],
      starred: Boolean(updatedMeta.starred)
    };

    res.json(response);

  } catch (error) {
    logger.error('Error updating file metadata', {
      path: absPath,
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    throw error; // Let the error handler take care of it
  }
}));

/**
 * DELETE /api/meta
 * Delete file metadata
 */
router.delete('/', asyncHandler(async (req, res) => {
  const { file_path } = req.body;
  
  if (!file_path) {
    throw new ValidationError('Missing file_path in request body');
  }

  const absPath = path.isAbsolute(file_path) ? file_path : path.join(config.rootDir, file_path);
  
  try {
    // Security check: prevent directory traversal
    if (!absPath.startsWith(config.rootDir)) {
      throw new Error('Access denied');
    }

    const relPath = path.relative(config.rootDir, absPath);
    
    // Delete metadata from database
    const result = await db.run(
      'DELETE FROM file_meta WHERE file_path = ?',
      [relPath]
    );

    if (result.changes === 0) {
      throw new NotFoundError('No metadata found for the specified file');
    }

    res.json({ success: true, message: 'Metadata deleted successfully' });

  } catch (error) {
    logger.error('Error deleting file metadata', {
      path: absPath,
      error: error.message,
      stack: error.stack
    });
    throw error; // Let the error handler take care of it
  }
}));

module.exports = router;
