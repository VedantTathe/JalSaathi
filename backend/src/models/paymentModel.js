const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  // Link to existing order (optional) so legacy endpoints can look up by order._id
  linkedOrderId: { type: String, index: true },
  amount: { type: Number, required: true },
  status: { type: String, required: true, enum: ['PENDING','CHECKING','SUCCESS','PENDING_VERIFICATION','SUCCESS_LATE','FAILED'], default: 'PENDING' },
  utr: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);
