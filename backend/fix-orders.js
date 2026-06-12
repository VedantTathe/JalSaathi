require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./src/modules/order/model');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const badOrders = await Order.find({ paymentStatus: 'paid', status: { $in: ['failed', 'pending'] } });
  console.log('Found ' + badOrders.length + ' bad orders');
  
  for (const o of badOrders) {
    o.status = 'accepted';
    await o.save();
    console.log('Fixed order ' + o._id);
  }
  process.exit(0);
});
