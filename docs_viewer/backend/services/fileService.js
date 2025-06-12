const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');
const db = require('../db');

class FileService {
  /**
   * Get a file by its ID
   * @param {string} id - The ID of the file to retrieve
   * @returns {Promise<Object>} The file object
   * @throws {NotFoundError} If the file is not found
   */
  async getFileById(id) {
    try {
      logger.debug('Retrieving file by ID', { fileId: id });
      
      // Query the database for the file
      const file = await db.get(
        'SELECT * FROM files WHERE id = ?',
        [id]
      );
      
      if (!file) {
        throw new NotFoundError(`File with ID ${id} not found`);
      }
      
      // Format the response
      const result = {
        id: file.id,
        originalName: file.original_name,
        fileName: file.file_name,
        filePath: file.file_path,
        mimeType: file.mime_type,
        size: file.size,
        status: file.status,
        uploadDate: file.upload_date,
        lastModified: file.last_modified || file.upload_date,
        metadata: file.metadata ? JSON.parse(file.metadata) : {}
      };
      
      // Ensure filePath is an absolute path
      if (result.filePath && !path.isAbsolute(result.filePath)) {
        result.filePath = path.join(config.uploadsDir, result.filePath);
      }
      
      logger.debug('Retrieved file', { fileId: id, filePath: result.filePath });
      return result;
      
    } catch (error) {
      logger.error('Error getting file by ID', { 
        fileId: id, 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }
  
  /**
  /**
   * Get file tree starting from the specified root directory
   * @param {string} root - Root directory path
   * @returns {Promise<Array>} File tree
   */
  async getFileTree(root) {
    try {
      // Check if root directory exists and is accessible
      await this._checkFileAccess(root);
      
      // Get file tree
      return await this._buildFileTree(root);
    } catch (error) {
      logger.error('Error getting file tree', {
        root,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get file content
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} File metadata and content stream
   */
  async getFileContent(filePath) {
    const absPath = this._resolvePath(filePath);
    
    try {
      // Security check and get file stats
      const stats = await this._getFileStats(absPath);
      
      if (stats.isDirectory()) {
        throw new Error('Path is a directory');
      }
      
      // Get file metadata from database if available
      const metadata = await this._getFileMetadata(absPath);
      
      // Create read stream
      const stream = require('fs').createReadStream(absPath);
      
      // Get content type
      const ext = path.extname(absPath).toLowerCase();
      const contentType = this._getContentType(ext) || 'application/octet-stream';
      
      return {
        stats,
        stream,
        metadata,
        contentType,
        fileName: path.basename(absPath),
      };
      
    } catch (error) {
      logger.error('Error getting file content', {
        filePath: absPath,
        error: error.message,
        stack: error.stack,
      });
      
      if (error.code === 'ENOENT') {
        throw new NotFoundError('File not found');
      } else if (error.code === 'EACCES') {
        throw new ValidationError('Access denied');
      }
      
      throw error;
    }
  }

  /**
   * Upload a file
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} Uploaded file details
   */
  async uploadFile(file) {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }
    
    const { originalname, filename, path: filepath, size, mimetype } = file;
    const fileId = uuidv4();
    const now = new Date();
    
    try {
      // Get file stats
      const stats = await fs.stat(filepath);
      
      // Save file metadata to database
      const result = await db.run(
        `INSERT INTO files (
          id, original_name, file_name, file_path, mime_type, size, 
          upload_date, last_modified, status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          originalname,
          filename,
          filepath,
          mimetype,
          size,
          now.toISOString(),
          stats.mtime.toISOString(),
          'uploaded',
          JSON.stringify({
            encoding: file.encoding,
            fieldname: file.fieldname,
          }),
        ]
      );
      
      logger.info(`File uploaded successfully: ${originalname} (${fileId})`, {
        fileId,
        originalName: originalname,
        size,
        mimeType: mimetype,
      });
      
      // Process the file based on its type
      await this._processUploadedFile(fileId, filepath, mimetype);
      
      // Get the updated file record
      const fileRecord = await this.getFileById(fileId);
      
      return fileRecord;
      
    } catch (error) {
      // Clean up the uploaded file if there was an error
      try {
        await fs.unlink(filepath);
      } catch (cleanupError) {
        logger.error('Failed to clean up uploaded file after error', {
          filepath,
          error: cleanupError.message,
        });
      }
      
      logger.error('Error processing file upload', {
        originalName: originalname,
        error: error.message,
        stack: error.stack,
      });
      
      throw error;
    }
  }

  /**
   * Get file by ID
   * @param {string} id - File ID
   * @returns {Promise<Object>} File details
   */
  async getFileById(id) {
    const file = await db.get(
      'SELECT * FROM files WHERE id = ?',
      [id]
    );
    
    if (!file) {
      throw new NotFoundError('File not found');
    }
    
    return this._formatFileResponse(file);
  }

  /**
   * List files with pagination
   * @param {Object} options - Pagination and filtering options
   * @returns {Promise<Object>} Paginated list of files
   */
  async listFiles({
    page = 1,
    limit = 20,
    sortBy = 'upload_date',
    sortOrder = 'DESC',
    status,
    mimeType,
  } = {}) {
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const validSortFields = ['upload_date', 'original_name', 'size', 'mime_type', 'status'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'upload_date';
    const sortDir = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    // Build the query
    let query = 'SELECT * FROM files';
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (mimeType) {
      conditions.push('mime_type LIKE ?');
      params.push(`%${mimeType}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Add sorting and pagination
    query += ` ORDER BY ${sortField} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM files';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const [files, countResult] = await Promise.all([
      db.all(query, params),
      db.get(countQuery, params.slice(0, -2)), // Remove limit and offset for count
    ]);
    
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: files.map(this._formatFileResponse),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
      },
      sort: {
        by: sortField,
        order: sortDir,
      },
    };
  }

  /**
   * Delete a file
   * @param {string} id - File ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(id) {
    // Get the file record first
    const file = await db.get(
      'SELECT * FROM files WHERE id = ?',
      [id]
    );
    
    if (!file) {
      throw new NotFoundError('File not found');
    }
    
    // Delete the file from disk
    try {
      await fs.unlink(file.file_path);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // Only log error if it's not a "file not found" error
        logger.error('Failed to delete file from disk', {
          fileId: id,
          filePath: file.file_path,
          error: error.message,
        });
        // Continue with database deletion even if file deletion fails
      }
    }
    
    // Delete the record from the database
    await db.run(
      'DELETE FROM files WHERE id = ?',
      [id]
    );
    
    logger.info(`File deleted: ${file.original_name} (${id})`, {
      fileId: id,
      originalName: file.original_name,
    });
    
    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  /**
   * Process an uploaded file based on its type
   * @private
   */
  async _processUploadedFile(fileId, filePath, mimeType) {
    try {
      // Update status to processing
      await db.run(
        'UPDATE files SET status = ? WHERE id = ?',
        ['processing', fileId]
      );
      
      // Process based on file type
      if (mimeType.startsWith('image/')) {
        await this._processImageFile(fileId, filePath);
      } else if (mimeType === 'application/pdf') {
        await this._processPdfFile(fileId, filePath);
      } else if (mimeType.includes('document') || mimeType.includes('word') || 
                mimeType.includes('excel') || mimeType.includes('powerpoint')) {
        await this._processOfficeDocument(fileId, filePath, mimeType);
      } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        await this._processTextFile(fileId, filePath);
      }
      
      // Update status to processed
      await db.run(
        'UPDATE files SET status = ? WHERE id = ?',
        ['processed', fileId]
      );
      
    } catch (error) {
      logger.error(`Error processing file ${fileId}`, {
        fileId,
        filePath,
        mimeType,
        error: error.message,
        stack: error.stack,
      });
      
      // Update status to error
      await db.run(
        'UPDATE files SET status = ?, error = ? WHERE id = ?',
        ['error', error.message, fileId]
      );
      
      throw error;
    }
  }

  /**
   * Process an image file
   * @private
   */
  async _processImageFile(fileId, filePath) {
    // In a real implementation, you might:
    // 1. Generate thumbnails
    // 2. Extract EXIF data
    // 3. Run image recognition
    
    logger.debug(`Processing image file: ${filePath}`, { fileId });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update file metadata with processing results
    await db.run(
      'UPDATE files SET metadata = json_set(metadata, ?) WHERE id = ?',
      [JSON.stringify({
        processed: true,
        type: 'image',
        processedAt: new Date().toISOString(),
      }), fileId]
    );
  }

  /**
   * Process a PDF file
   * @private
   */
  async _processPdfFile(fileId, filePath) {
    // In a real implementation, you might:
    // 1. Extract text content
    // 2. Extract metadata
    // 3. Generate preview images
    
    logger.debug(`Processing PDF file: ${filePath}`, { fileId });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update file metadata with processing results
    await db.run(
      'UPDATE files SET metadata = json_set(metadata, ?) WHERE id = ?',
      [JSON.stringify({
        processed: true,
        type: 'document',
        format: 'pdf',
        processedAt: new Date().toISOString(),
      }), fileId]
    );
  }

  /**
   * Process an Office document
   * @private
   */
  async _processOfficeDocument(fileId, filePath, mimeType) {
    // In a real implementation, you might:
    // 1. Convert to text or HTML
    // 2. Extract metadata
    // 3. Generate previews
    
    logger.debug(`Processing Office document: ${filePath}`, { fileId, mimeType });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Determine document type
    let docType = 'document';
    if (mimeType.includes('spreadsheet')) docType = 'spreadsheet';
    if (mimeType.includes('presentation')) docType = 'presentation';
    
    // Update file metadata with processing results
    await db.run(
      'UPDATE files SET metadata = json_set(metadata, ?) WHERE id = ?',
      [JSON.stringify({
        processed: true,
        type: docType,
        format: mimeType.split('.').pop(),
        processedAt: new Date().toISOString(),
      }), fileId]
    );
  }

  /**
   * Process a text file
   * @private
   */
  async _processTextFile(fileId, filePath) {
    // In a real implementation, you might:
    // 1. Extract metadata
    // 2. Index content for search
    // 3. Parse structured data if applicable
    
    logger.debug(`Processing text file: ${filePath}`, { fileId });
    
    // Read the file content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Update file metadata with processing results
    await db.run(
      'UPDATE files SET metadata = json_set(metadata, ?) WHERE id = ?',
      [JSON.stringify({
        processed: true,
        type: 'text',
        lines: content.split('\n').length,
        words: content.split(/\s+/).length,
        characters: content.length,
        processedAt: new Date().toISOString(),
      }), fileId]
    );
  }

  /**
   * Build a file tree recursively
   * @private
   */
  async _buildFileTree(dir, relativePath = '') {
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
            const children = await this._buildFileTree(fullPath, relPath);
            result.push({
              type: 'directory',
              name: entry.name,
              path: relPath,
              children,
              size: stats.size,
              modified: stats.mtime,
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
        stack: error.stack,
      });
      throw new Error(`Failed to read directory: ${dir}`);
    }
  }

  /**
   * Check if a file exists and is accessible
   * @private
   */
  async _checkFileAccess(filePath) {
    try {
      await fs.access(filePath, fs.constants.R);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundError('File or directory not found');
      } else if (error.code === 'EACCES') {
        throw new ValidationError('Access denied');
      }
      throw error;
    }
  }

  /**
   * Get file stats
   * @private
   */
  async _getFileStats(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundError('File not found');
      }
      throw error;
    }
  }

  /**
   * Get file metadata from database
   * @private
   */
  async _getFileMetadata(filePath) {
    try {
      const relPath = path.relative(config.rootDir, filePath);
      const meta = await db.get(
        'SELECT * FROM file_meta WHERE file_path = ?',
        [relPath]
      );
      
      if (!meta) return null;
      
      return {
        ...meta,
        tags: meta.tags ? JSON.parse(meta.tags) : [],
        comments: meta.comments ? JSON.parse(meta.comments) : [],
        starred: Boolean(meta.starred),
      };
    } catch (error) {
      logger.warn('Error getting file metadata', {
        filePath,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Resolve a file path to an absolute path
   * @private
   */
  _resolvePath(filePath) {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(config.rootDir, filePath);
    
    // Security check: prevent directory traversal
    if (!absPath.startsWith(config.rootDir)) {
      throw new ValidationError('Access denied');
    }
    
    return absPath;
  }

  /**
   * Get content type from file extension
   * @private
   */
  _getContentType(ext) {
    return mime.lookup(ext) || 'application/octet-stream';
  }

  /**
   * Format file response with additional metadata
   * @private
   */
  _formatFileResponse(file) {
    if (!file) return null;
    
    const metadata = typeof file.metadata === 'string' 
      ? JSON.parse(file.metadata || '{}') 
      : file.metadata || {};
    
    return {
      id: file.id,
      originalName: file.original_name,
      fileName: file.file_name,
      filePath: file.file_path,
      mimeType: file.mime_type,
      size: file.size,
      status: file.status,
      uploadDate: file.upload_date,
      lastModified: file.last_modified,
      url: `/api/upload/${file.id}/content`,
      metadata,
    };
  }
}

module.exports = new FileService();
