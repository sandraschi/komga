const express = require('express');
const cors = require('cors');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const mime = require('mime-types');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { ChromaClient } = require('chromadb');
const { encoding_for_model } = require('@dqbd/tiktoken');
const multer = require('multer');
const epubParser = require('epub-parser');
const moment = require('moment-timezone');
const { Client } = require('@microsoft/microsoft-graph-client');

// Initialize Calibre DB connection if needed
let calibreDb = null;

const app = express();
const PORT = process.env.PORT || 5174;

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Created logs directory at ${logsDir}`);
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

// Logger setup with enhanced error handling
let logger;
try {
  logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({
        format: () => moment().tz('Europe/Berlin').format('YYYY-MM-DD HH:mm:ss')
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: 'docs-viewer-backend' },
    transports: [
      new winston.transports.File({ 
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({ 
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
    ]
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
  
  logger.info('Logger initialized successfully');
} catch (err) {
  // Fallback to console if logger initialization fails
  console.error('Failed to initialize logger:', err);
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
  };
  logger.error('Using fallback console logger');
}

// SQLite setup with enhanced error handling
const sqlite3 = require('sqlite3').verbose();

// Create database connection with error handling
let db;
try {
  db = new sqlite3.Database(
    './docs_viewer.sqlite',
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {
      if (err) {
        logger.error('Failed to connect to SQLite database', { error: err.message, stack: err.stack });
        process.exit(1);
      }
      logger.info('Successfully connected to SQLite database');
    }
  );

  // Enable WAL mode for better concurrency
  db.configure('busyTimeout', 5000);
  db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA synchronous = NORMAL;');
  });
} catch (err) {
  logger.error('Failed to initialize SQLite database', { error: err.message, stack: err.stack });
  process.exit(1);
}

// Helper function to execute SQL queries with error handling
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    db.run(sql, params, function(err) {
      const duration = Date.now() - startTime;
      if (err) {
        logger.error('Database query failed', {
          sql,
          params,
          error: err.message,
          duration: `${duration}ms`,
          stack: err.stack
        });
        return reject(err);
      }
      logger.debug('Database query executed', {
        sql,
        params,
        duration: `${duration}ms`,
        changes: this.changes,
        lastID: this.lastID
      });
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
};

// Helper function for SELECT queries
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    db.get(sql, params, (err, row) => {
      const duration = Date.now() - startTime;
      if (err) {
        logger.error('Database query failed', {
          sql,
          params,
          error: err.message,
          duration: `${duration}ms`,
          stack: err.stack
        });
        return reject(err);
      }
      logger.debug('Database query executed', {
        sql,
        params,
        duration: `${duration}ms`,
        rowsReturned: row ? 1 : 0
      });
      resolve(row);
    });
  });
};

// Helper function for SELECT queries returning multiple rows
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    db.all(sql, params, (err, rows) => {
      const duration = Date.now() - startTime;
      if (err) {
        logger.error('Database query failed', {
          sql,
          params,
          error: err.message,
          duration: `${duration}ms`,
          stack: err.stack
        });
        return reject(err);
      }
      logger.debug('Database query executed', {
        sql,
        params,
        duration: `${duration}ms`,
        rowsReturned: rows ? rows.length : 0
      });
      resolve(rows || []);
    });
  });
};

// Create tables if they don't exist
const initDb = async () => {
  try {
    logger.info('Initializing database tables...');
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS file_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        tags TEXT,
        starred INTEGER DEFAULT 0,
        comments TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (json_valid(comments) OR comments IS NULL)
      )
    `);

    // Add any missing columns without failing if they already exist
    await dbRun(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Track schema version
    const currentVersion = 1;
    const migration = await dbGet('SELECT MAX(version) as version FROM schema_migrations');
    const dbVersion = migration ? migration.version : 0;
    
    if (dbVersion < currentVersion) {
      logger.info(`Updating database schema from version ${dbVersion} to ${currentVersion}`);
      // Add future schema migrations here
      
      // Update schema version
      await dbRun('INSERT INTO schema_migrations (version) VALUES (?)', [currentVersion]);
    }
    
    logger.info('Database initialization completed successfully');
  } catch (err) {
    logger.error('Failed to initialize database', {
      error: err.message,
      stack: err.stack
    });
    throw err; // Re-throw to be handled by the caller
  }
};

// Initialize database when the server starts
(async () => {
  try {
    await initDb();
    
    // Start the server
    const PORT = process.env.PORT || 5174;
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { 
        error: error.message, 
        stack: error.stack 
      });
      process.exit(1);
    });
    
    // Handle process termination
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received. Shutting down gracefully...');
      process.exit(0);
    });
  } catch (err) {
    logger.error('Fatal error during database initialization', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  }
})();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  logger.info('Health check');
  res.json({ status: 'ok' });
});

// Helper: Recursively get file tree
function getFileTree(dir, base = dir) {
  let results = [];
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    logger.error(`[FS] Failed to read directory: ${dir} - ${e.message}`);
    return [{ type: 'error', name: `Error reading directory: ${dir}`, error: e.message }];
  }
  for (const file of files) {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      logger.error(`[FS] Failed to stat: ${filePath} - ${e.message}`);
      results.push({ type: 'error', name: `Error stat: ${filePath}`, error: e.message });
      continue;
    }
    const relPath = path.relative(base, filePath);
    if (stat && stat.isDirectory()) {
      results.push({
        type: 'folder',
        name: file,
        path: relPath,
        children: getFileTree(filePath, base)
      });
    } else {
      results.push({
        type: 'file',
        name: file,
        path: relPath
      });
    }
  }
  return results;
}

// Utility: Read Calibre library structure from metadata.db
// function getCalibreLibraryTree(dbPath) {
//   const sqlite = require('sqlite3').verbose();
//   const db = new sqlite.Database(dbPath);
//   return new Promise((resolve, reject) => {
//     // Query all books with their paths, authors, series, etc.
//     db.all(`SELECT b.id, b.title, b.path, b.rating, b.comments, b.series_index, s.name as series, a.name as author
//             FROM books b
//             LEFT JOIN books_authors_link bal ON b.id = bal.book
//             LEFT JOIN authors a ON bal.author = a.id
//             LEFT JOIN books_series_link bsl ON b.id = bsl.book
//             LEFT JOIN series s ON bsl.series = s.id`, [], (err, rows) => {
//       if (err) return reject(err);
//       // Group by author/series
//       const authors = {};
//       for (const row of rows) {
//         if (!authors[row.author]) authors[row.author] = { name: row.author, books: [] };
//         authors[row.author].books.push(row);
//       }
//       resolve({ authors: Object.values(authors), books: rows });
//     });
//   });
// }

