const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { ChromaClient } = require('chromadb');
const { encoding_for_model } = require('@dqbd/tiktoken');

const app = express();
const PORT = process.env.PORT || 5174;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'backend.log' }),
    new winston.transports.Console()
  ]
});

// SQLite setup
const db = new sqlite3.Database('./docs_viewer.sqlite', (err) => {
  if (err) {
    logger.error('Failed to connect to SQLite DB: ' + err.message);
  } else {
    logger.info('Connected to SQLite DB');
  }
});

// Create tables if not exist
const initDb = () => {
  db.run(`CREATE TABLE IF NOT EXISTS file_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE,
    tags TEXT,
    starred INTEGER DEFAULT 0,
    comments TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
};
initDb();

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
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const relPath = path.relative(base, filePath);
    const stat = fs.statSync(filePath);
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
  });
  return results;
}

// Utility: Read Calibre library structure from metadata.db
function getCalibreLibraryTree(dbPath) {
  const sqlite = require('sqlite3').verbose();
  const db = new sqlite.Database(dbPath);
  return new Promise((resolve, reject) => {
    // Query all books with their paths, authors, series, etc.
    db.all(`SELECT b.id, b.title, b.path, b.rating, b.comments, b.series_index, s.name as series, a.name as author
            FROM books b
            LEFT JOIN books_authors_link bal ON b.id = bal.book
            LEFT JOIN authors a ON bal.author = a.id
            LEFT JOIN books_series_link bsl ON b.id = bsl.book
            LEFT JOIN series s ON bsl.series = s.id`, [], (err, rows) => {
      if (err) return reject(err);
      // Group by author/series
      const authors = {};
      for (const row of rows) {
        if (!authors[row.author]) authors[row.author] = { name: row.author, books: [] };
        authors[row.author].books.push(row);
      }
      resolve({ authors: Object.values(authors), books: rows });
    });
  });
}

// Utility: Read metadata for a file from Calibre metadata.db (full)
function readCalibreDbMetadata(dbPath, filePath) {
  const sqlite = require('sqlite3').verbose();
  const db = new sqlite.Database(dbPath);
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
async function readCalibreDbAdvancedMetadata(dbPath, filePath) {
  const sqlite = require('sqlite3').verbose();
  const db = new sqlite.Database(dbPath);
  return new Promise((resolve, reject) => {
    db.get(`SELECT b.id, b.title, b.path, b.rating, b.comments, s.name as series
            FROM books b
            LEFT JOIN books_series_link bsl ON b.id = bsl.book
            LEFT JOIN series s ON bsl.series = s.id
            WHERE ? LIKE '%' || b.path || '%'`, [filePath], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve({});
      db.all(`SELECT a.name FROM authors a
              JOIN books_authors_link bal ON a.id = bal.author
              WHERE bal.book = ?`, [row.id], (err2, authorRows) => {
        if (err2) return reject(err2);
        const authors = authorRows.map(a => a.name);
        resolve({
          series: row.series || '',
          authors,
          title: row.title
        });
      });
    });
  });
}

// Utility: Get cover image path for a Calibre book (support multiple formats)
function getCalibreCoverPath(bookPath, root) {
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of exts) {
    const abs = path.resolve(root, bookPath, `cover.${ext}`);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

// API: Get file tree
app.get('/api/tree', async (req, res) => {
  const root = req.query.root || path.resolve(__dirname, '../docs');
  const dbPath = findCalibreDb(root);
  if (dbPath) {
    try {
      const sqlite = require('sqlite3').verbose();
      const db = new sqlite.Database(dbPath);
      db.all(`SELECT b.id, b.title, b.path, b.rating, b.comments, b.series_index, s.name as series, a.name as author
              FROM books b
              LEFT JOIN books_authors_link bal ON b.id = bal.book
              LEFT JOIN authors a ON bal.author = a.id
              LEFT JOIN books_series_link bsl ON b.id = bsl.book
              LEFT JOIN series s ON bsl.series = s.id`, [], (err, rows) => {
        if (err) {
          logger.error('Failed to read Calibre library: ' + err.message);
          return res.status(500).json({ error: 'Failed to read Calibre library' });
        }
        const getBookFiles = (bookId) => new Promise((resolve2) => {
          db.all(`SELECT name FROM data WHERE book = ?`, [bookId], (err2, fileRows) => {
            if (err2 || !fileRows.length) return resolve2([]);
            resolve2(fileRows.map(f => f.name));
          });
        });
        const authors = {};
        Promise.all(rows.map(async (row) => {
          const files = await getBookFiles(row.id);
          row.files = files;
          // Add cover path (relative to root)
          const coverAbs = getCalibreCoverPath(row.path, root);
          row.cover = coverAbs ? path.relative(root, coverAbs) : null;
          return row;
        })).then((rowsWithFiles) => {
          for (const row of rowsWithFiles) {
            if (!authors[row.author]) authors[row.author] = { name: row.author, books: [] };
            authors[row.author].books.push(row);
          }
          const tree = Object.values(authors).map(author => ({
            type: 'folder',
            name: author.name,
            path: author.name,
            children: author.books.map(book => ({
              type: 'folder',
              name: book.title,
              path: path.join(book.path, book.title),
              cover: book.cover,
              children: (book.files || []).map(fname => ({
                type: 'file',
                name: fname,
                path: path.join(book.path, fname)
              }))
            }))
          }));
          res.json(tree);
        });
      });
    } catch (e) {
      logger.error('Failed to read Calibre library: ' + e.message);
      res.status(500).json({ error: 'Failed to read Calibre library' });
    }
    return;
  }
  // Fallback to filesystem
  try {
    const tree = getFileTree(root);
    res.json(tree);
  } catch (err) {
    logger.error('[TREE] Error reading file tree: ' + err.message + '\n' + err.stack);
    res.status(500).json({ error: 'Failed to read file tree' });
  }
});

// API: Get file content (stream for large files)
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Missing file path' });
  logger.info(`Get file content: ${filePath}`);
  const absPath = path.resolve(req.query.root || path.resolve(__dirname, '../docs'), filePath);
  if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });
  const ext = path.extname(absPath).toLowerCase();
  // Set content type for supported formats
  if (ext === '.md' || ext === '.txt') {
    res.type('text/plain');
    fs.createReadStream(absPath).pipe(res);
  } else if (ext === '.pdf') {
    res.type('application/pdf');
    fs.createReadStream(absPath).pipe(res);
  } else if (ext === '.docx') {
    res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    fs.createReadStream(absPath).pipe(res);
  } else {
    res.type('application/octet-stream');
    fs.createReadStream(absPath).pipe(res);
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
    const tags = (data.package?.metadata?.['dc:subject'] || []).join(',');
    let stars = 0;
    if (Array.isArray(data.package?.metadata?.meta)) {
      for (const m of data.package.metadata.meta) {
        if (m['@_name'] === 'calibre:rating') stars = parseInt(m['@_content'], 10) / 2;
      }
    }
    // Comments: <dc:description>
    const comments = data.package?.metadata?.['dc:description'] || '';
    return { tags, stars, comments };
  } catch (e) {
    logger.error('Failed to read OPF: ' + e.message);
    return {};
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
        const advMeta = await readCalibreDbAdvancedMetadata(dbPath, absPath);
        cover = getCalibreCoverPath(path.dirname(absPath), path.resolve(__dirname, '../docs'));
        res.json({ ...row, ...dbMeta, ...advMeta, cover: cover ? path.relative(path.resolve(__dirname, '../docs'), cover) : null });
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

// API: List LLM providers and their models
app.get('/api/llm/providers', async (req, res) => {
  const PROVIDERS = ['ollama', 'lmstudio', 'vllm'];
  const results = await Promise.all(PROVIDERS.map(async (provider) => {
    let url = LLM_CONFIG[provider]?.url;
    let running = false;
    let error = null;
    let models = [];
    try {
      models = await listModels(provider);
      running = true;
    } catch (e) {
      error = e.message;
      models = [];
      running = false;
    }
    return {
      provider,
      url,
      running,
      error,
      models: Array.isArray(models) ? models.map(m => m.name || m.id || m) : []
    };
  }));
  res.json(results);
});

// API: LLM inference (summarize, improve, crosslink, ask)
app.post('/api/llm/infer', async (req, res) => {
  const { backend, model, prompt, type, fileContent, extra } = req.body;
  try {
    let result = '';
    if (backend === 'ollama') {
      const response = await axios.post(`${LLM_CONFIG.ollama.url}/api/generate`, {
        model,
        prompt,
        stream: false,
      });
      result = response.data.response;
    } else if (backend === 'lmstudio') {
      const response = await axios.post(`${LLM_CONFIG.lmstudio.url}/v1/completions`, {
        model,
        prompt,
        max_tokens: 1024,
        temperature: 0.7,
      });
      result = response.data.choices[0].text;
    } else if (backend === 'vllm') {
      const response = await axios.post(`${LLM_CONFIG.vllm.url}/v1/completions`, {
        model,
        prompt,
        max_tokens: 1024,
        temperature: 0.7,
      });
      result = response.data.choices[0].text;
    }
    res.json({ result });
  } catch (err) {
    logger.error(`LLM inference error: ${err.message}`);
    res.status(500).json({ error: 'LLM inference failed' });
  }
});

// API: LLM chat/ask endpoint (for ChatWindow)
app.post('/api/llm/ask', async (req, res) => {
  const { prompt, provider, model, messages } = req.body;
  try {
    let result = '';
    if (provider === 'ollama') {
      const response = await axios.post(`${LLM_CONFIG.ollama.url}/api/generate`, {
        model,
        prompt,
        stream: false,
      });
      result = response.data.response;
    } else if (provider === 'lmstudio') {
      const response = await axios.post(`${LLM_CONFIG.lmstudio.url}/v1/completions`, {
        model,
        prompt,
        max_tokens: 1024,
        temperature: 0.7,
      });
      result = response.data.choices[0].text;
    } else if (provider === 'vllm') {
      const response = await axios.post(`${LLM_CONFIG.vllm.url}/v1/completions`, {
        model,
        prompt,
        max_tokens: 1024,
        temperature: 0.7,
      });
      result = response.data.choices[0].text;
    }
    res.json({ response: result });
  } catch (err) {
    logger.error(`/api/llm/ask error: ${err.message}`);
    res.status(500).json({ error: 'LLM ask failed' });
  }
});

// API: LLM refine endpoint (for prompt refinement)
app.post('/api/llm/refine', async (req, res) => {
  const { prompt, provider, model, creativity, length, detail, formality } = req.body;
  // For now, just echo the prompt with some mock refinement
  // In a real implementation, you would call an LLM with a system prompt to refine
  const refined = `[Refined] ${prompt} (creativity: ${creativity}, length: ${length}, detail: ${detail}, formality: ${formality})`;
  res.json({ refined });
});

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

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error: ' + err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Add process-level error logging
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception: ' + err.stack || err.message);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection: ' + (reason && reason.stack ? reason.stack : reason));
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

// Utility: Extract text from file (sync, for chunking)
function extractTextSync(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (ext === '.md' || ext === '.txt') {
    return fs.readFileSync(absPath, 'utf8');
  } else if (ext === '.pdf') {
    // pdf-parse is async, so fallback: return empty string
    return '';
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
  let text = extractTextSync(absPath);
  if (!text) return res.status(400).json({ error: 'Unsupported file type or failed to extract text.' });
  const chunks = chunkText(text);
  const vectors = await Promise.all(chunks.map(chunk => embedText(chunk, backend, model)));
  // Store in ChromaDB
  try {
    let collection;
    try {
      collection = await chroma.getCollection({ name: VECTOR_COLLECTION });
    } catch {
      collection = await chroma.createCollection({ name: VECTOR_COLLECTION });
    }
    const ids = chunks.map((_, i) => `${file_path}::${i}`);
    await collection.add({ ids, embeddings: vectors, documents: chunks, metadatas: chunks.map((_, i) => ({ file_path, chunk: i })) });
    res.json({ success: true, chunks: chunks.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to store embeddings: ' + e.message });
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
    return res.status(500).json({ error: 'Failed to embed query: ' + e.message });
  }
  try {
    const collection = await chroma.getCollection({ name: VECTOR_COLLECTION });
    const results = await collection.query({ queryEmbeddings: [embedding], nResults: top_k });
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Vector DB query failed: ' + e.message });
  }
});

// API: RAG - Status
app.get('/api/rag/status', async (req, res) => {
  try {
    const collections = await chroma.listCollections();
    res.json({ collections });
  } catch (e) {
    res.status(500).json({ error: 'ChromaDB not reachable: ' + e.message });
  }
}); 