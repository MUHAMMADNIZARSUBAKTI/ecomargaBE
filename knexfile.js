require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ecomarga',
      user: process.env.DB_USER || 'ecomarga_user',
      password: process.env.DB_PASSWORD
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000
    },
    migrations: {
      directory: './migrations',
      tableName: process.env.MIGRATION_TABLE_NAME || 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },

  testing: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME + '_test' || 'ecomarga_test',
      user: process.env.DB_USER || 'ecomarga_user',
      password: process.env.DB_PASSWORD
    },
    pool: {
      min: 1,
      max: 5
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
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
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000
    },
    migrations: {
      directory: './migrations',
      tableName: process.env.MIGRATION_TABLE_NAME || 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
};