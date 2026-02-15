const AuthService = require('./service');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Register a new user
const register = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AuthService.register(req.body);
  res.status(statusCode).json(response);
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { response, statusCode } = await AuthService.login(email, password);
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
  // If we reach here, token is valid (middleware already verified it)
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken
};