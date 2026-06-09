const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../order/model');
const { formatResponse } = require('../../utils/helpers');
const razorpayService = require('../../services/razorpayService');

// Raw body is captured in req.rawBody by server.json verify option
// NOTE: Webhook is optional - main payment flow uses frontend callback + verify endpoint

// Razorpay webhook
router.post('/razorpay', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.log('Razorpay webhook not configured - skipping webhook processing');
      return res.status(200).send('webhook not configured');
    }

    const signature = req.headers['x-razorpay-signature'] || req.headers['x-webhook-signature'] || req.headers['x-cf-signature'];
    if (!signature) {
      console.warn('Missing razorpay signature header');
      return res.status(400).send('missing signature');
    }

    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const valid = razorpayService.verifyWebhookSignature(raw, signature);
    if (!valid) {
      console.warn('Invalid razorpay webhook signature');
      return res.status(400).send('invalid signature');
    }

    const payload = req.body || {};

    // Razorpay payload may contain order_id / orderId and txStatus
    const cfOrderId = payload.payload?.payment?.entity?.order_id || payload.order_id || payload.orderId || payload.order;
    const cfReference = payload.payload?.payment?.entity?.id || payload.reference_id || payload.referenceId || payload.reference;
    const cfStatus = payload.event === 'payment.captured' || payload.event === 'order.paid' ? 'SUCCESS' : (payload.tx_status || payload.status);

    if (!cfOrderId) {
      console.warn('Razorpay webhook missing order id');
      return res.status(200).send('ok');
    }

    const order = await Order.findOne({ 'paymentInfo.orderId': cfOrderId });
    if (!order) {
      console.warn('Order not found for razorpay order id', cfOrderId);
      return res.status(200).send('ok');
    }

    if ((cfStatus || '').toUpperCase() === 'SUCCESS') {
      order.paymentStatus = 'paid';
      order.paymentMethod = 'online';
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.provider = 'razorpay';
      order.paymentInfo.paymentId = cfReference || payload.referenceId;
      order.paymentInfo.orderId = cfOrderId;
      order.paymentInfo.capturedAt = new Date();

      await order.save();

      order.timeline = order.timeline || {};
      if (!order.timeline.ordered) order.timeline.ordered = order.createdAt;

      console.log('Webhook: marked order paid', order._id.toString());
      return res.status(200).send('ok');
    }

    // treat others as failed
    order.paymentStatus = 'failed';
    order.status = 'failed'; // Always mark as failed
    order.paymentInfo = order.paymentInfo || {};
    order.paymentInfo.provider = 'razorpay';
    order.paymentInfo.paymentId = cfReference;
    order.paymentInfo.orderId = cfOrderId;
    order.paymentInfo.failedAt = new Date();
    order.paymentInfo.failedReason = payload.failureReason || payload.reason || 'failed';

    await order.save();
    console.log('Webhook: marked order as failed', order._id.toString(), 'status:', order.status);
    console.log('Webhook: marked payment failed for order', order._id.toString());
    return res.status(200).send('ok');
  } catch (err) {
    console.error('Razorpay webhook processing error:', err);
    res.status(500).send('error');
  }
});
module.exports = router;

