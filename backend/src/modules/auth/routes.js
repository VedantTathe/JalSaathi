const express = require('express');
const router = express.Router();

const authController = require('./controller');
const { authenticateToken } = require('../../middlewares/auth');
const { 
  registerValidation, 
  loginValidation, 
  providerRegistrationValidation,
  otpVerificationValidation,
  resendOTPValidation,
  sendLoginOTPValidation,
  sendPasswordResetOTPValidation,
  checkValidationErrors 
} = require('./validation');

// Public routes
// New OTP-based registration flow
router.post('/send-otp', 
  registerValidation,
  checkValidationErrors,
  authController.sendRegistrationOTP
);

router.post('/verify-otp',
  otpVerificationValidation,
  checkValidationErrors,
  authController.verifyEmailAndRegister
);

router.post('/resend-otp',
  resendOTPValidation,
  checkValidationErrors,
  authController.resendOTP
);

// Legacy registration routes (kept for backward compatibility)
router.post('/register', 
  registerValidation,
  checkValidationErrors,
  authController.register
);

router.post('/register/provider',
  providerRegistrationValidation,
  checkValidationErrors,
  authController.register
);

router.post('/login',
  loginValidation,
  checkValidationErrors,
  authController.login
);

// Login with OTP (passwordless login)
router.post('/login/send-otp',
  sendLoginOTPValidation,
  checkValidationErrors,
  authController.sendLoginOTP
);

router.post('/login/verify-otp',
  otpVerificationValidation,
  checkValidationErrors,
  authController.verifyLoginOTP
);

// Forgot password routes
router.post('/forgot-password/send-otp',
  sendPasswordResetOTPValidation,
  checkValidationErrors,
  authController.sendPasswordResetOTP
);

router.post('/forgot-password/verify-otp',
  otpVerificationValidation,
  checkValidationErrors,
  authController.verifyPasswordResetOTP
);

router.post('/forgot-password/reset',
  authController.resetPassword
);

// Public route to verify token (frontend calls this on app load)
router.get('/verify-token', authController.verifyToken);

// Protected routes
router.use(authenticateToken); // Apply authentication to all routes below

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);
router.post('/add-to-home-screen', authController.updateAddToHomeScreenStatus);

module.exports = router;