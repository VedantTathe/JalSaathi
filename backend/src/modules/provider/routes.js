const express = require('express');
const router = express.Router();

const providerController = require('./controller');
const { authorizeRoles } = require('../../middlewares/auth');

// Debug: log all requests to provider routes
router.use((req, res, next) => {
  console.log(`[Provider Routes] ${req.method} ${req.path}`);
  next();
});

// Quick unauthenticated test endpoint to verify router mounting
router.get('/__test', (req, res) => {
  res.json({ success: true, message: 'provider routes mounted' });
});

// All routes below require provider or admin role
router.use(authorizeRoles('provider', 'admin'));

// Provider status management
router.patch('/toggle-status', providerController.toggleOnlineStatus);
router.put('/update-profile', providerController.updateProviderProfile);

// Order management
router.get('/orders', providerController.getProviderOrders);
router.patch('/orders/:orderId/accept', providerController.acceptOrder);
router.patch('/orders/:orderId/reject', providerController.rejectOrder);

// Test endpoint to verify route exists
router.get('/orders/:orderId/assign-delivery-test', (req, res) => {
  res.json({ success: true, message: 'Route exists!', orderId: req.params.orderId });
});

router.patch('/orders/:orderId/assign-delivery', providerController.assignDeliveryBoy);

// Delivery boy management
router.get('/delivery-boys', providerController.getDeliveryBoys);
router.post('/delivery-boys', providerController.addDeliveryBoy);
router.delete('/delivery-boys/:deliveryBoyId', providerController.removeDeliveryBoy);

// Analytics
router.get('/analytics', providerController.getAnalytics);

// Order history with daily grouping
router.get('/history', providerController.getOrderHistory);

// Customers who ordered from this provider
router.get('/customers', providerController.getCustomers);

// Bank account management
router.get('/bank-details', providerController.getBankDetails);
router.put('/bank-details', providerController.updateBankDetails);

// Wallet/earnings summary
router.get('/wallet', providerController.getWalletSummary);

module.exports = router;