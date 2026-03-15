const Payment = require('../models/paymentModel');

// Helper: mock or placeholder for fetching recent transactions from bank/settlement provider
async function getTransactions() {
  // TODO: replace with real provider integration (Setu/Decentro)
  // Return format:
  // [{ amount, utr, note, timestamp }]
  return [];
}

// Create a new order record and return UPI intent link
async function createOrder({ amount, upiId = process.env.UPI_ID, payeeName = process.env.UPI_NAME, linkedOrderId = null }) {
  const orderId = `ORD_${Date.now()}`;
  const createObj = { orderId, amount, status: 'PENDING' };
  if (linkedOrderId) createObj.linkedOrderId = String(linkedOrderId);
  const payment = await Payment.create(createObj);

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName || '')}&am=${encodeURIComponent(amount.toFixed(2))}&cu=INR&tn=${encodeURIComponent(orderId)}`;

  return { orderId: payment.orderId, upiLink };
}

// Find payment record by linked order id
async function findPaymentByLinkedOrderId(linkedOrderId) {
  if (!linkedOrderId) return null;
  return await Payment.findOne({ linkedOrderId: String(linkedOrderId) });
}

// Check payment by linked order id (legacy compatibility)
async function checkPaymentByLinkedOrderId(linkedOrderId) {
  const payment = await findPaymentByLinkedOrderId(linkedOrderId);
  if (!payment) throw new Error('Payment record not found');
  return await checkPayment(payment.orderId);
}

// Verify UTR by linked order id
async function verifyUtrByLinkedOrderId(linkedOrderId, utr) {
  const payment = await findPaymentByLinkedOrderId(linkedOrderId);
  if (!payment) throw new Error('Payment record not found');
  return await verifyUtr(payment.orderId, utr);
}

// Internal match logic: find a transaction matching amount and after timestamp
function matchTransaction(transactions, amount, sinceTime, utr = null) {
  if (!Array.isArray(transactions)) return null;
  // If UTR provided, match by utr + amount
  if (utr) {
    const t = transactions.find(tx => tx.utr && String(tx.utr).trim() === String(utr).trim() && Number(tx.amount) === Number(amount));
    if (t) return t;
  }

  // Otherwise match by amount and time
  const t = transactions.find(tx => Number(tx.amount) === Number(amount) && new Date(tx.timestamp) > new Date(sinceTime));
  return t || null;
}

// Check payment by orderId - used for polling
async function checkPayment(orderId) {
  const payment = await Payment.findOne({ orderId });
  if (!payment) throw new Error('Order not found');

  if (payment.status === 'SUCCESS' || payment.status === 'SUCCESS_LATE') {
    return { status: payment.status, utr: payment.utr };
  }

  const transactions = await getTransactions();
  const matched = matchTransaction(transactions, payment.amount, payment.createdAt);

  if (matched) {
    // Prevent duplicate updates
    if (payment.status !== 'SUCCESS') {
      payment.status = 'SUCCESS';
      payment.utr = matched.utr || payment.utr;
      await payment.save();
    }
    return { status: 'SUCCESS', utr: payment.utr };
  }

  // If we can't confirm now, mark as CHECKING
  payment.status = 'CHECKING';
  await payment.save();
  return { status: payment.status };
}

// Verify using UTR fallback
async function verifyUtr(orderId, utr) {
  const payment = await Payment.findOne({ orderId });
  if (!payment) throw new Error('Order not found');

  const transactions = await getTransactions();
  const matched = matchTransaction(transactions, payment.amount, 0, utr);
  if (matched) {
    if (payment.status !== 'SUCCESS') {
      payment.status = 'SUCCESS';
      payment.utr = utr;
      await payment.save();
    }
    return { status: 'SUCCESS' };
  }

  throw new Error('UTR not found or amount mismatch');
}

// Cron runner: check pending payments and mark SUCCESS_LATE if matched
async function runCronCheck() {
  const candidates = await Payment.find({ status: { $in: ['PENDING','CHECKING','PENDING_VERIFICATION'] } });
  if (!candidates || candidates.length === 0) return { checked: 0 };

  const transactions = await getTransactions();
  let updated = 0;
  for (const p of candidates) {
    const matched = matchTransaction(transactions, p.amount, p.createdAt);
    if (matched) {
      if (p.status !== 'SUCCESS' && p.status !== 'SUCCESS_LATE') {
        p.status = 'SUCCESS_LATE';
        p.utr = matched.utr || p.utr;
        await p.save();
        updated++;
      }
    }
  }

  return { checked: candidates.length, updated };
}

module.exports = {
  createOrder,
  checkPayment,
  verifyUtr,
  // Linked/legacy helpers
  findPaymentByLinkedOrderId,
  checkPaymentByLinkedOrderId,
  verifyUtrByLinkedOrderId,
  runCronCheck,
  getTransactions
};