// Utility: Read metadata for a file from Calibre metadata.db (full)
function readCalibreDbMetadata(dbPath, filePath) {
  // Comment out all duplicate declarations of sqlite/sqlite3/db except the first top-level ones
  // const sqlite = require('sqlite3').verbose();
  // const db = new sqlite.Database(dbPath);
  return new Promise((resolve, reject) => {
    // Find book by matching file path ending
    db.get(`SELECT b.id, b.title, b.path, b.rating, b.comments
            FROM books b
            WHERE ? LIKE '%' || b.path || '%'`, [filePath], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve({});
      // Get tags
      db.all(`SELECT t.name FROM tags t
              JOIN books_tags_link btl ON t.id = btl.tag
              WHERE btl.book = ?`, [row.id], (err2, tagRows) => {
        if (err2) return reject(err2);
        const tags = tagRows.map(t => t.name).join(',');
        resolve({
          tags,
          stars: row.rating ? row.rating / 2 : 0,
          comments: row.comments || '',
          title: row.title
        });
      });
    });
  });
}

// Utility: Read Calibre series and authors for a file from metadata.db
// async function readCalibreDbAdvancedMetadata(dbPath, filePath) {
//   const sqlite = require('sqlite3').verbose();
//   const db = new sqlite.Database(dbPath);
//   return new Promise((resolve, reject) => {
//     db.get(`SELECT b.id, b.title, b.path, b.rating, b.comments, s.name as series
//             FROM books b
//             LEFT JOIN books_series_link bsl ON b.id = bsl.book
//             LEFT JOIN series s ON bsl.series = s.id
//             WHERE ? LIKE '%' || b.path || '%'`, [filePath], (err, row) => {
//       if (err) return reject(err);
//       if (!row) return resolve({});
//       db.all(`SELECT a.name FROM authors a
//               JOIN books_authors_link bal ON a.id = bal.author
//               WHERE bal.book = ?`, [row.id], (err2, authorRows) => {
//         if (err2) return reject(err2);
//         const authors = authorRows.map(a => a.name);
//         resolve({
//           series: row.series || '',
//           authors,
//           title: row.title
//         });
//       });
//     });
//   });
// }

