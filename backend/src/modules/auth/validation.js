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
    .if(body('role').isIn(['customer', 'provider']))
    .notEmpty()
    .withMessage('Street address is required'),
    
  body('address.area')
    .if(body('role').isIn(['customer', 'provider']))
    .notEmpty()
    .withMessage('Area is required'),
    
  body('address.city')
    .if(body('role').isIn(['customer', 'provider']))
    .notEmpty()
    .withMessage('City is required'),
    
  body('address.pincode')
    .if(body('role').isIn(['customer', 'provider']))
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Pincode must be 6 digits')
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

module.exports = {
  registerValidation,
  loginValidation,
  providerRegistrationValidation,
  checkValidationErrors
};