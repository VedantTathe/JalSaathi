const jwt = require('jsonwebtoken');

// Validate JWT_SECRET on startup
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
  console.error('   Set JWT_SECRET before starting the server');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Generate JWT token
const generateToken = (userId, role) => {
  // Double-check JWT_SECRET exists (defensive programming)
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Cannot generate authentication token.');
  }
  
  return jwt.sign(
    { userId, role }, 
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate response with token
const generateTokenResponse = (user) => {
  const token = generateToken(user._id, user.role);
  
  return {
    success: true,
    message: 'Authentication successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      specialNotes: user.specialNotes,
      addedToHomeScreen: user.addedToHomeScreen
    },
    token
  };
};

// Calculate distance between two coordinates (simple approximation)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// Format response
const formatResponse = (success, message, data = null, statusCode = 200) => {
  const response = {
    success,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return { response, statusCode };
};

module.exports = {
  generateToken,
  generateTokenResponse,
  calculateDistance,
  formatResponse
};