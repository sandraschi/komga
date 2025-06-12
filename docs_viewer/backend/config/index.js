const path = require('path');
const dotenv = require('dotenv');
const { existsSync } = require('fs');

// Load environment variables from .env file
const envPath = path.join(__dirname, '../../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Define configuration with defaults
const config = {
  // Server configuration
  port: parseInt(process.env.PORT, 10) || 5174,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  
  // File paths
  rootDir: path.resolve(__dirname, '../..'),
  uploadsDir: path.join(__dirname, '../../uploads'),
  logsDir: path.join(__dirname, '../../logs'),
  dataDir: path.join(__dirname, '../../data'),
  
  // Database configuration
  database: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL || path.join(__dirname, '../../data/docs_viewer.sqlite'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../db/migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: path.join(__dirname, '../db/seeds'),
    },
  },
  
  // Vector Database configuration
  vectorDb: {
    // Weaviate configuration
    weaviate: {
      url: process.env.WEAVIATE_URL || 'http://localhost:8080',
      // No API key needed for local development with anonymous access
    },
    // ChromaDB configuration (legacy, can be removed after migration)
    chromaDb: {
      url: process.env.CHROMA_DB_URL || 'http://localhost:8000',
    },
  },
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  
  // Security
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // limit each IP to 100 requests per windowMs
    },
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE !== 'false',
      path: process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs/app.log'),
      maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
    },
  },
  
  // LLM configuration
  llm: {
    ollama: {
      url: process.env.OLLAMA_URL || 'http://localhost:11434',
      enabled: process.env.OLLAMA_ENABLED !== 'false',
    },
    lmstudio: {
      url: process.env.LMSTUDIO_URL || 'http://localhost:1234',
      enabled: process.env.LMSTUDIO_ENABLED !== 'false',
    },
    vllm: {
      url: process.env.VLLM_URL || 'http://localhost:8000',
      enabled: process.env.VLLM_ENABLED !== 'false',
    },
  },
  
  // ChromaDB configuration
  chroma: {
    url: process.env.CHROMA_URL || 'http://localhost:8000',
    collection: process.env.CHROMA_COLLECTION || 'docs_viewer',
  },
  
  // File processing
  fileProcessing: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/epub+zip',
      'application/x-mobipocket-ebook',
      'application/x-cbr',
      'application/x-cbz',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/vnd.comicbook+zip',
      'application/vnd.comicbook-rar',
    ],
  },
};

// Ensure required directories exist
const requiredDirs = [
  config.uploadsDir,
  config.logsDir,
  config.dataDir,
];

requiredDirs.forEach((dir) => {
  try {
    if (!existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.error(`Failed to create directory: ${dir}`, error);
    process.exit(1);
  }
});

module.exports = config;
