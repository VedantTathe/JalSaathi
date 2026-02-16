const cron = require('node-cron');
const Order = require('../modules/order/model');
const Provider = require('../modules/provider/model');
const { triggerRefundForOrder } = require('../services/refundService');
const { settleOrder } = require('../services/settlementService');

const { sendMail } = require('./mailer');

async function sendProviderNotification(order, message) {
  // Send email to provider and customer, cc admin
  try {
    const admin = process.env.ADMIN_EMAIL;
    const Provider = require('../modules/provider/model');
    const User = require('../modules/user/model');
    const providerDoc = await Provider.findById(order.providerId).populate('userId', 'email name');
    const customerDoc = await User.findById(order.customerId).select('email name');
    const subject = `Order Alert: ${order.orderNumber || order._id}`;
    const text = message;
    if (providerDoc && providerDoc.userId && providerDoc.userId.email) {
      await sendMail({ to: providerDoc.userId.email, cc: admin, subject, text });
    }
    if (customerDoc && customerDoc.email) {
      await sendMail({ to: customerDoc.email, cc: admin, subject, text });
    }
  } catch (err) {
    console.error('sendProviderNotification error', err && err.message);
  }
}

function initCronJobs() {
  // 7 PM daily - provider warning & mark refundEligible
  cron.schedule('0 19 * * *', async () => {
    console.log('CRON 7PM: checking undelivered orders for provider warnings');
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);
      const endOfToday = new Date();
      endOfToday.setHours(23,59,59,999);

      const orders = await Order.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        status: { $ne: 'delivered' },
        autoRefunded: false
      });

      for (const order of orders) {
        try {
          if (!order.refundEligible) {
            order.refundEligible = true;
            await order.save();
          }

          await sendProviderNotification(order, `Order ${order.orderNumber || order._id} is not delivered yet. Please complete delivery or it may be auto-refunded at 10 PM.`);
        } catch (innerErr) {
          console.error('CRON 7PM: error updating order', order._id.toString(), innerErr && innerErr.message);
        }
      }
    } catch (err) {
      console.error('CRON 7PM failed:', err && err.message);
    }
  });

  // 10 PM daily - auto-refund eligible orders
  cron.schedule('0 22 * * *', async () => {
    console.log('CRON 10PM: processing auto-refunds');
    try {
      const orders = await Order.find({ refundEligible: true, autoRefunded: false, status: { $ne: 'delivered' } });
      for (const order of orders) {
        try {
          await triggerRefundForOrder(order);
        } catch (innerErr) {
          console.error('CRON 10PM: refund failed for order', order._id.toString(), innerErr && innerErr.message);
        }
      }
    } catch (err) {
      console.error('CRON 10PM failed:', err && err.message);
    }
  });

  // 8 AM daily - settle delivered orders
  cron.schedule('0 8 * * *', async () => {
    console.log('CRON 8AM: settling delivered orders');
    try {
      const orders = await Order.find({ status: 'delivered', settled: false, autoRefunded: false });
      for (const order of orders) {
        try {
          await settleOrder(order);
        } catch (innerErr) {
          console.error('CRON 8AM: settlement failed for order', order._id.toString(), innerErr && innerErr.message);
        }
      }
    } catch (err) {
      console.error('CRON 8AM failed:', err && err.message);
    }
  });

  console.log('Cron jobs initialized');
}

module.exports = { initCronJobs };
