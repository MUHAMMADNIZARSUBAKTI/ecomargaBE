// config/database.js - Database connection and configuration
const knex = require('knex');
const path = require('path');

const environment = process.env.NODE_ENV || 'development';

// Database configuration
const knexConfig = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ecomarga',
      user: process.env.DB_USER || 'ecomarga_user',
      password: process.env.DB_PASSWORD || 'password'
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      // Ganti acquireConnectionTimeout dengan acquireTimeoutMillis
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      // Tambahan konfigurasi pool yang kompatibel
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '../migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../seeds')
    }
  },
  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      // Gunakan acquireTimeoutMillis
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '../migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../seeds')
    }
  },
  testing: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME_TEST || 'ecomarga_test',
      user: process.env.DB_USER || 'ecomarga_user',
      password: process.env.DB_PASSWORD || 'password'
    },
    pool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '../migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../seeds')
    }
  }
};

const config = knexConfig[environment];

// Create knex instance
const db = knex(config);

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    await db.raw('SELECT 1+1 as result');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Initialize database (run migrations and seeds)
 */
const initializeDatabase = async () => {
  try {
    console.log('🔄 Running database migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations completed');

    // Only run seeds in development
    if (environment === 'development') {
      console.log('🌱 Running database seeds...');
      await db.seed.run();
      console.log('✅ Seeds completed');
    }

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
  try {
    await db.destroy();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
};

module.exports = {
  db,
  testConnection,
  initializeDatabase,
  closeConnection
};