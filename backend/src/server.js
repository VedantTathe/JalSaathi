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
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
// Middleware - CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5174',
  'https://jalsaathived.vercel.app',
  'https://d1wl5h07d7rj0z.cloudfront.net'
];

// Respond to CORS preflight requests early with correct headers
app.options('*', (req, res) => {
  const origin = req.headers.origin || process.env.FRONTEND_URL || allowedOrigins[0];
  if (process.env.NODE_ENV === 'production' && allowedOrigins.indexOf(origin) === -1) {
    // Do not allow unknown origins in production
    return res.status(403).send('Origin not allowed');
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  return res.sendStatus(200);
});

if (process.env.NODE_ENV !== 'production') {
  // In development allow all origins to avoid CORS issues with local ports
  app.use(cors({ origin: true, credentials: true }));
} else {
  app.use(cors({
    origin: function(origin, callback) {
      // allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    },
    credentials: true,
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
    const requestOrigin = req.headers.origin || process.env.FRONTEND_URL || 'https://jalsaathived.vercel.app';
    // Allow missing origin (curl, mobile apps)
    if (!req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    } else if (process.env.NODE_ENV !== 'production' || allowedOrigins.indexOf(req.headers.origin) !== -1) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jalsaathi')
.then(() => {
  console.log('✅ MongoDB connected successfully');
  
  // Initialize cron jobs after successful database connection
  initializeCronJobs();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

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

// Start server (local development only - uncomment to run locally)
// NOTE: Keep this commented when deploying to AWS Lambda / API Gateway.
// If the file is executed directly (node src/server.js), start a local HTTP server.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 JalSaathi Backend Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  });
}

// Export the Express app for local testing and the Lambda handler for serverless deployments
module.exports = app;
module.exports.handler = serverless(app);