const { body, validationResult } = require('express-validator');

// Validation rules for user registration
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
    
  body('role')
    .isIn(['customer', 'provider', 'delivery'])
    .withMessage('Invalid role specified'),
    
  body('address.street')
    .optional()
    .if(body('role').equals('provider'))
    .notEmpty()
    .withMessage('Street address is required for providers'),
    
  body('address.area')
    .optional()
    .if(body('role').equals('provider'))
    .notEmpty()
    .withMessage('Area is required for providers'),
    
  body('address.city')
    .optional()
    .if(body('role').equals('provider'))
    .notEmpty()
    .withMessage('City is required for providers'),
    
  body('address.pincode')
    .optional()
    .if(body('role').equals('provider'))
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Pincode must be 6 digits for providers')
];

// Validation rules for user login
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for provider registration
const providerRegistrationValidation = [
  ...registerValidation,
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
    
  body('pricePerCan')
    .isFloat({ min: 1 })
    .withMessage('Price per can must be greater than 0'),
    
  body('serviceRadius')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Service radius must be between 1 and 50 km')
];

// Check for validation errors
const checkValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules for OTP verification
const otpVerificationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
    
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP must be exactly 6 digits'),
    
  body('registrationData')
    .optional()
    .isObject()
    .withMessage('Registration data must be an object')
];

// Validation rules for resend OTP
const resendOTPValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

// Validation rules for send login OTP
const sendLoginOTPValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

// Validation rules for send password reset OTP
const sendPasswordResetOTPValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

module.exports = {
  registerValidation,
  loginValidation,
  providerRegistrationValidation,
  checkValidationErrors,
  otpVerificationValidation,
  resendOTPValidation,
  sendLoginOTPValidation,
  sendPasswordResetOTPValidation
};