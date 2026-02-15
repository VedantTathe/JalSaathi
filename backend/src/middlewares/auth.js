const jwt = require('jsonwebtoken');
const User = require('../modules/user/model');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Authorization middleware for specific roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

// Check if provider is online (for customers placing orders)
const checkProviderOnline = async (req, res, next) => {
  try {
    const Provider = require('../modules/provider/model');
    const provider = await Provider.findById(req.body.providerId);
    
    if (!provider || !provider.isOnline) {
      return res.status(400).json({
        success: false,
        message: 'Provider is currently offline and not accepting orders'
      });
    }
    
    next();
  } catch (error) {
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