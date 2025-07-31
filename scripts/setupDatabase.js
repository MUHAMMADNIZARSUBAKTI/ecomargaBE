const { Client } = require('pg');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'postgres' // Connect to default database first
};

const dbName = process.env.DB_NAME || 'ecomarga';
const dbUser = process.env.DB_USER || 'ecomarga_user';
const dbPassword = process.env.DB_PASSWORD;

async function setupDatabase() {
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    
    // Check if database exists
    console.log(`🔍 Checking if database '${dbName}' exists...`);
    const dbCheckResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (dbCheckResult.rows.length === 0) {
      console.log(`📊 Creating database '${dbName}'...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created successfully`);
    } else {
      console.log(`✅ Database '${dbName}' already exists`);
    }
    
    // Check if user exists
    console.log(`👤 Checking if user '${dbUser}' exists...`);
    const userCheckResult = await client.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [dbUser]
    );
    
    if (userCheckResult.rows.length === 0) {
      console.log(`👤 Creating user '${dbUser}'...`);
      await client.query(`CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'`);
      console.log(`✅ User '${dbUser}' created successfully`);
    } else {
      console.log(`✅ User '${dbUser}' already exists`);
    }
    
    // Grant privileges
    console.log(`🔐 Granting privileges to user '${dbUser}'...`);
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`);
    await client.query(`ALTER USER "${dbUser}" CREATEDB`);
    console.log(`✅ Privileges granted to user '${dbUser}'`);
    
    await client.end();
    
    // Now connect to the actual database and set up extensions
    console.log(`🔌 Connecting to database '${dbName}'...`);
    const dbClient = new Client({
      ...config,
      database: dbName
    });
    
    await dbClient.connect();
    
    // Create extensions if needed
    console.log('🔧 Setting up database extensions...');
    
    try {
      await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ UUID extension enabled');
    } catch (error) {
      console.log('ℹ️  UUID extension not available (optional)');
    }
    
    try {
      await dbClient.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
      console.log('✅ Trigram extension enabled for better search');
    } catch (error) {
      console.log('ℹ️  Trigram extension not available (optional)');
    }
    
    // Grant schema privileges
    await dbClient.query(`GRANT ALL ON SCHEMA public TO "${dbUser}"`);
    await dbClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${dbUser}"`);
    await dbClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${dbUser}"`);
    
    // Set default privileges for future tables
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`);
    
    console.log('✅ Schema privileges granted');
    
    await dbClient.end();
    
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Run migrations: npm run migrate');
    console.log('2. Seed data: npm run seed');
    console.log('3. Start the server: npm run dev');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure PostgreSQL is running and accessible:');
      console.log('- Check if PostgreSQL service is started');
      console.log('- Verify connection details in .env file');
      console.log('- Ensure PostgreSQL is listening on the correct port');
    }
    
    if (error.code === '28P01') {
      console.log('');
      console.log('💡 Authentication failed:');
      console.log('- Check your PostgreSQL username and password');
      console.log('- Verify DB_USER and DB_PASSWORD in .env file');
    }
    
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };