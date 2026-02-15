const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../order/model');
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

      order.paymentStatus = 'paid';
      order.paymentMethod = 'online';
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.provider = 'razorpay';
      order.paymentInfo.paymentId = payment.id;
      order.paymentInfo.orderId = razorOrderId;
      order.paymentInfo.capturedAt = new Date(payment.captured_at * 1000) || new Date();

      await order.save();

      // Optionally update timeline
      order.timeline = order.timeline || {};
      if (!order.timeline.ordered) order.timeline.ordered = order.createdAt;

      console.log('Webhook: marked order paid', order._id.toString());

      return res.status(200).send('ok');
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
