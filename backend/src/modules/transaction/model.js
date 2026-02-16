const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'refunded', 'settled'],
    default: 'pending'
  },
  razorpay_payment_id: {
    type: String
  },
  razorpay_refund_id: {
    type: String
  }
}, { timestamps: true });

transactionSchema.index({ order_id: 1 });
transactionSchema.index({ provider_id: 1 });

module.exports = require('mongoose').model('Transaction', transactionSchema);
