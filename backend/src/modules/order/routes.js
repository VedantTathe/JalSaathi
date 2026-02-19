const express = require('express');
const router = express.Router();

const orderController = require('./controller');
const { authorizeRoles, checkProviderOnline } = require('../../middlewares/auth');

// Customer routes
router.post('/create',
  authorizeRoles('customer'),
  checkProviderOnline,
  orderController.createOrder
);

router.get('/my-orders',
  authorizeRoles('customer'),
  orderController.getMyOrders
);

router.get('/:orderId',
  orderController.getOrderById
);

router.patch('/:orderId/cancel',
  authorizeRoles('customer'),
  orderController.cancelOrder
);

// Payment endpoints
router.post('/:orderId/payment/create',
  authorizeRoles('customer'),
  orderController.createPaymentOrder
);

router.post('/:orderId/payment/verify',
  authorizeRoles('customer'),
  orderController.verifyPayment
);

// Poll/check payment status (backend queries Cashfree)
router.get('/:orderId/payment/check',
  authorizeRoles('customer'),
  orderController.checkPaymentStatus
);

// Mark payment as failed (used when client gives up / timeout)
router.post('/:orderId/payment/fail',
  authorizeRoles('customer'),
  orderController.failPayment
);

// Common routes (multiple roles)
router.get('/:orderId/track',
  orderController.trackOrder
);

// Admin routes
router.get('/',
  authorizeRoles('admin'),
  orderController.getAllOrders
);

router.patch('/:orderId/admin-cancel',
  authorizeRoles('admin'),
  orderController.adminCancelOrder
);

module.exports = router;