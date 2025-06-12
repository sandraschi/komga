const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

// Database configuration
const DB_PATH = path.join(__dirname, '../../data/docs_viewer.sqlite');

// Create data directory if it doesn't exist
require('fs').mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

/**
 * Initialize the database connection and run migrations
 * @returns {Promise<sqlite3.Database>} The database instance
 */
async function initDB() {
  return new Promise((resolve, reject) => {
    try {
      logger.info(`Initializing database at ${DB_PATH}`);
      
      // Create database connection
      db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          logger.error('Failed to connect to SQLite database', { 
            error: err.message, 
            stack: err.stack 
          });
          return reject(err);
        }
        
        logger.info('Database connection established');
        
        // Enable WAL mode for better concurrency
        db.serialize(() => {
          db.run('PRAGMA journal_mode = WAL;');
          db.run('PRAGMA synchronous = NORMAL;');
          db.run('PRAGMA busy_timeout = 5000;');
          
          // Create migrations table if it doesn't exist
          db.run(`
            CREATE TABLE IF NOT EXISTS _migrations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              run_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(name)
            )
          `, async (err) => {
            if (err) {
              logger.error('Failed to create migrations table', { error: err.message });
              return reject(err);
            }
            
            try {
              // Run migrations
              await runMigrations();
              logger.info('Database initialization completed successfully');
              resolve(db);
            } catch (migrationErr) {
              reject(migrationErr);
            }
          });
        });
      });
      
      // Handle database errors
      db.on('error', (err) => {
        logger.error('Database error', { 
          error: err.message,
          stack: err.stack
        });
      });
      
    } catch (err) {
      logger.error('Failed to initialize database', {
        error: err.message,
        stack: err.stack
      });
      reject(err);
    }
  });
}

/**
 * Run database migrations
 */
async function runMigrations() {
  return new Promise((resolve, reject) => {
    try {
      // In a real app, you would read migration files from the filesystem
      // For now, we'll define them inline
      const migrations = [
        // Initial schema
        {
          name: '0001_initial_schema',
          up: `
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
          `
        },
        // Add more migrations as needed
      ];
      
      let completed = 0;
      
      const runNextMigration = (index) => {
        if (index >= migrations.length) {
          logger.info(`All migrations completed (${completed} ran)`);
          return resolve();
        }
        
        const migration = migrations[index];
        
        // Check if migration has already been run
        db.get(
          'SELECT * FROM _migrations WHERE name = ?', 
          [migration.name],
          (err, row) => {
            if (err) {
              logger.error('Error checking migration status', { 
                migration: migration.name,
                error: err.message 
              });
              return reject(err);
            }
            
            if (row) {
              // Migration already run, skip
              logger.debug(`Skipping already run migration: ${migration.name}`);
              return runNextMigration(index + 1);
            }
            
            // Run migration
            logger.info(`Running migration: ${migration.name}`);
            db.serialize(() => {
              db.run('BEGIN TRANSACTION');
              
              // Run the migration SQL
              db.run(migration.up, (err) => {
                if (err) {
                  logger.error('Migration failed', { 
                    migration: migration.name,
                    error: err.message 
                  });
                  return db.run('ROLLBACK', () => reject(err));
                }
                
                // Record migration
                db.run(
                  'INSERT INTO _migrations (name) VALUES (?)',
                  [migration.name],
                  (err) => {
                    if (err) {
                      logger.error('Failed to record migration', { 
                        migration: migration.name,
                        error: err.message 
                      });
                      return db.run('ROLLBACK', () => reject(err));
                    }
                    
                    // Commit transaction
                    db.run('COMMIT', (err) => {
                      if (err) {
                        logger.error('Failed to commit migration transaction', { 
                          migration: migration.name,
                          error: err.message 
                        });
                        return reject(err);
                      }
                      
                      completed++;
                      logger.info(`Completed migration: ${migration.name}`);
                      runNextMigration(index + 1);
                    });
                  }
                );
              });
            });
          }
        );
      };
      
      // Start running migrations
      runNextMigration(0);
      
    } catch (err) {
      logger.error('Error running migrations', {
        error: err.message,
        stack: err.stack
      });
      reject(err);
    }
  });
}

/**
 * Get the database instance
 * @returns {sqlite3.Database} The database instance
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

/**
 * Execute a SQL query with parameters
 * @param {string} sql - The SQL query
 * @param {Array} [params=[]] - The query parameters
 * @returns {Promise<{lastID: number, changes: number}>}
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const db = getDB();
    
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
      
      resolve({
        changes: this.changes,
        lastID: this.lastID
      });
    });
  });
}

/**
 * Execute a SQL query and return the first row
 * @param {string} sql - The SQL query
 * @param {Array} [params=[]] - The query parameters
 * @returns {Promise<Object>}
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const db = getDB();
    
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
      
      resolve(row || null);
    });
  });
}

/**
 * Execute a SQL query and return all rows
 * @param {string} sql - The SQL query
 * @param {Array} [params=[]] - The query parameters
 * @returns {Promise<Array>}
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const db = getDB();
    
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
}

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
function close() {
  return new Promise((resolve, reject) => {
    if (!db) {
      return resolve();
    }
    
    logger.info('Closing database connection');
    
    db.close((err) => {
      if (err) {
        logger.error('Error closing database', {
          error: err.message,
          stack: err.stack
        });
        return reject(err);
      }
      
      logger.info('Database connection closed');
      db = null;
      resolve();
    });
  });
}

module.exports = {
  initDB,
  getDB,
  run,
  get,
  all,
  close
};
