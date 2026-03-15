const paymentService = require('../services/paymentService');

async function create(req, res) {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const result = await paymentService.createOrder({ amount: Number(amount) });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('Create payment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create payment' });
  }
}

async function check(req, res) {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

    const result = await paymentService.checkPayment(orderId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Check payment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to check payment' });
  }
}

async function verifyUtr(req, res) {
  try {
    const { orderId, utr } = req.body;
    if (!orderId || !utr) return res.status(400).json({ success: false, message: 'orderId and utr required' });

    const result = await paymentService.verifyUtr(orderId, utr);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Verify UTR error:', err);
    return res.status(400).json({ success: false, message: err.message || 'UTR verification failed' });
  }
}

module.exports = {
  create,
  check,
  verifyUtr
};
