const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../order/model');
const Provider = require('../provider/model');
const Transaction = require('../../modules/transaction/model');
const { formatResponse } = require('../../utils/helpers');

// Raw body is captured in req.rawBody by server.json verify option
// NOTE: Webhook is optional - main payment flow uses frontend callback + verify endpoint
router.post('/razorpay', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      // Webhook not configured - this is OK, payment verification happens via frontend callback
      console.log('Webhook secret not configured - skipping webhook processing');
      return res.status(200).send('webhook not configured - using frontend verification');
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.warn('Missing razorpay signature header');
      return res.status(400).send('missing signature');
    }

    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (expected !== signature) {
      console.warn('Invalid webhook signature');
      return res.status(400).send('invalid signature');
    }

    const payload = req.body;
    const event = payload.event;

    // Basic events handling
    if (event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const razorOrderId = payment.order_id;

      // Find our order by stored razorpay order id
      const order = await Order.findOne({ 'paymentInfo.orderId': razorOrderId });
      if (!order) {
        console.warn('Order not found for razorpay order id', razorOrderId);
        return res.status(200).send('ok'); // respond ok to webhook to avoid retries
      }

      // Idempotency: skip if payment already recorded
      if (order.paymentInfo && order.paymentInfo.paymentId === payment.id) {
        console.log('Webhook: payment already processed for order', order._id.toString());
        return res.status(200).send('ok');
      }

      order.paymentStatus = 'paid';
      order.paymentMethod = 'online';
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.provider = 'razorpay';
      order.paymentInfo.paymentId = payment.id;
      order.paymentInfo.orderId = razorOrderId;
      order.paymentInfo.capturedAt = new Date(payment.captured_at * 1000) || new Date();

      // Update provider wallet and record transaction
      try {
        const provider = await Provider.findById(order.providerId).populate('userId', 'email name');
        const User = require('../user/model');
        const customer = await User.findById(order.customerId).select('email name');
        const amount = order.items && order.items.totalPrice ? order.items.totalPrice : 0;

        if (provider) {
          provider.pending_balance = (provider.pending_balance || 0) + amount;
          provider.total_earnings = (provider.total_earnings || 0) + amount;
          await provider.save();

          // Create Route Transfer to send money to provider's linked account
          try {
            const { createRouteTransfer } = require('../../services/razorpayService');
            await createRouteTransfer(payment.id, order.providerId, amount, order._id);
          } catch (transferErr) {
            console.error('Webhook: Route transfer failed (funds held in platform account)', transferErr.message);
            // Don't fail payment - transfer can be done manually later
          }
        }

        // Create pending transaction record (idempotent check)
        const existingTx = await Transaction.findOne({ razorpay_payment_id: payment.id });
        if (!existingTx) {
          const tx = new Transaction({
            order_id: order._id,
            provider_id: order.providerId,
            amount,
            status: 'pending',
            razorpay_payment_id: payment.id
          });
          await tx.save();
        }

        // Set deadlines on order: deliveryDeadline = today 5 PM, refundDeadline = today 10 PM
        const now = new Date();
        const deliveryDeadline = new Date(now);
        deliveryDeadline.setHours(17, 0, 0, 0);
        const refundDeadline = new Date(now);
        refundDeadline.setHours(22, 0, 0, 0);

        order.deliveryDeadline = deliveryDeadline;
        order.refundDeadline = refundDeadline;

        // Ensure timeline ordered exists
        order.timeline = order.timeline || {};
        if (!order.timeline.ordered) order.timeline.ordered = order.createdAt;

        await order.save();

        // Send emails: payment received
        try {
          const admin = process.env.ADMIN_EMAIL;
          const { sendMail } = require('../../utils/mailer');
          const subject = `Payment Received: ${order.orderNumber || order._id}`;
          const text = `Payment of amount ${amount} received for order ${order.orderNumber || order._id}.`;
          if (provider && provider.userId && provider.userId.email) {
            await sendMail({ to: provider.userId.email, cc: admin, subject, text });
          }
          if (customer && customer.email) {
            await sendMail({ to: customer.email, cc: admin, subject, text });
          }
        } catch (mailErr) {
          console.error('Webhook: email send error', mailErr && mailErr.message);
        }

        console.log('Webhook: marked order paid and updated provider balances', order._id.toString());
        return res.status(200).send('ok');
      } catch (innerErr) {
        console.error('Webhook: error applying payment side-effects', innerErr && innerErr.message);
        // still respond ok so webhook isn't retried repeatedly
        await order.save().catch(() => {});
        return res.status(200).send('ok');
      }
    }

    if (event === 'payment.failed') {
      const payment = payload.payload.payment.entity;
      const razorOrderId = payment.order_id;
      const order = await Order.findOne({ 'paymentInfo.orderId': razorOrderId });
      if (!order) return res.status(200).send('ok');

      order.paymentStatus = 'failed';
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.provider = 'razorpay';
      order.paymentInfo.paymentId = payment.id;
      order.paymentInfo.orderId = razorOrderId;
      order.paymentInfo.failedReason = payment.error_description || payment.error_reason || 'failed';

      await order.save();
      console.log('Webhook: marked payment failed for order', order._id.toString());
      return res.status(200).send('ok');
    }

    // For other events, just acknowledge
    res.status(200).send('ignored');
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).send('error');
  }
});

module.exports = router;
