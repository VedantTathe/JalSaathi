// Load env for local/dev only
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/user/routes');
const providerRoutes = require('./modules/provider/routes');
const orderRoutes = require('./modules/order/routes');
const deliveryRoutes = require('./modules/delivery/routes');
const adminRoutes = require('./modules/admin/routes');
const addressRoutes = require('./modules/address/routes');
const settlementRoutes = require('./modules/settlement/routes');
const paymentWebhook = require('./modules/payment/webhook');

// Middlewares
const { errorHandler } = require('./middlewares/errorHandler');
const { authenticateToken } = require('./middlewares/auth');

const app = express();

// Trust the first proxy (needed on Vercel/Heroku/NGINX)
app.set('trust proxy', 1);

// ===== CORS FIRST =====
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ===== SECURITY =====
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));

// ===== RATE LIMIT =====
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// ===== BODY =====
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

// ===== LOGGING =====
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ===== DB CONNECTION (CACHED) =====
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  console.log("ENV URI exists:", !!process.env.MONGODB_URI);
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    console.log("🔄 Connecting MongoDB...");

    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 5000,
  family: 4,        // 🔥 IMPORTANT FIX
  maxPoolSize: 5
}).then(m => {
      console.log("✅ MongoDB connected");
      return m;
    }).catch(err => {
      console.error("❌ MongoDB error:", err);
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ===== HEALTH =====
app.get('/health', async (req, res) => {
  await connectDB();
  res.json({ status: 'OK' });
});

// ===== BASIC =====
app.get('/', (req, res) => {
  res.json({ name: 'JalSaathi Backend', status: 'running' });
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// ===== ROUTES (WITH DB ENSURE) =====
app.use('/api', async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await Promise.race([
        connectDB(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB timeout')), 5000)
        )
      ]);
    }
    next();
  } catch (err) {
    console.error('❌ DB ERROR:', err.message);
    return res.status(500).json({ message: 'Database connection failed' });
  }
});

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

// ===== 404 =====
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// ===== ERROR =====
app.use(errorHandler);

// ===== EXPORTS =====
const handler = serverless(app);

module.exports = {
  app,
  handler
};

// ===== LOCAL START =====
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}