const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');
const db = require('../db');

/**
 * GET /api/files/tree
 * Get file tree starting from the specified root directory
 */
router.get('/tree', asyncHandler(async (req, res) => {
  const root = req.query.root || path.join(config.rootDir, 'docs');
  
  try {
    // Check if root directory exists and is accessible
    try {
      await fs.access(root, fs.constants.R);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError('Root directory not found');
      }
      throw new ForbiddenError('Access to directory denied');
    }
    
    // Get file tree
    const tree = await getFileTree(root);
    res.json(tree);
    
  } catch (error) {
    logger.error('Error getting file tree', {
      error: error.message,
      stack: error.stack,
      root
    });
    throw error; // Let the error handler take care of it
  }
}));

/**
 * GET /api/files/content
 * Get file content
 */
router.get('/content', asyncHandler(async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    throw new Error('Missing file path');
  }
  
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(config.rootDir, filePath);
  
  try {
    // Security check: prevent directory traversal
    if (!absPath.startsWith(config.rootDir)) {
      throw new ForbiddenError('Access denied');
    }
    
    // Check if file exists and is accessible
    try {
      await fs.access(absPath, fs.constants.R);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError('File not found');
      }
      throw new ForbiddenError('Access to file denied');
    }
    
    // Get file stats
    const stats = await fs.stat(absPath);
    if (stats.isDirectory()) {
      throw new Error('Path is a directory');
    }
    
    // Set appropriate headers
    const ext = path.extname(absPath).toLowerCase();
    const contentType = getContentType(ext) || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(absPath)}"`);
    
    // Stream the file
    const stream = require('fs').createReadStream(absPath);
    stream.pipe(res);
    
    // Handle stream errors
    stream.on('error', (streamErr) => {
      logger.error('Error streaming file', {
        path: absPath,
        error: streamErr.message,
        stack: streamErr.stack
      });
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      } else {
        res.end();
      }
    });
    
  } catch (error) {
    logger.error('Error getting file content', {
      path: absPath,
      error: error.message,
      stack: error.stack
    });
    throw error; // Let the error handler take care of it
  }
}));

/**
 * Helper function to get file tree recursively
 */
async function getFileTree(dir, relativePath = '') {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const result = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      try {
        const stats = await fs.stat(fullPath);
        
        if (entry.isDirectory()) {
          // Recursively get directory contents
          const children = await getFileTree(fullPath, relPath);
          result.push({
            type: 'directory',
            name: entry.name,
            path: relPath,
            children,
            size: stats.size,
            modified: stats.mtime
          });
        } else {
          // Add file entry
          result.push({
            type: 'file',
            name: entry.name,
            path: relPath,
            size: stats.size,
            modified: stats.mtime,
            extension: path.extname(entry.name).toLowerCase().substring(1)
          });
        }
      } catch (err) {
        logger.warn(`Skipping ${fullPath}: ${err.message}`);
        // Skip files/directories we can't access
        continue;
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Error reading directory', {
      dir,
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to read directory: ${dir}`);
  }
}

/**
 * Helper function to get content type from file extension
 */
function getContentType(ext) {
  const mimeTypes = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.epub': 'application/epub+zip',
    '.mobi': 'application/x-mobipocket-ebook',
    '.azw3': 'application/vnd.amazon.ebook',
    '.cbr': 'application/x-cbr',
    '.cbz': 'application/x-cbz',
  };
  
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

module.exports = router;
