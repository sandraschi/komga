require('dotenv').config();
const path = require('path');

// Get the database path from environment or use default
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/docs_viewer.sqlite');

module.exports = {
  development: {
    client: 'sqlite3',  // or 'better-sqlite3'
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations',
      tableName: '_migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },
  
  production: {
    client: 'sqlite3',  // or 'better-sqlite3'
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations',
      tableName: '_migrations'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