// Utility: Get cover image path for a Calibre book (support multiple formats)
function getCalibreCoverPath(bookPath, root) {
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of exts) {
    const abs = path.resolve(root, bookPath, `cover.${ext}`);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

const defaultDocsRoot = path.resolve(__dirname, '../docs');
let docsRoot = defaultDocsRoot;

// If using a CLI arg or env for docsRoot, set it here (pseudo):
// docsRoot = process.env.DOCS_ROOT || defaultDocsRoot;

// Error handling for docsRoot
if (!fs.existsSync(docsRoot) || !fs.statSync(docsRoot).isDirectory()) {
  logger.error(`[ERROR] Docs folder does not exist or is not accessible: ${docsRoot}`);
  process.exit(1);
}

// API: Get file tree
app.get('/api/tree', async (req, res) => {
  const root = req.query.root || path.resolve(__dirname, '../docs');
  logger.debug('Fetching file tree', { root });
  
  try {
    // Check if the root directory exists
    if (!fs.existsSync(root)) {
      logger.warn('Root directory not found', { root });
      return res.status(404).json({ error: 'Root directory not found' });
    }
    
    const dbPath = findCalibreDb(root);
    
    if (dbPath) {
      try {
        logger.debug('Found Calibre database, reading library', { dbPath });
        const calibreDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        
        // Helper function to get book files
        const getBookFiles = (bookId) => {
          return new Promise((resolve, reject) => {
            calibreDb.all(
              'SELECT name FROM data WHERE book = ?', 
              [bookId], 
              (err, fileRows) => {
                if (err) {
                  logger.error('Error getting book files', { bookId, error: err.message });
                  return reject(err);
                }
                resolve(fileRows.map(f => f.name));
              }
            );
          });
        };
        
        // Get all books with their metadata
        const rows = await new Promise((resolve, reject) => {
          calibreDb.all(
            `SELECT b.id, b.title, b.path, b.rating, b.comments, b.series_index, 
                    s.name as series, a.name as author
             FROM books b
             LEFT JOIN books_authors_link bal ON b.id = bal.book
             LEFT JOIN authors a ON bal.author = a.id
             LEFT JOIN books_series_link bsl ON b.id = bsl.book
             LEFT JOIN series s ON bsl.series = s.id`,
            [],
            (err, rows) => {
              if (err) {
                logger.error('Error fetching books from Calibre DB', { error: err.message });
                return reject(err);
              }
              resolve(rows || []);
            }
          );
        });
        
        // Process books in parallel
        const books = await Promise.all(rows.map(async (row) => {
          try {
            const files = await getBookFiles(row.id);
            const coverAbs = getCalibreCoverPath(row.path, root);
            
            return {
              type: 'folder',
              name: row.title,
              path: path.join(row.path, row.title),
              cover: coverAbs ? path.relative(root, coverAbs) : null,
              children: files.map(fname => ({
                type: 'file',
                name: fname,
                path: path.join(row.path, fname)
              }))
            };
          } catch (err) {
            logger.error('Error processing book', { bookId: row.id, error: err.message });
            return null;
          }
        }));
        
        // Group books by author
        const authors = {};
        books.filter(Boolean).forEach(book => {
          const author = book.author || 'Unknown Author';
          if (!authors[author]) {
            authors[author] = [];
          }
          authors[author].push(book);
        });
        
        // Convert to tree structure
        const tree = Object.entries(authors).map(([authorName, authorBooks]) => ({
          type: 'folder',
          name: authorName,
          path: authorName,
          children: authorBooks
        }));
        
        logger.debug('Successfully generated Calibre library tree', { bookCount: books.length });
        return res.json(tree);
        
      } catch (err) {
        logger.error('Error reading Calibre library', { 
          error: err.message, 
          stack: err.stack,
          dbPath 
        });
        // Fall through to regular file tree if Calibre DB fails
      } finally {
        // Close the Calibre DB connection
        if (calibreDb) {
          calibreDb.close(err => {
            if (err) {
              logger.error('Error closing Calibre database', { error: err.message });
            }
          });
        }
      }
    }
    
    // If not a Calibre library or Calibre read failed, use regular file tree
    logger.debug('Using regular file tree', { root });
    const tree = getFileTree(root);
    res.json(tree);
    
  } catch (err) {
    logger.error('Error in /api/tree', { 
      error: err.message, 
      stack: err.stack,
      root: req.query.root 
    });
    res.status(500).json({ 
      error: 'Failed to read file tree',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// API: Get file content (stream for large files)
app.get('/api/file', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    logger.warn('Missing file path in /api/file request');
    return res.status(400).json({ error: 'Missing file path' });
  }
  
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(docsRoot, filePath);
  logger.debug('Serving file', { requestedPath: filePath, absPath });
  
  try {
    // Security check: prevent directory traversal
    const normalizedPath = path.normalize(absPath);
    if (!normalizedPath.startsWith(path.normalize(docsRoot))) {
      logger.warn('Security violation: Attempted directory traversal', { 
        requestedPath: filePath, 
        absPath,
        normalizedPath,
        docsRoot
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists and is accessible
    try {
      await fs.promises.access(absPath, fs.constants.R_OK);
    } catch (accessErr) {
      if (accessErr.code === 'ENOENT') {
        logger.warn('File not found', { absPath });
        return res.status(404).json({ error: 'File not found' });
      }
      logger.error('File access error', { 
        absPath, 
        error: accessErr.message,
        code: accessErr.code 
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get file stats
    const stats = await fs.promises.stat(absPath);
    if (stats.isDirectory()) {
      logger.warn('Path is a directory', { absPath });
      return res.status(400).json({ error: 'Path is a directory' });
    }
    
    // Set appropriate headers
    const ext = path.extname(absPath).toLowerCase();
    const contentType = mime.lookup(ext) || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(absPath)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Log the file serving attempt
    logger.info('Serving file', {
      filePath: absPath,
      size: stats.size,
      contentType,
      range: req.headers.range
    });
    
    // Handle range requests for media files
    const range = req.headers.range;
    if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
      };
      
      res.writeHead(206, head);
      const stream = fs.createReadStream(absPath, { start, end });
      
      stream.on('open', () => stream.pipe(res));
      stream.on('error', (streamErr) => {
        logger.error('Stream error', { 
          absPath, 
          error: streamErr.message,
          range: { start, end }
        });
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      
    } else {
      // Regular file streaming for non-range requests
      const stream = fs.createReadStream(absPath);
      
      stream.on('open', () => stream.pipe(res));
      stream.on('error', (streamErr) => {
        logger.error('Stream error', { 
          absPath, 
          error: streamErr.message,
          stack: streamErr.stack 
        });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error reading file' });
        } else {
          res.end();
        }
      });
    }
    
    // Log when the request is closed
    req.on('close', () => {
      logger.debug('File request closed by client', { 
        absPath,
        bytesSent: res.getHeader('Content-Length'),
        statusCode: res.statusCode
      });
    });
    
  } catch (err) {
    logger.error('Error serving file', { 
      absPath, 
      error: err.message,
      stack: err.stack,
      code: err.code
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
});

// Utility: Check if a file is in a Calibre folder (has metadata.opf)
function isCalibreFolder(filePath) {
  const dir = path.dirname(filePath);
  const opfPath = path.join(dir, 'metadata.opf');
  return fs.existsSync(opfPath) ? opfPath : null;
}

// Utility: Read tags, comments, and rating from metadata.opf
function readOpfMetadata(opfPath) {
  try {
    const xml = fs.readFileSync(opfPath, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(xml);
    // Calibre OPF: tags in <dc:subject>, rating in <meta name="calibre:rating" content="3"/>
    let tags = '';
    if (Array.isArray(data.package?.metadata?.['dc:subject'])) {
      tags = data.package.metadata['dc:subject'].join(',');
    } else if (typeof data.package?.metadata?.['dc:subject'] === 'string') {
      tags = data.package.metadata['dc:subject'];
    }
    let stars = 0;
    if (Array.isArray(data.package?.metadata?.meta)) {
      for (const m of data.package.metadata.meta) {
        if (m['@_name'] === 'calibre:rating') stars = parseInt(m['@_content'], 10) / 2;
      }
    }
    const comments = data.package?.metadata?.['dc:description'] || '';
    return { tags, stars, comments };
  } catch (e) {
    logger.error('Failed to read OPF: ' + e.message);
    return {};
  }
}

// Utility: Write tags, stars, and comments to metadata.opf
function writeOpfMetadata(opfPath, { tags, stars, comments }) {
  try {
    const xml = fs.readFileSync(opfPath, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const builder = new XMLBuilder({ ignoreAttributes: false });
    let data = parser.parse(xml);
    // Update tags
    if (tags !== undefined) {
      data.package = data.package || {};
      data.package.metadata = data.package.metadata || {};
      data.package.metadata['dc:subject'] = tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    // Update stars (rating)
    if (stars !== undefined) {
      let metaArr = data.package.metadata.meta;
      if (!Array.isArray(metaArr)) metaArr = metaArr ? [metaArr] : [];
      let found = false;
      for (const m of metaArr) {
        if (m['@_name'] === 'calibre:rating') {
          m['@_content'] = String(Math.round(stars * 2));
          found = true;
        }
      }
      if (!found) {
        metaArr.push({ '@_name': 'calibre:rating', '@_content': String(Math.round(stars * 2)) });
      }
      data.package.metadata.meta = metaArr;
    }
    // Update comments
    if (comments !== undefined) {
      data.package.metadata['dc:description'] = comments;
    }
    const newXml = builder.build(data);
    fs.writeFileSync(opfPath, newXml, 'utf8');
  } catch (e) {
    logger.error('Failed to write OPF: ' + e.message);
  }
}

// Utility: Find Calibre metadata.db at or above a given path
function findCalibreDb(startPath) {
  let dir = path.resolve(startPath);
  while (dir !== path.dirname(dir)) {
    const dbPath = path.join(dir, 'metadata.db');
    if (fs.existsSync(dbPath)) return dbPath;
    dir = path.dirname(dir);
  }
  return null;
}

// API: Get file metadata (extended for series/authors)
app.get('/api/meta', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Missing file path' });
  db.get('SELECT * FROM file_meta WHERE file_path = ?', [filePath], async (err, row) => {
    if (err) {
      logger.error('DB error: ' + err.message);
      return res.status(500).json({ error: 'DB error' });
    }
    if (row && row.stars == null) row.stars = row.starred ? 5 : 0;
    const absPath = path.resolve(req.query.root || path.resolve(__dirname, '../docs'), filePath);
    const opfPath = isCalibreFolder(absPath);
    let cover = null;
    if (opfPath) {
      const opfMeta = readOpfMetadata(opfPath);
      cover = getCalibreCoverPath(path.dirname(opfPath), path.resolve(__dirname, '../docs'));
      res.json({ ...row, ...opfMeta, cover: cover ? path.relative(path.resolve(__dirname, '../docs'), cover) : null });
      return;
    }
    const dbPath = findCalibreDb(absPath);
    if (dbPath) {
      try {
        const dbMeta = await readCalibreDbMetadata(dbPath, absPath);
        // const advMeta = await readCalibreDbAdvancedMetadata(dbPath, absPath);
        cover = getCalibreCoverPath(path.dirname(absPath), path.resolve(__dirname, '../docs'));
        res.json({ ...row, ...dbMeta, cover: cover ? path.relative(path.resolve(__dirname, '../docs'), cover) : null });
        return;
      } catch (e) {
        logger.error('Failed to read Calibre DB: ' + e.message);
      }
    }
    res.json(row || {});
  });
});

// API: Update file metadata (tags, starred, comments)
app.post('/api/meta', (req, res) => {
  const { file_path, tags, starred, comments, stars } = req.body;
  if (!file_path) return res.status(400).json({ error: 'Missing file_path' });
  const starsVal = typeof stars === 'number' ? Math.max(0, Math.min(5, stars)) : (starred ? 5 : 0);
  // If Calibre folder, update OPF
  const absPath = path.resolve(req.body.root || path.resolve(__dirname, '../docs'), file_path);
  const opfPath = isCalibreFolder(absPath);
  if (opfPath) {
    writeOpfMetadata(opfPath, { tags, stars: starsVal, comments });
  }
  db.run(
    `INSERT INTO file_meta (file_path, tags, starred, comments, stars, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(file_path) DO UPDATE SET tags=excluded.tags, starred=excluded.starred, comments=excluded.comments, stars=excluded.stars, updated_at=CURRENT_TIMESTAMP`,
    [file_path, tags || '', starred ? 1 : 0, comments ? JSON.stringify(comments) : '[]', starsVal],
    function (err) {
      if (err) {
        logger.error('DB error: ' + err.message);
        return res.status(500).json({ error: 'DB error' });
      }
      logger.info(`Updated meta for ${file_path}`);
      res.json({ success: true });
    }
  );
});

// API: Search/filter files by name, tag, or metadata
app.get('/api/search', async (req, res) => {
  const { q = '', tag = '', author = '', series = '' } = req.query;
  const root = req.query.root || path.resolve(__dirname, '../docs');
  const dbPath = findCalibreDb(root);
  if (dbPath) {
    // Calibre search
    const sqlite = require('sqlite3').verbose();
    const db = new sqlite.Database(dbPath);
    let sql = `SELECT b.id, b.title, b.path, s.name as series, a.name as author
               FROM books b
               LEFT JOIN books_series_link bsl ON b.id = bsl.book
               LEFT JOIN series s ON bsl.series = s.id
               LEFT JOIN books_authors_link bal ON b.id = bal.book
               LEFT JOIN authors a ON bal.author = a.id
               WHERE 1=1`;
    const params = [];
    if (q) { sql += ' AND b.title LIKE ?'; params.push(`%${q}%`); }
    if (series) { sql += ' AND s.name LIKE ?'; params.push(`%${series}%`); }
    if (author) { sql += ' AND a.name LIKE ?'; params.push(`%${author}%`); }
    // Tags: join with tags table
    if (tag) {
      sql += ' AND b.id IN (SELECT btl.book FROM books_tags_link btl JOIN tags t ON btl.tag = t.id WHERE t.name LIKE ?)';
      params.push(`%${tag}%`);
    }
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Calibre search failed' });
      res.json(rows.map(r => ({
        file_path: path.join(r.path, r.title),
        title: r.title,
        author: r.author,
        series: r.series
      })));
    });
    return;
  }
  // Filesystem search
  db.all('SELECT * FROM file_meta', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Search failed' });
    let results = rows;
    if (q) results = results.filter(r => r.file_path.includes(q));
    if (tag) results = results.filter(r => (r.tags || '').includes(tag));
    res.json(results.map(r => ({
      file_path: r.file_path,
      tags: r.tags,
      comments: r.comments
    })));
  });
});

// --- LLM Connector Layer ---
const LLM_CONFIG = {
  ollama: { url: process.env.OLLAMA_URL || 'http://localhost:11434' },
  lmstudio: { url: process.env.LMSTUDIO_URL || 'http://localhost:1234' },
  vllm: { url: process.env.VLLM_URL || 'http://localhost:8000' },
};

// Helper: List models for each LLM backend
async function listModels(llm) {
  try {
    if (llm === 'ollama') {
      const res = await axios.get(`${LLM_CONFIG.ollama.url}/api/tags`);
      return res.data.models || [];
    } else if (llm === 'lmstudio') {
      const res = await axios.get(`${LLM_CONFIG.lmstudio.url}/v1/models`);
      return res.data.data || [];
    } else if (llm === 'vllm') {
      const res = await axios.get(`${LLM_CONFIG.vllm.url}/v1/models`);
      return res.data.models || [];
    }
  } catch (err) {
    logger.error(`LLM listModels error for ${llm}: ${err.message}`);
    return [];
  }
}

// Helper: Load/unload model (where supported)
async function loadModel(llm, model) {
  try {
    if (llm === 'ollama') {
      await axios.post(`${LLM_CONFIG.ollama.url}/api/pull`, { name: model });
      return true;
    }
    // LM Studio/vLLM: usually models are loaded on demand
    return true;
  } catch (err) {
    logger.error(`LLM loadModel error for ${llm}: ${err.message}`);
    return false;
  }
}
async function unloadModel(llm, model) {
  // Ollama: no unload, LM Studio/vLLM: not always supported
  return true;
}

// Add a persistent flag for vllm availability
let vllmAvailable = undefined;
let vllmErrorLogged = false;

async function checkVllmHealth() {
  if (vllmAvailable === false) {
    // Already determined unavailable, skip further checks
    return { ok: false, error: 'vllm previously determined unavailable' };
  }
  try {
    const url = process.env.VLLM_URL || LLM_CONFIG.vllm.url;
    const res = await axios.get(`${url}/v1/models`);
    if (Array.isArray(res.data.models) && res.data.models.length > 0) {
      vllmAvailable = true;
      return { ok: true };
    }
    vllmAvailable = false;
    if (!vllmErrorLogged) {
      logger.warn('vLLM /v1/models responded but no models found. Marking vllm as unavailable.');
      vllmErrorLogged = true;
    }
    return { ok: false, error: 'No models found' };
  } catch (e) {
    vllmAvailable = false;
    if (!vllmErrorLogged) {
      logger.warn('vLLM detection failed: ' + e.message);
      vllmErrorLogged = true;
    }
    return { ok: false, error: e.message };
  }
}

// API: List LLM models
app.get('/api/llm/models', async (req, res) => {
  const { backend } = req.query;
  const models = await listModels(backend);
  res.json({ backend, models });
});
// API: Load LLM model
app.post('/api/llm/load', async (req, res) => {
  const { backend, model } = req.body;
  const ok = await loadModel(backend, model);
  res.json({ success: ok });
});
// API: Unload LLM model
app.post('/api/llm/unload', async (req, res) => {
  const { backend, model } = req.body;
  const ok = await unloadModel(backend, model);
  res.json({ success: ok });
});

// Provider health check helpers
async function checkChromaDbHealth() {
  try {
    const url = process.env.CHROMADB_URL || LLM_CONFIG.chromadb?.url || 'http://localhost:8000';
    const res = await axios.get(`${url}/api/v1/heartbeat`);
    if (res.data && res.data.status === 'ok') {
      return { ok: true };
    }
    return { ok: false, error: 'Unexpected response' };
  } catch (e) {
    logger.error('ChromaDB health check failed: ' + e.message);
    return { ok: false, error: e.message };
  }
}

async function checkOllamaHealth() {
  try {
    const url = process.env.OLLAMA_URL || LLM_CONFIG.ollama?.url || 'http://localhost:11434';
    const res = await axios.get(`${url}/api/tags`);
    if (res.data && Array.isArray(res.data.models)) {
      return { ok: true };
    }
    return { ok: false, error: 'No models found' };
  } catch (e) {
    logger.error('Ollama health check failed: ' + e.message);
    return { ok: false, error: e.message };
  }
}

async function checkLmstudioHealth() {
  try {
    const url = process.env.LMSTUDIO_URL || LLM_CONFIG.lmstudio?.url || 'http://localhost:1234';
    const res = await axios.get(`${url}/v1/models`);
    if (Array.isArray(res.data.models) && res.data.models.length > 0) {
      return { ok: true };
    }
    return { ok: false, error: 'No models found' };
  } catch (e) {
    logger.error('LM Studio health check failed: ' + e.message);
    return { ok: false, error: e.message };
  }
}

// Health check API endpoint
app.get('/api/llm/health', async (req, res) => {
  const results = await Promise.all([
    checkVllmHealth(),
    checkChromaDbHealth(),
    checkOllamaHealth(),
    checkLmstudioHealth(),
  ]);
  res.json({
    vllm: results[0],
    chromadb: results[1],
    ollama: results[2],
    lmstudio: results[3],
  });
});

// Refactor /api/llm/providers to use health checks
app.get('/api/llm/providers', async (req, res) => {
  const checks = {
    vllm: await checkVllmHealth(),
    chromadb: await checkChromaDbHealth(),
    ollama: await checkOllamaHealth(),
    lmstudio: await checkLmstudioHealth(),
  };
  const available = Object.entries(checks)
    .filter(([_, v]) => v.ok)
    .map(([k]) => k);
  res.json({ available, checks });
});

// API: LLM inference (summarize, improve, crosslink, ask)
// app.post('/api/llm/infer', async (req, res) => {
//   const { backend, model, prompt, type, fileContent, extra } = req.body;
//   try {
//     let result = '';
//     if (backend === 'ollama') {
//       const response = await axios.post(`${LLM_CONFIG.ollama.url}/api/generate`, {
//         model,
//         prompt,
//         stream: false,
//       });
//       result = response.data.response;
//     } else if (backend === 'lmstudio') {
//       const response = await axios.post(`${LLM_CONFIG.lmstudio.url}/v1/completions`, {
//         model,
//         prompt,
//         max_tokens: 1024,
//         temperature: 0.7,
//       });
//       result = response.data.choices[0].text;
//     } else if (backend === 'vllm') {
//       const response = await axios.post(`${LLM_CONFIG.vllm.url}/v1/completions`, {
//         model,
//         prompt,
//         max_tokens: 1024,
//         temperature: 0.7,
//       });
//       result = response.data.choices[0].text;
//     }
//     res.json({ result });
//   } catch (err) {
//     logger.error(`LLM inference error: ${err.message}`);
//     res.status(500).json({ error: 'LLM inference failed' });
//   }
// });

// API: LLM chat/ask endpoint (for ChatWindow)
app.post('/api/llm/ask', async (req, res) => {
  const { prompt, provider = 'ollama', model = 'llama2', messages = [] } = req.body;
  if (!prompt && (!messages || messages.length === 0)) {
    return res.status(400).json({ error: 'Missing prompt or messages.' });
  }
  try {
    let response;
    if (provider === 'ollama') {
      // Ollama expects a single prompt string; prepend system prompt if present
      let fullPrompt = '';
      if (messages && messages.length > 0) {
        const sys = messages.find(m => m.role === 'system');
        if (sys) fullPrompt += sys.content + '\n';
        const user = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
        fullPrompt += user;
      } else {
        fullPrompt = prompt;
      }
      const resOllama = await axios.post(`${LLM_CONFIG.ollama.url}/api/generate`, { model, prompt: fullPrompt });
      response = resOllama.data.response || resOllama.data.generated_text || resOllama.data.text;
    } else if (provider === 'lmstudio') {
      // LM Studio expects messages array
      const resLm = await axios.post(`${LLM_CONFIG.lmstudio.url}/v1/chat/completions`, {
        model,
        messages: messages.length > 0 ? messages : [{ role: 'user', content: prompt }],
      });
      response = resLm.data.choices?.[0]?.message?.content || resLm.data.choices?.[0]?.text;
    } else if (provider === 'vllm') {
      // vLLM expects messages array
      const resVllm = await axios.post(`${LLM_CONFIG.vllm.url}/v1/chat/completions`, {
        model,
        messages: messages.length > 0 ? messages : [{ role: 'user', content: prompt }],
      });
      response = resVllm.data.choices?.[0]?.message?.content || resVllm.data.choices?.[0]?.text;
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }
    res.json({ response });
  } catch (err) {
    logger.error(`/api/llm/ask error: ${err.message}`);
    res.status(500).json({ error: 'LLM ask failed: ' + err.message });
  }
});

// API: LLM refine endpoint (for prompt refinement)
// app.post('/api/llm/refine', async (req, res) => {
//   const { prompt, provider, model, creativity, length, detail, formality } = req.body;
//   // For now, just echo the prompt with some mock refinement
//   // In a real implementation, you would call an LLM with a system prompt to refine
//   const refined = `[Refined] ${prompt} (creativity: ${creativity}, length: ${length}, detail: ${detail}, formality: ${formality})`;
//   res.json({ refined });
// });

// API: Summarize file using LLM
app.post('/api/llm/summarize', async (req, res) => {
  const { file_path } = req.body;
  if (!file_path) return res.status(400).json({ error: 'Missing file_path' });
  let absPath = file_path;
  if (!path.isAbsolute(file_path)) {
    absPath = path.resolve(req.query.root || path.resolve(__dirname, '../docs'), file_path);
  }
  if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });
  const ext = path.extname(absPath).toLowerCase();
  let content = '';
  try {
    if (ext === '.md' || ext === '.txt') {
      content = fs.readFileSync(absPath, 'utf8');
    } else if (ext === '.pdf') {
      const data = await pdfParse(fs.readFileSync(absPath));
      content = data.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: absPath });
      content = result.value;
    } else {
      return res.status(400).json({ error: 'Unsupported file type for summarization.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to extract text: ' + e.message });
  }
  // Limit content to first 10,000 chars
  content = content.slice(0, 10000);
  // Use default LLM provider/model if available (scaffold)
  let summary = 'No LLM configured.';
  try {
    // TODO: Use real LLM call here
    summary = content.slice(0, 200) + (content.length > 200 ? '...' : '');
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  res.json({ summary });
});

// --- File Editing ---
// GET file content for editing
app.get('/api/edit', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Missing file path' });
  const absPath = path.resolve(req.query.root || path.resolve(__dirname, '../../docs'), filePath);
  if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });
  const ext = path.extname(absPath).toLowerCase();
  if (ext !== '.md' && ext !== '.txt') return res.status(400).json({ error: 'Editing only supported for .md/.txt' });
  fs.readFile(absPath, 'utf8', (err, data) => {
    if (err) {
      logger.error('Edit read error: ' + err.message);
      return res.status(500).json({ error: 'Failed to read file' });
    }
    res.json({ content: data });
  });
});
// POST file content for editing (with versioning)
app.post('/api/edit', (req, res) => {
  const { file_path, content } = req.body;
  if (!file_path) return res.status(400).json({ error: 'Missing file_path' });
  const absPath = path.resolve(req.body.root || path.resolve(__dirname, '../../docs'), file_path);
  if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });
  const ext = path.extname(absPath).toLowerCase();
  if (ext !== '.md' && ext !== '.txt') return res.status(400).json({ error: 'Editing only supported for .md/.txt' });
  // Versioning: backup old file
  const backupDir = path.join(path.dirname(absPath), '.backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(absPath, path.join(backupDir, path.basename(absPath) + '.' + timestamp));
  // Write new content
  fs.writeFile(absPath, content, 'utf8', (err) => {
    if (err) {
      logger.error('Edit write error: ' + err.message);
      return res.status(500).json({ error: 'Failed to write file' });
    }
    logger.info(`Edited file: ${file_path}`);
    res.json({ success: true });
  });
});

// --- Bulk Operations ---
app.post('/api/meta/bulk', (req, res) => {
  const { files, tags, starred, comments } = req.body;
  if (!Array.isArray(files) || files.length === 0) return res.status(400).json({ error: 'No files specified' });
  let completed = 0;
  files.forEach((file_path) => {
    db.run(
      `INSERT INTO file_meta (file_path, tags, starred, comments, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(file_path) DO UPDATE SET tags=excluded.tags, starred=excluded.starred, comments=excluded.comments, updated_at=CURRENT_TIMESTAMP`,
      [file_path, tags || '', starred ? 1 : 0, comments ? JSON.stringify(comments) : '[]'],
      function (err) {
        if (err) logger.error('Bulk meta error: ' + err.message);
        completed++;
        if (completed === files.length) res.json({ success: true });
      }
    );
  });
});

// --- Export/Import Metadata ---
app.get('/api/meta/export', (req, res) => {
  const root = req.query.root || path.resolve(__dirname, '../docs');
  const dbPath = findCalibreDb(root);
  if (dbPath) return res.status(400).json({ error: 'Export not supported for Calibre libraries.' });
  db.all('SELECT * FROM file_meta', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Export failed' });
    res.json(rows);
  });
});
app.post('/api/meta/import', (req, res) => {
  const root = req.body.root || path.resolve(__dirname, '../docs');
  const dbPath = findCalibreDb(root);
  if (dbPath) return res.status(400).json({ error: 'Import not supported for Calibre libraries.' });
  const data = req.body.data;
  if (!Array.isArray(data)) return res.status(400).json({ error: 'Invalid data' });
  let count = 0;
  for (const row of data) {
    db.run(
      `INSERT INTO file_meta (file_path, tags, starred, comments, stars, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(file_path) DO UPDATE SET tags=excluded.tags, starred=excluded.starred, comments=excluded.comments, stars=excluded.stars, updated_at=CURRENT_TIMESTAMP`,
      [row.file_path, row.tags || '', row.starred ? 1 : 0, row.comments || '', row.stars || 0],
      function (err) { if (!err) count++; }
    );
  }
  res.json({ success: true, imported: count });
});

// --- Webhook for file changes (POST /api/webhook/filechange) ---
app.post('/api/webhook/filechange', (req, res) => {
  logger.info('Webhook: file change: ' + JSON.stringify(req.body));
  // TODO: handle file change event (e.g., refresh cache, notify clients)
  res.json({ success: true });
});

// API: Get backend logs (last N lines)
app.get('/api/logs', (req, res) => {
  const lines = parseInt(req.query.lines, 10) || 200;
  const logPath = path.resolve(__dirname, 'backend.log');
  if (!fs.existsSync(logPath)) return res.status(404).json({ error: 'Log file not found' });
  const allLines = fs.readFileSync(logPath, 'utf8').split('\n');
  const lastLines = allLines.slice(-lines).join('\n');
  res.type('text/plain').send(lastLines);
});

// API: Ping endpoint for health check
app.get('/api/ping', async (req, res) => {
  const details = {};
  // 1. Check node_modules and required modules
  try {
    const nodeModulesPath = path.resolve(__dirname, '../../node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      // Try requiring a key dependency
      require.resolve('express');
      details.node_modules = 'ok';
    } else {
      details.node_modules = 'missing';
    }
  } catch (e) {
    details.node_modules = 'broken';
  }

  // 2. Check database
  try {
    await new Promise((resolve, reject) => {
      db.get('SELECT 1', [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    details.db = 'ok';
  } catch (e) {
    details.db = 'down';
  }

  // 3. Check LLM providers and models
  details.llm = {};
  const llms = ['ollama', 'lmstudio', 'vllm'];
  for (const llm of llms) {
    let reachable = false;
    let models = [];
    let hasLoadedModel = false;
    try {
      models = await listModels(llm);
      reachable = true;
      // For Ollama: models with 'details' and 'details.loaded' true are loaded
      if (llm === 'ollama') {
        hasLoadedModel = Array.isArray(models) && models.some(m => m.details && m.details.loaded);
      } else if (llm === 'lmstudio' || llm === 'vllm') {
        // For LM Studio/vLLM: models with state 'loaded' or just non-empty list
        hasLoadedModel = Array.isArray(models) && models.length > 0 && (models.some(m => m.state === 'loaded') || models.length > 0);
      }
    } catch (e) {
      logger.error(`LLM listModels error for ${llm}: ${e.message}`);
      models = [];
      reachable = false;
      hasLoadedModel = false;
    }
    details.llm[llm] = {
      reachable,
      models: Array.isArray(models) ? models.map(m => m.name || m.id || m) : [],
      hasLoadedModel
    };
  }

  // 4. Overall status
  let status = 'ok';
  if (
    details.node_modules !== 'ok' ||
    details.db !== 'ok' ||
    Object.values(details.llm).some(l => !l.reachable || !l.hasLoadedModel)
  ) {
    status = 'error';
  }

  res.json({ status, details });
});

// Serve frontend static files (for single-exe or node server)
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  logger.info('Serving frontend static files from ' + frontendDist);
  app.use(express.static(frontendDist));
  // Catch-all: serve index.html for client-side routing
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built. Please run "npm run build" in frontend.');
    }
  });
} else {
  logger.warn('Frontend static files not found. Build the frontend with "npm run build".');
}

// Global Express error handler
app.use((err, req, res, next) => {
  logger.error(`[EXPRESS] Unhandled error: ${err.stack || err.message}`);
  res.status(500).json({ error: 'Internal server error: ' + (err.message || 'Unknown error') });
});

// Process-level error logging
// Error handling moved to the main async function
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection: ' + (reason && reason.stack ? reason.stack : reason));
  logger.error('[FATAL] Unhandled Rejection:', reason && reason.stack ? reason.stack : reason);
  process.exit(1);
});

try {
  app.listen(PORT, () => {
    logger.info(`docs_viewer backend running on port ${PORT}`);
  });
} catch (err) {
  logger.error('Error starting server: ' + err.stack || err.message);
  process.exit(1);
}

module.exports = app; // For testing 

app.get('/api/cover', (req, res) => {
  const coverPath = req.query.path;
  if (!coverPath) return res.status(400).json({ error: 'Missing cover path' });
  const abs = path.resolve(req.query.root || path.resolve(__dirname, '../docs'), coverPath);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Cover not found' });
  const ext = path.extname(abs).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') res.type('image/jpeg');
  else if (ext === '.png') res.type('image/png');
  else if (ext === '.webp') res.type('image/webp');
  else res.type('application/octet-stream');
  fs.createReadStream(abs).pipe(res);
});

// --- RAG/Vector DB Scaffold ---
const chroma = new ChromaClient({ path: 'http://localhost:8000' }); // Default ChromaDB server
const VECTOR_COLLECTION = 'docs_viewer';

// Utility: Chunk text (by tokens, fallback by chars)
function chunkText(text, maxTokens = 256, overlap = 32, model = 'gpt-3.5-turbo') {
  let encoding;
  try {
    encoding = encoding_for_model(model);
  } catch {
    encoding = null;
  }
  const tokens = encoding ? encoding.encode(text) : text.split('');
  const chunks = [];
  let i = 0;
  while (i < tokens.length) {
    const chunkTokens = tokens.slice(i, i + maxTokens);
    const chunk = encoding ? encoding.decode(chunkTokens) : chunkTokens.join('');
    chunks.push(chunk);
    i += maxTokens - overlap;
  }
  return chunks;
}

// Utility: Extract text from file (async, for chunking)
async function extractText(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (ext === '.md' || ext === '.txt') {
    return fs.readFileSync(absPath, 'utf8');
  } else if (ext === '.pdf') {
    try {
      const data = fs.readFileSync(absPath);
      const pdfData = await pdfParse(data);
      return pdfData.text;
    } catch (e) {
      logger.error('PDF parse error: ' + e.message);
      return '';
    }
  } else if (ext === '.epub') {
    try {
      const epubData = await epubParser(absPath);
      let text = '';
      if (epubData && epubData.chapters) {
        text = epubData.chapters.map(ch => ch.text || '').join('\n');
      }
      return text;
    } catch (e) {
      logger.error('EPUB parse error: ' + e.message);
      return '';
    }
  } else if (ext === '.docx') {
    // mammoth is async, so fallback: return empty string
    return '';
  }
  return '';
}

// Utility: Embed text (calls LLM or returns random vector as fallback)
async function embedText(text, backend = 'ollama', model = 'nomic-embed-text') {
  try {
    // Use LLM embedding endpoint if available (scaffold)
    if (backend === 'ollama') {
      // Ollama embedding API (if available)
      const res = await axios.post(`${LLM_CONFIG.ollama.url}/api/embeddings`, { model, prompt: text });
      return res.data.embedding;
    }
    // Add other providers as needed
  } catch (e) {
    logger.error(`LLM embedText error for ${backend}: ${e.message}`);
    // Fallback: random vector
    return Array(768).fill(0).map(() => Math.random());
  }
}

// API: RAG - Embed and store file
app.post('/api/rag/embed', async (req, res) => {
  const { file_path, backend = 'ollama', model = 'nomic-embed-text' } = req.body;
  if (!file_path) return res.status(400).json({ error: 'Missing file_path' });
  const absPath = path.isAbsolute(file_path) ? file_path : path.resolve(req.body.root || path.resolve(__dirname, '../docs'), file_path);
  if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });
  let text = await extractText(absPath);
  if (!text) return res.status(400).json({ error: 'Unsupported file type or failed to extract text.' });
  const chunks = chunkText(text);
  const vectors = await Promise.all(chunks.map(chunk => embedText(chunk, backend, model)));
  // Store in ChromaDB
  try {
    let collection;
    try {
      collection = await chroma.getCollection({ name: VECTOR_COLLECTION });
    } catch (e) {
      logger.error(`ChromaDB getCollection error: ${e.message}`);
      collection = await chroma.createCollection({ name: VECTOR_COLLECTION });
    }
    const ids = chunks.map((_, i) => `${file_path}::${i}`);
    await collection.add({ ids, embeddings: vectors, documents: chunks, metadatas: chunks.map((_, i) => ({ file_path, chunk: i })) });
    res.json({ success: true, chunks: chunks.length });
  } catch (e) {
    logger.error(`ChromaDB add error: ${e.message}`);
    res.status(500).json({ error: 'Failed to store embeddings' });
  }
});

