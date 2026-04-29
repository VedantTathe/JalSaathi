const AuthService = require('./service');
const { asyncHandler } = require('../../middlewares/errorHandler');
const jwt = require('jsonwebtoken');
const User = require('../user/model');

// Send registration OTP
const sendRegistrationOTP = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AuthService.sendRegistrationOTP(req.body);
  res.status(statusCode).json(response);
});

// Verify OTP and complete registration
const verifyEmailAndRegister = asyncHandler(async (req, res) => {
  const { email, otp, registrationData } = req.body;
  
  // Validate required fields
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required'
    });
  }

  // Validate OTP format (must be 6 digits)
  if (!/^\d{6}$/.test(String(otp).trim())) {
    return res.status(400).json({
      success: false,
      message: 'OTP must be exactly 6 digits'
    });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address'
    });
  }
  
  const { response, statusCode } = await AuthService.verifyEmailAndRegister(email, otp, registrationData);
  res.status(statusCode).json(response);
});

// Resend OTP
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  
  const { response, statusCode } = await AuthService.resendOTP(email);
  res.status(statusCode).json(response);
});

// Send login OTP
const sendLoginOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  
  const { response, statusCode } = await AuthService.sendLoginOTP(email);
  res.status(statusCode).json(response);
});

// Verify login OTP
const verifyLoginOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  
  // Validate required fields
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required'
    });
  }

  // Validate OTP format (must be 6 digits)
  if (!/^\d{6}$/.test(String(otp).trim())) {
    return res.status(400).json({
      success: false,
      message: 'OTP must be exactly 6 digits'
    });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address'
    });
  }
  
  const { response, statusCode } = await AuthService.verifyLoginOTP(email, otp);
  res.status(statusCode).json(response);
});

// Register a new user (DEPRECATED - kept for backward compatibility)
const register = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AuthService.register(req.body);
  res.status(statusCode).json(response);
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;
  const identifier = email || phone || req.body.identifier;
  const { response, statusCode } = await AuthService.login(identifier, password);
  res.status(statusCode).json(response);
});

// Get current user profile
const getProfile = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AuthService.getProfile(req.user._id);
  res.status(statusCode).json(response);
});

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AuthService.updateProfile(req.user._id, req.body);
  res.status(statusCode).json(response);
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters long'
    });
  }
  
  const { response, statusCode } = await AuthService.changePassword(
    req.user._id, 
    currentPassword, 
    newPassword
  );
  res.status(statusCode).json(response);
});

// Logout (client-side token removal, but we can track for analytics)
const logout = asyncHandler(async (req, res) => {
  // In a more complex system, we might store token blacklist
  // For now, just return success as JWT is stateless
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Verify token endpoint
const verifyToken = asyncHandler(async (req, res) => {
  // Get token from Authorization header (manually verify since this is now a public route)
  const token = req.headers.authorization?.split(' ')[1];
  
  console.log('🔐 [verifyToken] Token verification requested');

  if (!token) {
    console.log('🔐 [verifyToken] ⚠️  No token provided in request');
    return res.status(200).json({
      success: false,
      message: 'No token provided',
      user: null
    });
  }

  try {
    console.log('🔐 [verifyToken] 🔍 Verifying JWT token...');
    // Verify token manually
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 [verifyToken] ✅ Token decoded. UserId:', decoded.userId);
    
    // Fetch user data (token stores userId, not id)
    const user = await User.findById(decoded.userId).select('-password -emailVerificationOTP -otpExpiry');
    
    if (!user) {
      console.log('🔐 [verifyToken] ❌ User not found for userId:', decoded.userId);
      return res.status(200).json({
        success: false,
        message: 'User not found',
        user: null
      });
    }

    console.log('🔐 [verifyToken] ✅ User found:', user.email, 'Role:', user.role);
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        addedToHomeScreen: user.addedToHomeScreen
      }
    });
  } catch (error) {
    // Token is invalid or expired
    console.error('🔐 [verifyToken] ❌ Token verification failed:', error.message);
    console.error('🔐 [verifyToken] Error type:', error.name);
    res.status(200).json({
      success: false,
      message: 'Token is invalid or expired',
      user: null
    });
  }
});

// Send password reset OTP
const sendPasswordResetOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  
  const { response, statusCode } = await AuthService.sendPasswordResetOTP(email);
  res.status(statusCode).json(response);
});

// Verify password reset OTP
const verifyPasswordResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  
  // Validate required fields
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required'
    });
  }

  // Validate OTP format (must be 6 digits)
  if (!/^\d{6}$/.test(String(otp).trim())) {
    return res.status(400).json({
      success: false,
      message: 'OTP must be exactly 6 digits'
    });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address'
    });
  }
  
  const { response, statusCode } = await AuthService.verifyPasswordResetOTP(email, otp);
  res.status(statusCode).json(response);
});

// Reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  
  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, OTP, and new password are required'
    });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters'
    });
  }
  
  const { response, statusCode } = await AuthService.resetPassword(email, otp, newPassword);
  res.status(statusCode).json(response);
});

// Update add to home screen status
const updateAddToHomeScreenStatus = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AuthService.updateAddToHomeScreenStatus(req.user._id);
  res.status(statusCode).json(response);
});

module.exports = {
  sendRegistrationOTP,
  verifyEmailAndRegister,
  resendOTP,
  sendLoginOTP,
  verifyLoginOTP,
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
  updateAddToHomeScreenStatus
};