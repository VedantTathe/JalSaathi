const express = require('express');
const router = express.Router();

const authController = require('./controller');
const { authenticateToken } = require('../../middlewares/auth');
const { 
  registerValidation, 
  loginValidation, 
  providerRegistrationValidation,
  checkValidationErrors 
} = require('./validation');

// Public routes
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

// Protected routes
router.use(authenticateToken); // Apply authentication to all routes below

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);
router.get('/verify-token', authController.verifyToken);

module.exports = router;