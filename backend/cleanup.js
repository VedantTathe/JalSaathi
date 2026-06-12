require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Order = require('./src/modules/order/model');
  const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
  const result = await Order.updateMany(
    {
      paymentStatus: 'pending',
      paymentMethod: 'online',
      status: 'pending',
      createdAt: { $lt: oneMinuteAgo }
    },
    {
      $set: {
        paymentStatus: 'failed',
        status: 'failed',
        'paymentInfo.failedAt': new Date(),
        'paymentInfo.failedReason': 'Payment timeout - order not completed within 1 minute'
      }
    }
  );
  console.log('Auto-failed ' + result.modifiedCount + ' old pending online orders.');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
