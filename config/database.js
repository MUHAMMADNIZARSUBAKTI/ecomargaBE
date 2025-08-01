// config/database.js
const knex = require('knex');
const path = require('path');

const environment = process.env.NODE_ENV || 'development';

// Parse DATABASE_URL untuk Railway
const parseConnectionString = (connectionString) => {
  if (!connectionString) return null;
  
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading /
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false }
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
};

const knexConfig = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ecomarga',  
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '../migrations')
    }
  },
  
  production: {
    client: 'postgresql',
    // Railway menggunakan DATABASE_URL
    connection: process.env.DATABASE_URL ? 
      process.env.DATABASE_URL : 
      parseConnectionString(process.env.DATABASE_URL),
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000
    },
    migrations: {
      tableName: 'knex_migrations', 
      directory: path.join(__dirname, '../migrations')
    },
    ssl: { rejectUnauthorized: false }
  }
};

const config = knexConfig[environment];
const db = knex(config);

// Test connection function
const testConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    console.log('Environment:', environment);
    console.log('Database URL exists:', !!process.env.DATABASE_URL);
    
    await db.raw('SELECT 1+1 as result');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Connection config:', {
      host: config.connection?.host || 'URL-based',
      database: config.connection?.database || 'from-URL',
      ssl: !!config.ssl
    });
    return false;
  }
};

module.exports = {
  db,
  testConnection,
  initializeDatabase: async () => {
    try {
      await db.migrate.latest();
      return true;
    } catch (error) {
      console.error('Migration failed:', error.message);
      return false;
    }
  },
  closeConnection: async () => {
    await db.destroy();
  }
};