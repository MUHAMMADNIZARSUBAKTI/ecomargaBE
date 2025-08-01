// server.js - Main server file for EcoMarga Backend API (Minimal Version)
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database configuration
const { testConnection, initializeDatabase, closeConnection } = require('./config/database');

// Import routes (only the ones that exist)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const submissionRoutes = require('./routes/submissions');
// const bankSampahRoutes = require('./routes/bankSampah');
// const adminRoutes = require('./routes/admin');
// const statsRoutes = require('./routes/stats');

// Import middleware
const { authenticateToken, authorizeAdmin } = require('./middleware/auth');
// const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Terlalu banyak request, coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbStatus = await testConnection();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: dbStatus ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'EcoMarga API',
    version: '1.0.0',
    description: 'Backend API for EcoMarga Bank Sampah Application',
    endpoints: {
      // auth: '/api/auth',
      // users: '/api/users',
      submissions: '/api/submissions',
      // bank_sampah: '/api/bank-sampah',
      // admin: '/api/admin',
      // stats: '/api/stats'
    },
    documentation: 'https://api.ecomarga.com/docs'
  });
});

// API Routes (only enabled ones)
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/submissions', authenticateToken, submissionRoutes);
// app.use('/api/bank-sampah', bankSampahRoutes);
// app.use('/api/stats', authenticateToken, statsRoutes);
// app.use('/api/admin', authenticateToken, authorizeAdmin, adminRoutes);

// Catch 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint tidak ditemukan',
    message: `Path ${req.originalUrl} tidak tersedia`,
    available_endpoints: [
      // '/api/auth',
      // '/api/users',
      '/api/submissions',
      // '/api/bank-sampah',
      // '/api/admin',
      // '/api/stats',
      '/health'
    ]
  });
});

// Simple error handler (since errorHandler middleware might not exist yet)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server with database initialization
const startServer = async () => {
  try {
    console.log('🚀 Starting EcoMarga API Server (Minimal Version)...');
    
    // Test database connection
    console.log('🔍 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed. Server cannot start.');
      console.log('💡 Make sure PostgreSQL is running and .env is configured correctly.');
      process.exit(1);
    }
    
    // Initialize database (run migrations and seeds)
    if (process.env.NODE_ENV !== 'production' || process.env.AUTO_MIGRATE === 'true') {
      console.log('🔄 Initializing database...');
      const dbInitialized = await initializeDatabase();
      
      if (!dbInitialized) {
        console.warn('⚠️  Database initialization failed, but server will start anyway.');
      }
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
      console.log(`📱 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api`);
      console.log('');
      console.log('📝 Available endpoints:');
      console.log('   - GET  /health');
      console.log('   - GET  /api');
      console.log('   - POST /api/submissions (requires auth)');
      console.log('   - GET  /api/submissions (requires auth)');
      console.log('');
      console.log('⚠️  This is a minimal version. Some routes are disabled.');
      console.log('   Enable routes in server.js as you create the required files.');
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async (err) => {
        if (err) {
          console.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('HTTP server closed.');
        
        // Close database connections
        await closeConnection();
        
        console.log('Graceful shutdown complete.');
        process.exit(0);
      });
    };

    // Handle termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();