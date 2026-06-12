const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['customer', 'provider', 'delivery', 'admin'],
    default: 'customer',
    required: true
  },
  address: {
    street: {
      type: String,
      required: function() {
        return this.role === 'provider';
      }
    },
    area: {
      type: String,
      required: function() {
        return this.role === 'provider';
      }
    },
    city: {
      type: String,
      required: function() {
        return this.role === 'provider';
      }
    },
    pincode: {
      type: String,
      required: function() {
        return this.role === 'provider';
      },
      match: [/^\d{6}$/, 'Pincode must be 6 digits']
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  specialNotes: {
    type: String,
    maxlength: [500, 'Special notes cannot exceed 500 characters'],
    default: ''
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For delivery partners - assigned by provider later
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    default: null
  },
  // Email verification fields
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: {
    type: String,
    select: false // Don't include OTP in queries by default
  },
  otpExpiry: {
    type: Date,
    select: false // Don't include OTP expiry in queries by default
  },
  // Add to home screen tracking
  addedToHomeScreen: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for geospatial queries
userSchema.index({ "address.coordinates": "2dsphere" });

// Make email unique but sparse so delivery users can omit email
userSchema.index({ email: 1 }, { unique: true, sparse: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's been modified (or is new)
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate and set OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationOTP = otp;
  this.otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
  return otp;
};

// Instance method to verify OTP
userSchema.methods.verifyOTP = function(enteredOTP) {
  // Normalize and validate the entered OTP
  if (!enteredOTP) {
    console.log('❌ No OTP provided');
    return false;
  }

  // Convert to string and remove whitespace
  const normalizedEntered = String(enteredOTP).trim();

  // Validate OTP format (must be 6 digits)
  if (!/^\d{6}$/.test(normalizedEntered)) {
    console.log(`❌ Entered OTP has invalid format: "${normalizedEntered}"`);
    return false;
  }

  // --- ADDED TESTING BYPASS ---
  if (process.env.TEST_MODE === 'true' && normalizedEntered === '000000') {
    console.log(`✅ TEST MODE: Bypass OTP verification for: "${normalizedEntered}"`);
    return true;
  }

  // Validate OTP exists
  if (!this.emailVerificationOTP || !this.otpExpiry) {
    console.log('❌ OTP not found on user record');
    return false;
  }

  // Check if OTP has expired
  if (Date.now() > this.otpExpiry) {
    console.log('❌ OTP has expired');
    console.log('   Current time:', new Date(Date.now()));
    console.log('   OTP expiry:', new Date(this.otpExpiry));
    return false;
  }

  const normalizedStored = String(this.emailVerificationOTP).trim();

  // Compare OTPs
  const isValid = normalizedStored === normalizedEntered;
  console.log(`🔍 OTP Verification:
    Entered: "${normalizedEntered}" (${typeof normalizedEntered})
    Stored:  "${normalizedStored}" (${typeof normalizedStored})
    Match: ${isValid}`);

  return isValid;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

module.exports = mongoose.model('User', userSchema);