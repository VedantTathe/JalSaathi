// Load env for local/dev, or as a fallback if cloud environment variables are missing
if (process.env.NODE_ENV !== 'production' || !process.env.MONGODB_URI) {
  require('dotenv').config();
}

const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false); // Disable command buffering in serverless to prevent query hangs
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
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.length && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
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
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set');
  }
  if (cached.conn) return cached.conn;

  let uri = process.env.MONGODB_URI;
  if (uri && typeof uri === 'string') {
    uri = uri.trim();
    // Programmatically strip wrapping double or single quotes if pasted verbatim into Vercel
    if (uri.startsWith('"') && uri.endsWith('"')) {
      uri = uri.slice(1, -1);
    }
    if (uri.startsWith("'") && uri.endsWith("'")) {
      uri = uri.slice(1, -1);
    }
  }

  if (!cached.promise) {
    console.log("🔄 Connecting MongoDB...");

    cached.promise = mongoose.connect(uri, {
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
      cached.promise = null;
      cached.conn = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

async function connectWithTimeout(timeoutMs = 5000) {
  return Promise.race([
    connectDB(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB timeout')), timeoutMs)
    )
  ]);
}

// ===== HEALTH =====
app.get('/health', async (req, res) => {
  try {
    await connectWithTimeout(5000);
    res.json({ status: 'OK' });
  } catch (err) {
    console.error('❌ Health DB error:', err.message);
    res.status(503).json({ status: 'DB_UNAVAILABLE' });
  }
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
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    if (mongoose.connection.readyState !== 1) {
      await connectWithTimeout(5000);
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