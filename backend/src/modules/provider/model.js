const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    minlength: [2, 'Business name must be at least 2 characters'],
    maxlength: [100, 'Business name cannot exceed 100 characters']
  },
  area: {
    type: String,
    required: [true, 'Service area is required'],
    trim: true
  },
  coordinates: {
    latitude: {
      type: Number,
      required: false,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: false,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  serviceRadius: {
    type: Number,
    required: [true, 'Service radius is required'],
    default: 5, // kilometers
    min: [1, 'Service radius must be at least 1 km'],
    max: [50, 'Service radius cannot exceed 50 km']
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  pricePerCan: {
    type: Number,
    required: [true, 'Price per can is required'],
    min: [1, 'Price must be greater than 0']
  },
  minimumOrder: {
    type: Number,
    default: 1,
    min: [1, 'Minimum order must be at least 1']
  },
  deliveryBoys: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  completedOrders: {
    type: Number,
    default: 0
  },
  revenue: {
    total: {
      type: Number,
      default: 0
    },
    thisMonth: {
      type: Number,
      default: 0
    }
  },
  operatingHours: {
    open: {
      type: String,
      default: '08:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    close: {
      type: String,
      default: '20:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    }
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  // Payment details (optional)
  bankDetails: {
    accountHolder: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true }
  },
  upiId: {
    type: String,
    trim: true,
    lowercase: true
  },
  upiNumber: {
    type: String,
    trim: true
  },
  isApproved: {
    type: Boolean,
    default: true  // Auto-approve for MVP - change to false for production with admin approval
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for geospatial queries and common searches
providerSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
providerSchema.index({ area: 1, isOnline: 1, isApproved: 1 });
providerSchema.index({ pricePerCan: 1 });
providerSchema.index({ 'rating.average': -1 });

// Virtual for completion rate
providerSchema.virtual('completionRate').get(function() {
  if (this.totalOrders === 0) return 0;
  return Math.round((this.completedOrders / this.totalOrders) * 100);
});

// Virtual to check if provider is currently within operating hours
providerSchema.virtual('isWithinOperatingHours').get(function() {
  if (!this.operatingHours || !this.operatingHours.open || !this.operatingHours.close) {
    return true; // If no operating hours set, assume always available
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Parse open time
  const [openHour, openMinute] = this.operatingHours.open.split(':').map(Number);
  const openTimeInMinutes = openHour * 60 + openMinute;

  // Parse close time
  const [closeHour, closeMinute] = this.operatingHours.close.split(':').map(Number);
  const closeTimeInMinutes = closeHour * 60 + closeMinute;

  // Check if current time is within operating hours
  return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes <= closeTimeInMinutes;
});

// Virtual to determine if provider should accept orders
providerSchema.virtual('isAcceptingOrders').get(function() {
  return this.isOnline && this.isWithinOperatingHours;
});

// Pre-save middleware to update monthly revenue
providerSchema.pre('save', function(next) {
  // Reset monthly revenue on first day of month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  if (!this.revenue.lastReset || this.revenue.lastReset < firstDayOfMonth) {
    this.revenue.thisMonth = 0;
    this.revenue.lastReset = now;
  }
  
  next();
});

// Static method to find online providers in area
providerSchema.statics.findOnlineInArea = function(area) {
  return this.find({
    area: new RegExp(area, 'i'),
    isOnline: true,
    isApproved: true
  });
};

// Static method to find providers accepting orders (all providers for customers to see)
providerSchema.statics.findAvailableProviders = function(area) {
  // Return all providers in the area, regardless of online/approved status
  // Frontend will handle showing status badges
  return this.find({
    area: new RegExp(area, 'i')
  }).populate('userId', 'name phone email').sort({ isOnline: -1, 'rating.average': -1 });
};

// Instance method to toggle online status
providerSchema.methods.toggleOnlineStatus = function() {
  this.isOnline = !this.isOnline;
  return this.save();
};

module.exports = mongoose.model('Provider', providerSchema);