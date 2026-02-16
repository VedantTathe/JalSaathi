const Order = require('../modules/order/model');
const Provider = require('../modules/provider/model');
const User = require('../modules/user/model');
const Transaction = require('../modules/transaction/model');
const { sendMail } = require('../utils/mailer');

async function settleOrder(order) {
  try {
    if (!order || order.settled || order.autoRefunded) {
      return null;
    }

    const provider = await Provider.findById(order.providerId);
    if (!provider) {
      console.warn('Settlement: provider not found for order', order._id.toString());
      return null;
    }

    // Idempotency: check for existing settled transaction
    const existingTx = await Transaction.findOne({ order_id: order._id, status: 'settled' });
    if (existingTx) {
      order.settled = true;
      await order.save();
      return existingTx;
    }

    const amount = order.items.totalPrice || 0;

    // Create settled transaction
    const tx = new Transaction({
      order_id: order._id,
      provider_id: provider._id,
      amount,
      status: 'settled'
    });
    await tx.save();

    // Move amounts
    provider.pending_balance = Math.max(0, (provider.pending_balance || 0) - amount);
    provider.settled_balance = (provider.settled_balance || 0) + amount;
    await provider.save();

    order.settled = true;
    await order.save();

    console.log('Settlement: settled order', order._id.toString());
    // Emails: notify provider, customer, admin
    try {
      const admin = process.env.ADMIN_EMAIL;
      const providerDoc = await Provider.findById(order.providerId).populate('userId', 'email name');
      const customerDoc = await User.findById(order.customerId).select('email name');
      const subject = `Order Settled: ${order.orderNumber || order._id}`;
      const text = `Order ${order.orderNumber || order._id} has been settled. Amount: ${amount}`;
      if (providerDoc && providerDoc.userId && providerDoc.userId.email) {
        await sendMail({ to: providerDoc.userId.email, cc: admin, subject, text });
      }
      if (customerDoc && customerDoc.email) {
        await sendMail({ to: customerDoc.email, cc: admin, subject, text });
      }
    } catch (mailErr) {
      console.error('Settlement: email send error', mailErr && mailErr.message);
    }
    return tx;
  } catch (err) {
    console.error('Settlement error for order', order && order._id, err && err.message);
    throw err;
  }
}

module.exports = { settleOrder };
