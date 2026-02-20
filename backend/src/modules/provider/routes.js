const express = require('express');
const router = express.Router();

const providerController = require('./controller');
const { authorizeRoles } = require('../../middlewares/auth');

// Debug: Check if controller methods are loaded
console.log('[Provider Routes] Controller methods loaded:', Object.keys(providerController));

// Debug: log all requests to provider routes
router.use((req, res, next) => {
  console.log(`[Provider Routes] ${req.method} ${req.path}`);
  console.log('[Provider Routes] User:', req.user ? { id: req.user._id, role: req.user.role, email: req.user.email } : 'NO USER FOUND');
  next();
});

// Quick unauthenticated test endpoint to verify router mounting
router.get('/__test', (req, res) => {
  res.json({ success: true, message: 'provider routes mounted' });
});

// All routes below require provider or admin role
router.use((req, res, next) => {
  console.log('[Provider Routes] Checking authorization...');
  console.log('[Provider Routes] req.user exists?', !!req.user);
  if (req.user) {
    console.log('[Provider Routes] User role:', req.user.role);
  }
  next();
});
router.use(authorizeRoles('provider', 'admin'));

// Test route after authorization
router.get('/test-auth', (req, res) => {
  console.log('[Test Route] Reached test-auth endpoint');
  res.json({ success: true, message: 'Authorization working!', user: req.user.email });
});

// Provider status management
router.patch('/toggle-status', providerController.toggleOnlineStatus);
router.put('/update-profile', providerController.updateProviderProfile);

// Order management
router.get('/orders', (req, res, next) => {
  console.log('[Routes] /orders handler reached');
  providerController.getProviderOrders(req, res, next);
});
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

module.exports = router;