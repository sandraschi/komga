const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');
const { fileService } = require('../services');
const db = require('../db');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Create uploads directory if it doesn't exist
      await fs.mkdir(config.uploadsDir, { recursive: true });
      cb(null, config.uploadsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter to check file types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = require('mime-types').lookup(ext) || 'application/octet-stream';
  
  if (config.fileProcessing.allowedMimeTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`File type '${mimeType}' is not allowed`), false);
  }
};

// Configure multer with limits and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.fileProcessing.maxFileSize,
  },
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     description: Upload a file to the server
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Invalid file type or no file provided
 *       500:
 *         description: Server error
 */
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }
  
  try {
    // Use fileService to handle the file upload
    const uploadedFile = await fileService.uploadFile(req.file);
    
    logger.info(`File uploaded successfully: ${uploadedFile.originalName} (${uploadedFile.id})`, {
      fileId: uploadedFile.id,
      originalName: uploadedFile.originalName,
      size: uploadedFile.size,
      mimeType: uploadedFile.mimeType,
    });
    
    res.status(201).json(uploadedFile);
    
  } catch (error) {
    logger.error('Error processing file upload', {
      originalName: req.file?.originalname,
      error: error.message,
      stack: error.stack,
    });
    
    throw error;
  }
}));

/**
 * @swagger
 * /api/upload:
 *   get:
 *     summary: List all uploaded files
 *     description: Get a paginated list of uploaded files
 *     tags: [Files]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (uploaded, processing, processed, error)
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *         description: Filter by MIME type
 *     responses:
 *       200:
 *         description: List of files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    mimeType,
    sortBy = 'uploadDate',
    sortOrder = 'desc'
  } = req.query;
  
  const result = await fileService.listFiles({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    status,
    mimeType,
    sortBy,
    sortOrder
  });
  
  res.json(result);
}));

/**
 * @swagger
 * /api/upload/{id}:
 *   get:
 *     summary: Get file by ID
 *     description: Get file details by ID
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       404:
 *         description: File not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = await fileService.getFileById(id);
  res.json(file);
}));

/**
 * @swagger
 * /api/upload/{id}/content:
 *   get:
 *     summary: Download file content
 *     description: Download the actual file content by ID
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 */
router.get('/:id/content', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const file = await fileService.getFileById(id);
    
    // Check if file exists on disk
    try {
      await fs.access(file.filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundError('File not found on disk');
      }
      throw error;
    }
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.size);
    
    // Stream the file
    const fileStream = require('fs').createReadStream(file.filePath);
    fileStream.pipe(res);
    
    // Handle stream errors
    fileStream.on('error', (error) => {
      logger.error('Error streaming file', {
        fileId: id,
        error: error.message,
        stack: error.stack,
      });
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });
    
  } catch (error) {
    logger.error('Error getting file content', {
      fileId: id,
      error: error.message,
      stack: error.stack,
    });
    
    throw error;
  }
}));

/**
 * @swagger
 * /api/upload/{id}:
 *   delete:
 *     summary: Delete a file
 *     description: Delete a file by ID
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: File not found
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await fileService.deleteFile(id);
  
  res.json({
    success: true,
    message: 'File deleted successfully',
  });
}));

// Helper functions have been moved to fileService
// Using fileService's formatFileResponse instead


router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const file = await db.get(
    'SELECT * FROM files WHERE id = ?',
    [id]
  );
  
  if (!file) {
    throw new NotFoundError('File not found');
  }
  
  res.json({
    id: file.id,
    originalName: file.original_name,
    fileName: file.file_name,
    filePath: file.file_path,
    mimeType: file.mime_type,
    size: file.size,
    status: file.status,
    uploadDate: file.upload_date,
    lastModified: file.last_modified,
    metadata: file.metadata || {},
    url: `/api/upload/${file.id}/content`
  });
}));

/**
 * GET /api/upload
 * List all uploads with pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    sortBy = 'upload_date', 
    sortOrder = 'DESC',
    status,
    mimeType,
  } = req.query;
  
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
  
  res.json({
    data: files.map(file => fileService._formatFileResponse(file)),
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
  });
}));

/**
 * DELETE /api/upload/:id
 * Delete an uploaded file
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
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
  
  res.json({
    success: true,
    message: 'File deleted successfully',
  });
}));

/**
 * Process an uploaded file based on its type
 */
async function processUploadedFile(fileId, filePath, mimeType) {
  try {
    // Update status to processing
    await db.run(
      'UPDATE files SET status = ? WHERE id = ?',
      ['processing', fileId]
    );
    
    // Process based on file type
    if (mimeType.startsWith('image/')) {
      await processImageFile(fileId, filePath);
    } else if (mimeType === 'application/pdf') {
      await processPdfFile(fileId, filePath);
    } else if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) {
      await processOfficeDocument(fileId, filePath, mimeType);
    } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      await processTextFile(fileId, filePath);
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
 */
async function processImageFile(fileId, filePath) {
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
 */
async function processPdfFile(fileId, filePath) {
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
 * Process an Office document (Word, Excel, PowerPoint)
 */
async function processOfficeDocument(fileId, filePath, mimeType) {
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
 */
async function processTextFile(fileId, filePath) {
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
 * Format file response with additional metadata
 * This function is now in fileService
 */
// Using fileService's formatFileResponse instead

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the file
 *         originalName:
 *           type: string
 *           description: Original name of the uploaded file
 *         fileName:
 *           type: string
 *           description: Generated file name on the server
 *         filePath:
 *           type: string
 *           description: Full path to the file on the server
 *         mimeType:
 *           type: string
 *           description: MIME type of the file
 *         size:
 *           type: integer
 *           format: int64
 *           description: File size in bytes
 *         status:
 *           type: string
 *           enum: [uploaded, processing, processed, error]
 *           description: Current processing status of the file
 *         uploadDate:
 *           type: string
 *           format: date-time
 *           description: When the file was uploaded
 *         lastModified:
 *           type: string
 *           format: date-time
 *           description: When the file was last modified
 *         url:
 *           type: string
 *           description: URL to access the file content
 *         downloadUrl:
 *           type: string
 *           description: URL to download the file
 *         metadata:
 *           type: object
 *           additionalProperties: true
 *           description: Additional metadata about the file
 * 
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           description: Current page number
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *         total:
 *           type: integer
 *           description: Total number of items
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 */

module.exports = router;
