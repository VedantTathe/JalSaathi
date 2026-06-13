const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive']
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'cash', 'other'],
    default: 'bank_transfer'
  },
  transactionId: {
    type: String,
    trim: true
  },
  orderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  orderCount: {
    type: Number,
    default: 0
  },
  platformFee: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  cashAmount: {
    type: Number,
    default: 0
  },
  cashOrderCount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
settlementSchema.index({ providerId: 1, status: 1 });
settlementSchema.index({ status: 1, createdAt: -1 });
settlementSchema.index({ periodStart: 1, periodEnd: 1 });

// Pre-save middleware
settlementSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'processing' && !this.processedAt) {
      this.processedAt = new Date();
    }
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  next();
});

// Static method to calculate pending settlements for a provider
settlementSchema.statics.getPendingAmount = async function(providerId) {
  const result = await this.aggregate([
    {
      $match: {
        providerId: new mongoose.Types.ObjectId(providerId),
        status: 'pending'
      }
    },
    {
      $group: {
        _id: null,
        totalPending: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || { totalPending: 0, count: 0 };
};

module.exports = mongoose.model('Settlement', settlementSchema);
