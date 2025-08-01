// server.js - Railway Compatible Version
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

// Import middleware
const { authenticateToken, authorizeAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// RAILWAY FIX: Trust proxy for Railway deployment
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy enabled for Railway');
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression());

// RAILWAY FIX: Conditional Rate limiting
if (process.env.DISABLE_RATE_LIMIT !== 'true') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Terlalu banyak request, coba lagi nanti'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // RAILWAY FIX: Better proxy handling
    trustProxy: process.env.TRUST_PROXY === 'true'
  });
  app.use('/api/', limiter);
  console.log('✅ Rate limiting enabled');
} else {
  console.log('⚠️ Rate limiting disabled via environment variable');
}

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
      version: '1.0.0',
      trustProxy: app.get('trust proxy'),
      rateLimiting: process.env.DISABLE_RATE_LIMIT !== 'true'
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
      auth: '/api/auth',
      users: '/api/users',
      submissions: '/api/submissions'
    },
    documentation: 'https://api.ecomarga.com/docs'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/submissions', authenticateToken, submissionRoutes);

// Catch 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint tidak ditemukan',
    message: `Path ${req.originalUrl} tidak tersedia`,
    available_endpoints: [
      '/api/auth',
      '/api/users',
      '/api/submissions',
      '/health'
    ]
  });
});

// Enhanced error handler with Railway compatibility
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Rate limiting error specific handling
  if (err.code === 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR') {
    console.error('❌ Rate limiting trust proxy error - check TRUST_PROXY environment variable');
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan server',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      code: err.code 
    })
  });
});

// Start server with enhanced Railway compatibility
const startServer = async () => {
  try {
    console.log('🚀 Starting EcoMarga API Server...');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔗 DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('🛡️ Trust Proxy:', app.get('trust proxy'));
    console.log('⚡ Rate Limiting:', process.env.DISABLE_RATE_LIMIT !== 'true');
    
    // Test database connection with retry
    let dbConnected = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!dbConnected && attempts < maxAttempts) {
      attempts++;
      console.log(`🔍 Database connection attempt ${attempts}/${maxAttempts}...`);
      
      dbConnected = await testConnection();
      
      if (!dbConnected && attempts < maxAttempts) {
        console.log('⏳ Retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    if (!dbConnected) {
      console.error('❌ Database connection failed after', maxAttempts, 'attempts');
      console.log('💡 Debug info:');
      console.log('- NODE_ENV:', process.env.NODE_ENV);
      console.log('- DATABASE_URL present:', !!process.env.DATABASE_URL);
      
      // Start server anyway for debugging
      console.log('⚠️ Starting server without database for debugging...');
    } else {
      // Run migrations only if connected and not skipped
      if (process.env.SKIP_MIGRATION_ERROR !== 'true') {
        console.log('🔄 Running migrations...');
        const migrationSuccess = await initializeDatabase();
        if (!migrationSuccess) {
          console.log('⚠️ Migration failed, but continuing...');
        }
      } else {
        console.log('⚠️ Skipping migrations due to SKIP_MIGRATION_ERROR=true');
      }
    }
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Health check: https://ecomargabe-production.up.railway.app/health`);
      console.log(`📊 Database status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      console.log(`🛡️ Proxy trust: ${app.get('trust proxy')}`);
      console.log(`⚡ Rate limiting: ${process.env.DISABLE_RATE_LIMIT !== 'true' ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});