// API: RAG - Query (semantic search)
app.post('/api/rag/query', async (req, res) => {
  const { query, backend = 'ollama', model = 'nomic-embed-text', top_k = 5 } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });
  let embedding;
  try {
    embedding = await embedText(query, backend, model);
  } catch (e) {
    logger.error(`LLM embedText error for ${backend}: ${e.message}`);
    return res.status(500).json({ error: 'Failed to embed query' });
  }
  try {
    const collection = await chroma.getCollection({ name: VECTOR_COLLECTION });
    const results = await collection.query({ queryEmbeddings: [embedding], nResults: top_k });
    res.json({ results });
  } catch (e) {
    logger.error(`ChromaDB query error: ${e.message}`);
    res.status(500).json({ error: 'Vector DB query failed' });
  }
});

// API: RAG - Status
app.get('/api/rag/status', async (req, res) => {
  try {
    const collections = await chroma.listCollections();
    res.json({ collections });
  } catch (e) {
    logger.error(`ChromaDB listCollections error: ${e.message}`);
    res.status(500).json({ error: 'ChromaDB not reachable' });
  }
});

// --- Teams Bot Scaffold ---
app.post('/api/teams/webhook', (req, res) => {
  // TODO: Integrate with Azure AD/Bot Framework for real Teams
  // For now, simulate a Teams message event
  const { user, message } = req.body;
  // Log or process the message (stub)
  res.json({ response: `Simulated Teams bot received: ${message} (from ${user})` });
});

