const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: [true, 'Provider ID is required']
  },
  deliveryBoyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  items: {
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    pricePerCan: {
      type: Number,
      required: [true, 'Price per can is required']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required']
    }
  },
  deliveryAddress: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    area: {
      type: String,
      required: [true, 'Area is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Pincode must be 6 digits']
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  specialInstructions: {
    type: String,
    maxlength: [500, 'Special instructions cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'online', 'wallet'],
    default: 'cash_on_delivery'
  },
  timeline: {
    ordered: {
      type: Date,
      default: Date.now
    },
    accepted: {
      type: Date
    },
    assigned: {
      type: Date
    },
    outForDelivery: {
      type: Date
    },
    delivered: {
      type: Date
    },
    cancelled: {
      type: Date
    }
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  cancellationReason: {
    type: String,
    maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      maxlength: [300, 'Feedback cannot exceed 300 characters']
    },
    ratedAt: {
      type: Date
    }
  },
  deliveryNotes: {
    type: String,
    maxlength: [300, 'Delivery notes cannot exceed 300 characters']
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ providerId: 1, status: 1 });
orderSchema.index({ deliveryBoyId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.orderNumber = `JLS${dateStr}${randomStr}`;
  }
  
  // Calculate total price
  if (this.isModified('items.quantity') || this.isModified('items.pricePerCan')) {
    this.items.totalPrice = this.items.quantity * this.items.pricePerCan;
  }
  
  // Set estimated delivery time (default 2 hours from acceptance)
  if (this.isModified('status') && this.status === 'accepted' && !this.estimatedDeliveryTime) {
    this.estimatedDeliveryTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  }
  
  next();
});

// Pre-save middleware to update timeline
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'accepted':
        if (!this.timeline.accepted) this.timeline.accepted = now;
        break;
      case 'assigned':
        if (!this.timeline.assigned) this.timeline.assigned = now;
        break;
      case 'out_for_delivery':
        if (!this.timeline.outForDelivery) this.timeline.outForDelivery = now;
        break;
      case 'delivered':
        if (!this.timeline.delivered) this.timeline.delivered = now;
        this.actualDeliveryTime = now;
        break;
      case 'cancelled':
        if (!this.timeline.cancelled) this.timeline.cancelled = now;
        break;
    }
  }
  
  next();
});

// Virtual for delivery time
orderSchema.virtual('deliveryDuration').get(function() {
  if (this.timeline.delivered && this.timeline.accepted) {
    const duration = this.timeline.delivered - this.timeline.accepted;
    return Math.round(duration / (1000 * 60)); // duration in minutes
  }
  return null;
});

// Static method to get orders by status
orderSchema.statics.findByStatus = function(status, populate = true) {
  const query = this.find({ status });
  if (populate) {
    query.populate('customerId', 'name phone email')
         .populate('providerId')
         .populate('deliveryBoyId', 'name phone email');
  }
  return query.sort({ createdAt: -1 });
};

// Static method to get customer's orders
orderSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customerId })
             .populate('providerId')
             .populate('deliveryBoyId', 'name phone')
             .sort({ createdAt: -1 });
};

// Static method to get provider's orders
orderSchema.statics.findByProvider = function(providerId, status = null) {
  const query = status ? { providerId, status } : { providerId };
  return this.find(query)
             .populate('customerId', 'name phone email address')
             .populate('deliveryBoyId', 'name phone email')
             .sort({ createdAt: -1 });
};

// Instance method to update status
orderSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;
  Object.assign(this, additionalData);
  return this.save();
};

// Instance method to assign delivery boy
orderSchema.methods.assignDeliveryBoy = function(deliveryBoyId) {
  this.deliveryBoyId = deliveryBoyId;
  this.status = 'assigned';
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);