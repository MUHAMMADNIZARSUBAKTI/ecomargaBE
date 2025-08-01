// knexfile.js - Knex configuration for different environments
const path = require("path");
require("dotenv").config();

module.exports = {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || "ecomarga",
      user: process.env.DB_USER || "ecomarga_user",
      password: process.env.DB_PASSWORD || "password",
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      // Ganti acquireConnectionTimeout dengan acquireTimeoutMillis
      acquireTimeoutMillis:
        parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
    // Enable query debugging in development
    debug: process.env.DEBUG_SQL === "true",
    asyncStackTraces: true,
    log: {
      warn(message) {
        console.warn("⚠️ Knex Warning:", message);
      },
      error(message) {
        console.error("❌ Knex Error:", message);
      },
      deprecate(message) {
        console.log("🔄 Knex Deprecation:", message);
      },
      debug(message) {
        if (process.env.DEBUG_SQL === "true") {
          console.log("🔍 Knex Debug:", message);
        }
      },
    },
  },

  testing: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME_TEST || "ecomarga_test",
      user: process.env.DB_USER || "ecomarga_user",
      password: process.env.DB_PASSWORD || "password",
    },
    pool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
    log: {
      warn() {},
      error() {},
      deprecate() {},
      debug() {},
    },
  },

  staging: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:
        process.env.DB_SSL === "true"
          ? {
              rejectUnauthorized: false,
              sslmode: "require",
            }
          : false,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquireTimeoutMillis:
        parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
    log: {
      warn(message) {
        console.warn("⚠️ Knex Warning:", message);
      },
      error(message) {
        console.error("❌ Knex Error:", message);
      },
      deprecate() {},
      debug() {},
    },
  },

  production: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:
        process.env.DB_SSL === "true"
          ? {
              rejectUnauthorized: false,
              sslmode: "require",
            }
          : false,
      application_name: "ecomarga-api",
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 30000,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      acquireTimeoutMillis:
        parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT) || 60000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      propagateCreateError: false,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
    log: {
      warn(message) {
        console.warn("⚠️ Database Warning:", message);
      },
      error(message) {
        console.error("❌ Database Error:", message);
      },
      deprecate() {},
      debug() {},
    },
    asyncStackTraces: false,
    wrapIdentifier: (value, origImpl) => origImpl(value),
    postProcessResponse: (result) => {
      return result;
    },
  },
};