// --- Experiment Log Endpoints ---
app.post('/api/experiment-log/save', (req, res) => {
  // Save chat/experiment session to SQLite or file (stub)
  res.json({ success: true });
});
app.get('/api/experiment-log/list', (req, res) => {
  // List saved sessions (stub)
  res.json({ sessions: [] });
});
app.get('/api/experiment-log/:id', (req, res) => {
  // Retrieve a specific session (stub)
  res.json({ session: {} });
});
app.get('/api/experiment-log/:id/export', (req, res) => {
  // Export a session (stub)
  res.json({ export: 'Not implemented' });
});

// --- Multimodal Vision/Image Analysis Endpoint ---
app.post('/api/vision/analyze', (req, res) => {
  // Accept image upload, return stub analysis
  res.json({ result: 'Image analysis not implemented yet.' });
});

const uploadDir = path.resolve(__dirname, '../docs/uploaded');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.txt') || file.originalname.endsWith('.md') || file.originalname.endsWith('.epub') || file.originalname.endsWith('.pdf')) cb(null, true);
    else cb(new Error('Only .txt, .md, .epub, and .pdf files are supported.'));
  },
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  // Return relative path for embedding
  const relPath = path.relative(path.resolve(__dirname, '../docs'), req.file.path).replace(/\\/g, '/');
  res.json({ path: relPath });
});

