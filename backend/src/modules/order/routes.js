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