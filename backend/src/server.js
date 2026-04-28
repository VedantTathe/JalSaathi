require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

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

// Global fallback CORS headers to ensure every response (including errors)
// and preflight (OPTIONS) receive the necessary Access-Control-* headers.
// This runs before other middlewares to guard against platform-level stripping
// or early returns that would otherwise omit CORS headers.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  // Allow credentials only if explicitly configured
  // (Using '*' with credentials is disallowed by browsers)
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
const PORT = process.env.PORT || 5000;

// Trust proxy for API Gateway
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
// Middleware - CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://localhost:5173',
  'https://jalsaathived.vercel.app',
  'https://d1wl5h07d7rj0z.cloudfront.net',
  'https://d2jz2lz6xmw1no.cloudfront.net',  // Production CloudFront URL
  'http://jalsaathistack-jalsaathibucketcdea0c72-zt1kesivxa1a.s3-website.ap-south-1.amazonaws.com',  // S3 Static Website
  // Add any S3 website URLs dynamically
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

// Respond to CORS preflight requests early with correct headers
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  return res.sendStatus(200);
});

if (process.env.NODE_ENV !== 'production') {
  // In development allow all origins to avoid CORS issues with local ports
  app.use(cors({ origin: true, credentials: true }));
} else {
  // In production, allow all origins (*)
  app.use(cors({
    origin: '*',  // Allow all origins
    credentials: false,  // Can't use credentials with '*'
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept']
  }));
}

  // Optional debug logging for requests (enable by setting DEBUG_API=true in env)
  if (process.env.DEBUG_API === 'true') {
    app.use((req, res, next) => {
      try {
        console.log('== Incoming Request ==');
        console.log('Method:', req.method, 'URL:', req.originalUrl);
        console.log('Origin:', req.headers.origin);
        console.log('Headers:', JSON.stringify(req.headers));
      } catch (e) {
        console.error('Failed to log request headers', e);
      }
      next();
    });
  }

  // Fallback CORS headers (makes sure preflight is handled even if hosting strips headers)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
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

// Database connection - optimized for both Vercel and AWS Lambda
const mongooseOptions = {
  maxPoolSize: process.env.DEPLOYMENT_TARGET === 'aws' ? 5 : 1,  // Lambda can handle more connections
  minPoolSize: 0,
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 10000,  // Increased for cold starts
  socketTimeoutMS: 55000,            // Lambda timeout is 60s
  connectTimeoutMS: 15000,           // Increased for connection establishment
  waitQueueTimeoutMS: 30000,         // Increased wait time
  family: 4,                         // Force IPv4 for stability
  retryWrites: true,
  retryReads: true,
  useUnifiedTopology: true
};

// Increase Mongoose buffer timeout for serverless cold starts
mongoose.set('bufferTimeoutMS', process.env.DEPLOYMENT_TARGET === 'aws' ? 45000 : 30000);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jalsaathi', mongooseOptions)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('🚀 Vercel connection pool configured');
  
  // Note: Cron jobs disabled on Vercel - use external scheduler instead
  // (Each Vercel invocation is isolated, cron won't persist between calls)
  if (process.env.NODE_ENV !== 'production') {
    initializeCronJobs();
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('📝 Check MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'JalSaathi Backend is running',
    timestamp: new Date().toISOString()
  });
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

// Always export both the Express `app` and a serverless `handler`.
// This ensures the app works locally (`node src/server.js`), on AWS Lambda,
// and on Vercel Serverless Functions which expect a handler export.
try {
  module.exports.app = app;
  module.exports.handler = serverless(app);
  console.log('🔧 Exported serverless handler and app');
} catch (err) {
  console.error('⚠️ Failed to export serverless handler:', err);
  // Fallback: export only the app
  module.exports = app;
}

// Additional platform-specific logging
if (DEPLOYMENT_TARGET === 'aws') {
  console.log('🔧 Deployment target: AWS Lambda/API Gateway (handler available)');
} else {
  console.log('🔧 Deployment target: Vercel or local (handler available)');
}