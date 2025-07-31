// knexfile.js - Knex configuration for different environments
const path = require('path');
require('dotenv').config();

module.exports = {
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
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    // Enable query debugging in development
    debug: process.env.DEBUG_SQL === 'true',
    // Log queries that take longer than 1000ms
    asyncStackTraces: true,
    log: {
      warn(message) {
        console.warn('⚠️ Knex Warning:', message);
      },
      error(message) {
        console.error('❌ Knex Error:', message);
      },
      deprecate(message) {
        console.log('🔄 Knex Deprecation:', message);
      },
      debug(message) {
        if (process.env.DEBUG_SQL === 'true') {
          console.log('🔍 Knex Debug:', message);
        }
      }
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
      max: 5
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    // Disable logging in tests
    log: {
      warn() {},
      error() {},
      deprecate() {},
      debug() {}
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { 
        rejectUnauthorized: false,
        sslmode: 'require'
      } : false
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquireConnectionTimeout: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      // Connection validation
      createTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    // Moderate logging for staging
    log: {
      warn(message) {
        console.warn('⚠️ Knex Warning:', message);
      },
      error(message) {
        console.error('❌ Knex Error:', message);
      },
      deprecate() {},
      debug() {}
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
      ssl: process.env.DB_SSL === 'true' ? { 
        rejectUnauthorized: false,
        sslmode: 'require'
      } : false,
      // Additional production connection options
      application_name: 'ecomarga-api',
      statement_timeout: 30000,  // 30 seconds
      idle_in_transaction_session_timeout: 30000
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      acquireConnectionTimeout: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      // Production-specific pool settings
      createTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    // Minimal logging for production
    log: {
      warn(message) {
        console.warn('⚠️ Database Warning:', message);
      },
      error(message) {
        console.error('❌ Database Error:', message);
      },
      deprecate() {},
      debug() {}
    },
    // Production optimizations
    asyncStackTraces: false,
    wrapIdentifier: (value, origImpl) => origImpl(value),
    postProcessResponse: (result) => {
      // Custom post-processing if needed
      return result;
    }
  }
};