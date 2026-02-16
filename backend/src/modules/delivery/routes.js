const express = require('express');
const router = express.Router();

const deliveryController = require('./controller');
const { authorizeRoles } = require('../../middlewares/auth');

// All routes require delivery role
router.use(authorizeRoles('delivery', 'admin'));

// Delivery boy routes
router.get('/assigned-orders',
  authorizeRoles('delivery'),
  deliveryController.getAssignedOrders
);

router.patch('/orders/:orderId/update-status',
  authorizeRoles('delivery'),
  deliveryController.updateDeliveryStatus
);

router.patch('/orders/:orderId/mark-delivered',
  authorizeRoles('delivery'),
  deliveryController.markAsDelivered
);

router.get('/delivery-history',
  authorizeRoles('delivery'),
  deliveryController.getDeliveryHistory
);

router.get('/performance',
  authorizeRoles('delivery'),
  deliveryController.getPerformanceStats
);

router.patch('/orders/:orderId/mark-payment-received',
  authorizeRoles('delivery'),
  deliveryController.markPaymentReceived
);

module.exports = router;