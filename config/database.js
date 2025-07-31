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
      acquireConnectionTimeout: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000
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
      max: parseInt(process.env.DB_POOL_MAX) || 10
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
 * Initialize database (run migrations)
 */
const initializeDatabase = async () => {
  try {
    console.log('🔄 Running database migrations...');
    await db.migrate.latest();
    console.log('✅ Database migrations completed');
    
    // Check if we need to seed data
    const userCount = await db('users').count('id as count').first();
    if (parseInt(userCount.count) === 0) {
      console.log('🌱 Seeding initial data...');
      await db.seed.run();
      console.log('✅ Database seeding completed');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
};

/**
 * Gracefully close database connection
 */
const closeConnection = async () => {
  try {
    await db.destroy();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
};

/**
 * Health check function
 */
const healthCheck = async () => {
  try {
    const result = await db.raw('SELECT NOW() as timestamp');
    return {
      status: 'healthy',
      timestamp: result.rows[0].timestamp,
      connection: 'active'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed'
    };
  }
};

/**
 * Database cleanup for testing
 */
const cleanupTestDatabase = async () => {
  if (environment !== 'testing') {
    throw new Error('Cleanup only allowed in testing environment');
  }

  try {
    // Get all table names
    const result = await db.raw(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != 'knex_migrations'
    `);
    
    const tables = result.rows.map(row => row.tablename);
    
    // Truncate all tables
    for (const table of tables) {
      await db.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    }
    
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    throw error;
  }
};

module.exports = {
  db,
  testConnection,
  initializeDatabase,
  closeConnection,
  healthCheck,
  cleanupTestDatabase,
  knexConfig
};