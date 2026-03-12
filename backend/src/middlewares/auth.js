const jwt = require('jsonwebtoken');
const User = require('../modules/user/model');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('[authenticateToken] Auth header:', authHeader ? 'Present' : 'Missing');
  console.log('[authenticateToken] Token:', token ? 'Extracted' : 'Not found');

  if (!token) {
    console.log('[authenticateToken] No token - returning 401');
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[authenticateToken] Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('[authenticateToken] User not found in DB - returning 401');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[authenticateToken] User found:', { id: user._id, role: user.role, email: user.email });
    req.user = user;
    next();
  } catch (error) {
    console.log('[authenticateToken] Token verification failed:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Authorization middleware for specific roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log('[authorizeRoles] Checking roles:', roles);
    console.log('[authorizeRoles] req.user exists?', !!req.user);
    console.log('[authorizeRoles] User role:', req.user?.role);
    
    if (!req.user) {
      console.log('[authorizeRoles] No user found - returning 401');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log('[authorizeRoles] Role check failed - returning 403');
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    
    console.log('[authorizeRoles] Authorization successful');
    next();
  };
};

// Check if provider is online (for customers placing orders)
const checkProviderOnline = async (req, res, next) => {
  try {
    console.log('🔒 [MIDDLEWARE] checkProviderOnline - User:', req.user?._id, 'Provider:', req.body.providerId);
    
    // Check for recent pending/failed online orders (1-minute cooldown)
    const Order = require('../modules/order/model');
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    
    // Find the most recent pending or failed online payment order
    const recentPendingOrder = await Order.findOne({
      customerId: req.user._id,
      paymentMethod: 'online',
      $or: [
        { paymentStatus: 'pending', status: 'pending' },
        { paymentStatus: 'failed', status: 'failed' }
      ],
      createdAt: { $gte: oneMinuteAgo }
    }).sort({ createdAt: -1 });

    console.log('📅 Current time:', new Date().toISOString());
    console.log('📅 One minute ago:', oneMinuteAgo.toISOString());

    if (recentPendingOrder) {
      const orderTime = new Date(recentPendingOrder.createdAt);
      const timeSinceOrder = Date.now() - orderTime.getTime();
      
      console.log('⏱️ [MIDDLEWARE] Found recent pending/failed order:', {
        orderId: recentPendingOrder._id,
        paymentStatus: recentPendingOrder.paymentStatus,
        status: recentPendingOrder.status,
        createdAt: recentPendingOrder.createdAt.toISOString(),
        timeSinceOrderMs: timeSinceOrder,
        timeSinceOrderSec: Math.floor(timeSinceOrder / 1000)
      });
      
      if (timeSinceOrder < 60000) {
        const timeLeft = Math.ceil((60000 - timeSinceOrder) / 1000);
        console.log('⛔ [MIDDLEWARE] BLOCKING ORDER - cooldown:', timeLeft, 'seconds remaining');
        return res.status(429).json({
          success: false,
          message: `Please wait ${timeLeft} seconds before placing a new order. Your previous payment is still pending.`,
          data: { waitTime: timeLeft, orderId: recentPendingOrder._id }
        });
      } else {
        console.log('✅ [MIDDLEWARE] Cooldown expired (' + Math.floor(timeSinceOrder/1000) + 's ago), allowing order');
      }
    } else {
      console.log('✅ [MIDDLEWARE] No recent pending/failed orders found, allowing order');
    }
    
    const Provider = require('../modules/provider/model');
    const provider = await Provider.findById(req.body.providerId);

    // Treat missing paymentMethod as COD by default (frontend defaults to COD)
    const paymentMethod = (req.body.paymentMethod || 'cash_on_delivery').toString().toLowerCase();

    // Allow Cash on Delivery orders regardless of provider's online flag
    if (paymentMethod === 'cash_on_delivery') {
      if (!provider) {
        console.log('❌ [MIDDLEWARE] Provider not found');
        return res.status(400).json({ success: false, message: 'Provider not found' });
      }
      console.log('✅ [MIDDLEWARE] COD order - passing through');
      return next();
    }

    if (!provider || !provider.isOnline) {
      console.log('❌ [MIDDLEWARE] Provider offline or not found');
      return res.status(400).json({
        success: false,
        message: 'Provider is currently offline and not accepting orders'
      });
    }

    console.log('✅ [MIDDLEWARE] Provider online - passing to controller');
    next();
  } catch (error) {
    console.error('❌ [MIDDLEWARE] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking provider status'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  checkProviderOnline
};