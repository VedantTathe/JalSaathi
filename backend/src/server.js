// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
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

// ===== GLOBAL ERROR HANDLERS =====
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

// ===== CORS HANDLING =====
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ===== SECURITY =====
app.use(helmet());

// ===== RATE LIMIT =====
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// ===== BODY PARSER =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== LOGGING =====
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// ===== ROUTES =====
app.get('/', (req, res) => {
  res.json({
    name: 'JalSaathi Backend',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    dbConnected: mongoose.connection.readyState === 1
  });
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/provider', authenticateToken, providerRoutes);
app.use('/api/order', authenticateToken, orderRoutes);
app.use('/api/delivery', authenticateToken, deliveryRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/address', authenticateToken, addressRoutes);
app.use('/api/settlement', authenticateToken, settlementRoutes);

// webhook
app.use('/api/webhook', paymentWebhook);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// error handler
app.use(errorHandler);

// ===== DATABASE + SERVER START =====
const startServer = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ MongoDB connected');

    // Start cron jobs (only once)
    if (process.env.NODE_ENV !== 'production') {
      initializeCronJobs();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();