const crypto = require('crypto');

const normalizeBaseUrl = (value, fallback) => {
  const raw = (value || fallback || '').trim();
  if (!raw) return '';
  let url = raw;
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  return url.replace(/\/+$/, '');
};

async function createOrder({ orderId, amount, customer = {} }) {
  try {
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secret) {
      throw new Error('Cashfree credentials not configured');
    }

    const payload = {
      order_id: `order_${orderId}`,
      order_amount: parseFloat(Number(amount || 0).toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: `${customer._id || 'guest'}`,
        customer_email: customer.email || '',
        customer_phone: customer.phone || '',
        customer_name: customer.name || ''
      }
    };

    // Allow configuring return and notify URLs so Cashfree can POST webhooks
    const backendBase = normalizeBaseUrl(
      process.env.BACKEND_URL,
      `http://localhost:${process.env.PORT || 5000}`
    );
    const frontendBase = normalizeBaseUrl(
      process.env.FRONTEND_URL,
      'http://localhost:5173'
    );
    payload.order_meta = payload.order_meta || {};
    if (!payload.order_meta.notify_url) {
      payload.order_meta.notify_url = process.env.CASHFREE_WEBHOOK_URL || `${backendBase}/api/webhook/cashfree`;
    }
    if (!payload.order_meta.return_url) {
      // Cashfree may redirect users to this URL after payment completion
      payload.order_meta.return_url = process.env.CASHFREE_RETURN_URL || `${frontendBase}/dashboard/my-orders`;
    }

    console.log('🔗 Cashfree Return URL:', payload.order_meta.return_url);

    // Use sandbox endpoint for test keys or non-production
    let endpoint = 'https://api.cashfree.com/pg/orders';
    if (
      (appId && appId.startsWith('TEST')) ||
      process.env.NODE_ENV !== 'production'
    ) {
      endpoint = 'https://sandbox.cashfree.com/pg/orders';
    }

    // Log payload (safe) for debugging; do NOT log secrets
    try {
      console.debug('Cashfree request endpoint:', endpoint);
      console.debug('Cashfree request payload:', payload);
    } catch (e) {}

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secret,
        // Cashfree expects an API version in headers for some endpoints
        // include both common header names to be safe
        'x-api-version': process.env.CASHFREE_API_VERSION || '2022-01-01',
        'version': process.env.CASHFREE_API_VERSION || '2022-01-01'
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok) {
      try {
        console.error('Cashfree response error:', { endpoint, payload, response: data });
      } catch (e) {}
      const err = new Error('Cashfree order create failed');
      err.details = data;
      throw err;
    }

    try {
      console.debug('Cashfree response success:', data);
    } catch (e) {}

    return data;
  } catch (err) {
    throw err;
  }
}

function verifyWebhookSignature(rawBody, signature) {
  try {
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
  } catch (e) {
    return false;
  }
}

module.exports = {
  createOrder,
  verifyWebhookSignature
};

// Fetch payments for an order from Cashfree
async function getOrderPayments(cfOrderId) {
  try {
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secret) throw new Error('Cashfree credentials not configured');

    // Decide base endpoint (sandbox vs prod) same logic as createOrder
    let endpoint = 'https://api.cashfree.com/pg/orders';
    if ((appId && appId.startsWith('TEST')) || process.env.NODE_ENV !== 'production') {
      endpoint = 'https://sandbox.cashfree.com/pg/orders';
    }

    const paymentsEndpoint = endpoint.replace('/pg/orders', '') + `/pg/orders/${cfOrderId}/payments`;
    console.log('[Cashfree] Fetching payments for order:', cfOrderId, 'Endpoint:', paymentsEndpoint);

    const resp = await fetch(paymentsEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secret,
        'x-api-version': process.env.CASHFREE_API_VERSION || '2022-01-01',
        'version': process.env.CASHFREE_API_VERSION || '2022-01-01'
      }
    });

    const data = await resp.json();
    console.log('[Cashfree] API response:', JSON.stringify(data));
    if (!resp.ok) {
      const err = new Error('Cashfree get payments failed');
      err.details = data;
      throw err;
    }

    // Cashfree returns payments object/array under `payments` or `data` depending on API
    return data.payments || data.data || data;
  } catch (err) {
    console.error('[Cashfree] getOrderPayments error:', err);
    throw err;
  }
}

module.exports.getOrderPayments = getOrderPayments;
