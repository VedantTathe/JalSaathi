const express = require('express');
const router = express.Router();

const userController = require('./controller');
const { authorizeRoles } = require('../../middlewares/auth');

// Routes accessible by all authenticated users
router.get('/dashboard', userController.getDashboard);
router.get('/nearby-providers', userController.getNearbyProviders);

// Customer-specific routes
router.get('/orders', 
  authorizeRoles('customer'),
  userController.getCustomerOrders
);

router.post('/orders/:orderId/rate',
  authorizeRoles('customer'), 
  userController.rateOrder
);

// Profile management (all roles)
router.put('/update-address', userController.updateAddress);
router.get('/order-history', userController.getOrderHistory);

// Payment routes (customer)
router.get('/payments', 
  authorizeRoles('customer'),
  userController.getPayments
);

module.exports = router;