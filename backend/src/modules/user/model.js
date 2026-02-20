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
  if (!this.emailVerificationOTP || !this.otpExpiry) {
    return false;
  }
  if (Date.now() > this.otpExpiry) {
    return false; // OTP expired
  }
  return this.emailVerificationOTP === enteredOTP;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

module.exports = mongoose.model('User', userSchema);