// --- Teams Chat Import Endpoint ---
const teamsChats = {};
let teamsChatCounter = 1;
const teamsUpload = multer({ dest: uploadDir });
app.post('/api/teams/import', teamsUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    let messages = [];
    if (ext === '.json') {
      const data = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
      // Try to extract messages from Teams JSON export (Graph API or Teams export format)
      if (Array.isArray(data.messages)) {
        messages = data.messages.map(m => ({
          sender: m.from?.user?.displayName || m.from?.application?.displayName || m.from?.device?.displayName || 'Unknown',
          timestamp: m.createdDateTime || m.timestamp || '',
          content: m.body?.content || m.content || '',
        }));
      } else if (Array.isArray(data)) {
        // Some exports are just an array of messages
        messages = data.map(m => ({
          sender: m.from?.user?.displayName || m.from?.application?.displayName || m.from?.device?.displayName || 'Unknown',
          timestamp: m.createdDateTime || m.timestamp || '',
          content: m.body?.content || m.content || '',
        }));
      }
    } else if (ext === '.html') {
      // TODO: Parse HTML export (optional)
      messages = [{ sender: 'TODO', timestamp: '', content: 'HTML parsing not implemented yet.' }];
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Only .json (Teams export) supported.' });
    }
    if (!messages.length) return res.status(400).json({ error: 'No messages found in file.' });
    const chatId = 'teams_' + (teamsChatCounter++);
    teamsChats[chatId] = messages;
    res.json({ chatId, count: messages.length });
  } catch (e) {
    logger.error('Teams import error: ' + e.message);
    res.status(500).json({ error: 'Failed to import Teams chat: ' + e.message });
  }
});

