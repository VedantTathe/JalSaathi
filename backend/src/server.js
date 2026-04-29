// Load environment variables if present; don't crash if .env is missing in platform
try {
  const envPath = require('path').join(__dirname, '../.env');
  require('dotenv').config({ path: envPath });
} catch (e) {
  console.warn('⚠️ dotenv load warning:', e && e.message ? e.message : e);
}

const serverless = require("serverless-http");

// Debug: Log environment variables
console.log('🔍 Environment check:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Loaded' : '❌ Missing');
console.log('PORT:', process.env.PORT);

// Global process-level error handlers to prevent silent function crashes
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/user/routes');
const providerRoutes = require('./modules/provider/routes');
const orderRoutes = require('./modules/order/routes');
const deliveryRoutes = require('./modules/delivery/routes');
const adminRoutes = require('./modules/admin/routes');
const addressRoutes = require('./modules/address/routes');
const settlementRoutes = require('./modules/settlement/routes');
const paymentWebhook = require('./modules/payment/webhook');

// Import middlewares
const { errorHandler } = require('./middlewares/errorHandler');
const { authenticateToken } = require('./middlewares/auth');

// Import utilities
const { initializeCronJobs } = require('./utils/cronJobs');

const app = express();

// === CRITICAL: Handle preflight OPTIONS requests FIRST ===
// This MUST be before helmet() and other middlewares
app.use((req, res, next) => {
  // CORS headers for ALL responses
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  
  // Return 200 for preflight OPTIONS immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const PORT = process.env.PORT || 5000;

// Trust proxy for API Gateway
app.set('trust proxy', 1);

// Security middleware - configure to not interfere with CORS
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));

// CORS already handled by early middleware above
// Add explicit OPTIONS handler for all routes as backup
app.options('*', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.status(200).end();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Keep raw body for webhook signature verification
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Intercept response to log status
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? '❌' : (res.statusCode >= 300 ? '⚠️ ' : '✅');
    const method = req.method.padEnd(6);
    const status = res.statusCode.toString().padEnd(3);
    const path = req.path.substring(0, 50).padEnd(50);
    
    console.log(`${logLevel} [${method}] [${status}] ${path} (${duration}ms)`);
    
    if (res.statusCode >= 400) {
      console.log(`   └─ Error details:`, data?.message || data || 'No error message');
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// Database connection - optimized for both Vercel and AWS Lambda
const mongooseOptions = {
  maxPoolSize: 1,  // Vercel: keep pool small (1 connection per invocation)
  minPoolSize: 0,  // No persistent connections between invocations
  maxIdleTimeMS: 10000,  // Close idle connections quickly
  serverSelectionTimeoutMS: 5000,  // Quick fail if MongoDB unreachable
  socketTimeoutMS: 10000,  // Tight socket timeout for Vercel
  connectTimeoutMS: 5000,  // Quick connection timeout
  waitQueueTimeoutMS: 5000,  // Fail fast if queue is full
  family: 4,  // Force IPv4
  retryWrites: true,
  retryReads: true,
  useUnifiedTopology: true
};

// Increase Mongoose buffer timeout for serverless cold starts
mongoose.set('bufferTimeoutMS', 10000);

// Flag to track if we've already started connection
let dbConnectAttempted = false;

// Lazy connect to database - happens in background, doesn't block handler export
const connectToDatabase = async () => {
  if (dbConnectAttempted) return;
  dbConnectAttempted = true;
  
  try {
    console.log('🔄 Attempting MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jalsaathi', mongooseOptions);
    console.log('✅ MongoDB connected successfully');
    console.log('🚀 Vercel connection pool configured');
    
    if (process.env.NODE_ENV !== 'production') {
      initializeCronJobs();
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('📝 Check MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
  }
};

// Start database connection in background (don't await - returns immediately)
setImmediate(() => connectToDatabase());

// Health check endpoint
app.get('/health', (req, res) => {
  // Trigger DB connection on first request if not already attempted
  if (!dbConnectAttempted) {
    connectToDatabase();
  }
  res.status(200).json({ 
    status: 'OK', 
    message: 'JalSaathi Backend is running',
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1
  });
});

// Lightweight ping for readiness and to verify CORS from platform
app.get('/api/ping', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ok: true, time: Date.now() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/provider', authenticateToken, providerRoutes);
app.use('/api/order', authenticateToken, orderRoutes);
app.use('/api/delivery', authenticateToken, deliveryRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/address', authenticateToken, addressRoutes);
app.use('/api/settlement', authenticateToken, settlementRoutes);

// Webhook endpoint (public) - verify using raw body
app.use('/api/webhook', paymentWebhook);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// Error handling middleware
app.use(errorHandler);

// Detect deployment platform
const DEPLOYMENT_TARGET = process.env.DEPLOYMENT_TARGET || 'vercel'; // Default to Vercel

console.log(`📦 Deployment Target: ${DEPLOYMENT_TARGET.toUpperCase()}`);

// Start server (local development only)
// If file is executed directly (node src/server.js), start HTTP server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 JalSaathi Backend Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  });
}

// Export: Vercel requires DEFAULT export to be a function (serverless handler)
// For local dev, the handler can also start an HTTP server if run directly
const handler = serverless(app);
module.exports = handler;
module.exports.handler = handler;
module.exports.app = app;
console.log('🔧 Exported serverless handler as default export (required by Vercel)');