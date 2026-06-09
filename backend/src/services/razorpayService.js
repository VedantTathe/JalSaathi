const crypto = require('crypto');
const Razorpay = require('razorpay');

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({ key_id, key_secret });
};

async function createOrder({ orderId, amount, customer = {} }) {
  try {
    const razorpay = getRazorpayInstance();

    const options = {
      amount: Math.round(Number(amount || 0) * 100), // Razorpay requires amount in paise
      currency: 'INR',
      receipt: `receipt_${orderId}`,
      notes: {
        customer_id: `${customer._id || 'guest'}`,
        customer_email: customer.email || '',
        customer_phone: customer.phone || '',
        customer_name: customer.name || ''
      }
    };

    try {
      console.debug('Razorpay request payload:', options);
    } catch (e) {}

    const data = await razorpay.orders.create(options);

    try {
      console.debug('Razorpay response success:', data);
    } catch (e) {}

    return data;
  } catch (err) {
    console.error('Razorpay order create error:', err);
    throw err;
  }
}

function verifyWebhookSignature(rawBody, signature) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return false;
    // For string body
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
  } catch (e) {
    return false;
  }
}

// Fetch payments for an order from Razorpay
async function getOrderPayments(razorpayOrderId) {
  try {
    const razorpay = getRazorpayInstance();
    console.log('[Razorpay] Fetching payments for order:', razorpayOrderId);

    const payments = await razorpay.orders.fetchPayments(razorpayOrderId);
    console.log('[Razorpay] API response:', JSON.stringify(payments));

    return payments.items || payments;
  } catch (err) {
    console.error('[Razorpay] getOrderPayments error:', err);
    throw err;
  }
}

module.exports = {
  createOrder,
  verifyWebhookSignature,
  getOrderPayments
};