const { AuthorizationCode } = require('simple-oauth2');
let teamsToken = null;
let teamsRefreshToken = null;

const teamsOAuthConfig = {
  client: {
    id: process.env.TEAMS_CLIENT_ID || 'YOUR_CLIENT_ID',
    secret: process.env.TEAMS_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
  },
  auth: {
    tokenHost: 'https://login.microsoftonline.com',
    authorizePath: '/common/oauth2/v2.0/authorize',
    tokenPath: '/common/oauth2/v2.0/token',
  },
};
const teamsScopes = ['User.Read', 'Chat.ReadWrite', 'Chat.ReadWrite.All', 'User.ReadBasic.All', 'offline_access'];
const teamsOAuth2 = new AuthorizationCode(teamsOAuthConfig);

app.get('/api/teams/auth-url', (req, res) => {
  const url = teamsOAuth2.authorizeURL({
    redirect_uri: process.env.TEAMS_REDIRECT_URI || 'http://localhost:3000/api/teams/callback',
    scope: teamsScopes.join(' '),
  });
  res.json({ url });
});

app.get('/api/teams/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const tokenParams = {
      code,
      redirect_uri: process.env.TEAMS_REDIRECT_URI || 'http://localhost:3000/api/teams/callback',
      scope: teamsScopes.join(' '),
    };
    const accessToken = await teamsOAuth2.getToken(tokenParams);
    teamsToken = accessToken.token.access_token;
    teamsRefreshToken = accessToken.token.refresh_token;
    res.send('Teams authentication successful. You can close this window.');
  } catch (e) {
    logger.error('Teams OAuth callback error: ' + e.message);
    res.status(500).send('Teams authentication failed: ' + e.message);
  }
});

