const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authorizeRoles } = require('../middlewares/auth') || {};

// Create payment order (returns orderId and UPI intent link)
router.post('/create', paymentController.create);

// Polling check - backend verifies transactions
router.post('/check', paymentController.check);

// UTR verification fallback
router.post('/verify-utr', paymentController.verifyUtr);

module.exports = router;
