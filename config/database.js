// config/database.js - Database connection and configuration
const knex = require('knex');
const knexConfig = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
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
    const tables = await db.raw(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != '${config.migrations.tableName}'
    `);
    
    // Truncate all tables except migrations
    for (const table of tables.rows) {
      await db.raw(`TRUNCATE TABLE "${table.tablename}" RESTART IDENTITY CASCADE`);
    }
    
    console.log('🧹 Test database cleaned');
  } catch (error) {
    console.error('❌ Error cleaning test database:', error.message);
    throw error;
  }
};

/**
 * Transaction wrapper
 */
const transaction = async (callback) => {
  const trx = await db.transaction();
  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
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
  transaction
};