app.get('/api/teams/users', async (req, res) => {
  if (!teamsToken) return res.status(401).json({ error: 'Not authenticated with Teams.' });
  try {
    const client = Client.init({
      authProvider: (done) => done(null, teamsToken),
    });
    const users = await client.api('/users').select('id,displayName,mail').top(50).get();
    res.json({ users: users.value });
  } catch (e) {
    logger.error('Teams users fetch error: ' + e.message);
    res.status(500).json({ error: 'Failed to fetch Teams users: ' + e.message });
  }
});

// --- Real-Time Debate Session Management ---
const debateSessions = {};
let debateCounter = 1;

app.post('/api/debate/start', (req, res) => {
  const { participants = [], llms = [] } = req.body;
  if (!participants.length && !llms.length) return res.status(400).json({ error: 'No participants specified.' });
  const chatId = 'debate_' + (debateCounter++);
  debateSessions[chatId] = {
    participants: [...participants, ...llms],
    messages: [],
  };
  res.json({ chatId });
});

app.get('/api/debate/messages', (req, res) => {
  const { chatId } = req.query;
  if (!chatId || !debateSessions[chatId]) return res.status(404).json({ error: 'Chat not found.' });
  res.json({ messages: debateSessions[chatId].messages });
});

app.post('/api/debate/send', async (req, res) => {
  const { chatId, sender, content } = req.body;
  if (!chatId || !debateSessions[chatId]) return res.status(404).json({ error: 'Chat not found.' });
  if (!sender || !content) return res.status(400).json({ error: 'Missing sender or content.' });
  const msg = { sender, content, timestamp: new Date().toISOString() };
  debateSessions[chatId].messages.push(msg);
  const participant = debateSessions[chatId].participants.find(p => p.id === sender);
  let llmResponse = null;
  if (participant && participant.type === 'llm') {
    try {
      // Build chat context for LLM
      const messages = debateSessions[chatId].messages.map(m => {
        const p = debateSessions[chatId].participants.find(x => x.id === m.sender);
        return {
          role: p && p.type === 'llm' ? 'assistant' : 'user',
          content: m.content,
        };
      });
      // Use model/provider from participant, fallback to ollama/llama2
      const model = participant.model || 'llama2';
      const provider = participant.provider || 'ollama';
      const llmRes = await axios.post('http://localhost:3000/api/llm/ask', {
        provider,
        model,
        messages,
        prompt: content,
      });
      llmResponse = llmRes.data.response;
      debateSessions[chatId].messages.push({ sender, content: llmResponse, timestamp: new Date().toISOString() });
    } catch (e) {
      logger.error('LLM debate response error: ' + e.message);
      llmResponse = '[LLM error: ' + e.message + ']';
      debateSessions[chatId].messages.push({ sender, content: llmResponse, timestamp: new Date().toISOString() });
    }
  }
  res.json({ success: true, llmResponse });
});

// --- API: Frontend log receiver ---
app.post('/api/log', (req, res) => {
  const { level = 'info', message = '' } = req.body;
  if (typeof logger[level] === 'function') {
    logger[level]('[FRONTEND]', message);
  } else {
    logger.info('[FRONTEND]', message);
  }
  res.sendStatus(200);
});

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`docs_viewer backend running on port ${PORT}`);
  
  // Serve frontend static files from the dist directory
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Handle SPA routing - serve index.html for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
  
  logger.info(`Serving frontend static files from ${frontendPath}`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      logger.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});