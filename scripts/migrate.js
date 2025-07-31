const { db, testConnection } = require('../config/database');
require('dotenv').config();

async function runMigrations(direction = 'latest') {
  try {
    console.log('🔍 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Database connection failed. Please check your configuration.');
      process.exit(1);
    }
    
    console.log('🔄 Running migrations...');
    
    if (direction === 'latest' || direction === 'up') {
      await db.migrate.latest();
      console.log('✅ Migrations completed successfully');
      
      // Show migration status
      const [batchNo, completed] = await db.migrate.currentVersion();
      console.log(`📊 Current migration batch: ${batchNo}`);
      console.log(`📁 Completed migrations: ${completed.length}`);
      
    } else if (direction === 'rollback' || direction === 'down') {
      const [batchNo, log] = await db.migrate.rollback();
      if (log.length === 0) {
        console.log('ℹ️  No migrations to rollback');
      } else {
        console.log(`✅ Rolled back batch ${batchNo}:`);
        log.forEach(migration => {
          console.log(`  - ${migration}`);
        });
      }
      
    } else if (direction === 'status') {
      const completed = await db.migrate.list();
      console.log('📋 Migration Status:');
      console.log(`Completed: ${completed[0].length} migrations`);
      console.log(`Pending: ${completed[1].length} migrations`);
      
      if (completed[0].length > 0) {
        console.log('\n✅ Completed migrations:');
        completed[0].forEach(migration => {
          console.log(`  - ${migration}`);
        });
      }
      
      if (completed[1].length > 0) {
        console.log('\n⏳ Pending migrations:');
        completed[1].forEach(migration => {
          console.log(`  - ${migration}`);
        });
      }
      
    } else {
      console.error('❌ Invalid direction. Use: latest, up, down, rollback, or status');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure PostgreSQL is running and accessible');
    }
    
    if (error.code === '42P01') {
      console.log('💡 Tables not found. Make sure database is properly set up.');
    }
    
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const direction = args[0] || 'latest';

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log('Migration Management Script');
  console.log('');
  console.log('Usage: node scripts/migrate.js [direction]');
  console.log('');
  console.log('Directions:');
  console.log('  latest, up    - Run all pending migrations (default)');
  console.log('  rollback, down - Rollback the last batch of migrations');
  console.log('  status        - Show migration status');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/migrate.js');
  console.log('  node scripts/migrate.js up');
  console.log('  node scripts/migrate.js rollback');
  console.log('  node scripts/migrate.js status');
  process.exit(0);
}

// Run migrations
if (require.main === module) {
  runMigrations(direction).catch(console.error);
}

module.exports = { runMigrations };