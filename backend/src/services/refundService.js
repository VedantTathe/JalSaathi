const axios = require('axios');
const Order = require('../modules/order/model');
const Provider = require('../modules/provider/model');
const User = require('../modules/user/model');
const Transaction = require('../modules/transaction/model');
const { sendMail } = require('../utils/mailer');

const razorKey = process.env.RAZORPAY_KEY_ID;
const razorSecret = process.env.RAZORPAY_KEY_SECRET;

async function triggerRefundForOrder(order) {
  try {
    if (!order || order.autoRefunded) {
      console.log('RefundService: skipping - no order or already autoRefunded', order && order._id);
      return null;
    }

    // Idempotency: ensure transaction for this refund isn't already processed
    const existingTx = await Transaction.findOne({ order_id: order._id, status: 'refunded' });
    if (existingTx) {
      console.log('RefundService: refund already exists for order', order._id.toString());
      // mark order if not marked
      if (!order.autoRefunded) {
        order.autoRefunded = true;
        order.status = 'refunded';
        await order.save();
      }
      return existingTx;
    }

    const paymentId = order.paymentInfo && order.paymentInfo.paymentId;
    if (!paymentId) {
      console.warn('RefundService: no payment id for order', order._id.toString());
      // Mark as autoRefunded to avoid repeated attempts
      order.autoRefunded = true;
      order.status = 'refunded';
      await order.save();
      return null;
    }

    // Call Razorpay refund endpoint
    const url = `https://api.razorpay.com/v1/payments/${paymentId}/refund`;
    const auth = { username: razorKey || '', password: razorSecret || '' };

    const resp = await axios.post(url, {}, { auth, timeout: 20000 });
    const refund = resp && resp.data;

    // Update transaction record
    const tx = new Transaction({
      order_id: order._id,
      provider_id: order.providerId,
      amount: order.items.totalPrice,
      status: 'refunded',
      razorpay_payment_id: paymentId,
      razorpay_refund_id: refund && refund.id
    });
    await tx.save();

    // Update provider balances
    const provider = await Provider.findById(order.providerId);
    if (provider) {
      provider.pending_balance = Math.max(0, (provider.pending_balance || 0) - order.items.totalPrice);
      provider.refund_deductions = (provider.refund_deductions || 0) + order.items.totalPrice;
      await provider.save();
    }

    // Update order
    order.autoRefunded = true;
    order.refundEligible = false;
    order.status = 'refunded';
    await order.save();

    // Send emails to provider and customer and CC admin
    try {
      const admin = process.env.ADMIN_EMAIL;
      const providerDoc = await Provider.findById(order.providerId).populate('userId', 'email name');
      const customerDoc = await User.findById(order.customerId).select('email name');
      const subject = `Order Refunded: ${order.orderNumber || order._id}`;
      const text = `Order ${order.orderNumber || order._id} has been auto-refunded. Amount: ${order.items.totalPrice}`;
      if (providerDoc && providerDoc.userId && providerDoc.userId.email) {
        await sendMail({ to: providerDoc.userId.email, cc: admin, subject, text });
      }
      if (customerDoc && customerDoc.email) {
        await sendMail({ to: customerDoc.email, cc: admin, subject, text });
      }
      if (admin) {
        await sendMail({ to: admin, subject: `Audit: ${subject}`, text: `Order ${order._id} refunded. Provider: ${order.providerId}. Amount: ${order.items.totalPrice}` });
      }
    } catch (mailErr) {
      console.error('RefundService: email send error', mailErr && mailErr.message);
    }

    console.log('RefundService: refund completed for order', order._id.toString());
    return tx;
  } catch (err) {
    console.error('RefundService error for order', order && order._id, err && err.message);
    throw err;
  }
}

module.exports = {
  triggerRefundForOrder
};
