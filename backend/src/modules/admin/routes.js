const express = require('express');
const router = express.Router();

const adminController = require('./controller');
const { authorizeRoles } = require('../../middlewares/auth');

// All routes require admin role
router.use(authorizeRoles('admin'));

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Provider management
router.get('/providers', adminController.getAllProviders);
router.get('/providers/:providerId', adminController.getProviderById);
router.patch('/providers/:providerId/approve', adminController.approveProvider);
router.patch('/providers/:providerId/reject', adminController.rejectProvider);
router.patch('/providers/:providerId/toggle-status', adminController.toggleProviderStatus);
router.post('/providers/:providerId/settle-remaining', adminController.settleRemaining);

// Order management
router.get('/orders', adminController.getAllOrders);
router.get('/orders/statistics', adminController.getOrderStatistics);
router.patch('/orders/:orderId/cancel', adminController.cancelOrder);

// System analytics
router.get('/dashboard', adminController.getAdminDashboard);
router.get('/analytics/overview', adminController.getSystemOverview);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/performance', adminController.getPerformanceAnalytics);

// System maintenance
router.post('/maintenance/cleanup-cancelled-orders', adminController.cleanupCancelledOrders);
router.get('/system/health', adminController.getSystemHealth);

// Settlement management
router.get('/settlements', adminController.getAllSettlements);
router.get('/settlements/stats', adminController.getSettlementStats);
router.post('/settlements/create', adminController.createSettlement);
router.patch('/settlements/:settlementId/status', adminController.updateSettlementStatus);
router.post('/settlements/:settlementId/complete', adminController.completeSettlement);
router.post('/settlements/create-monthly', adminController.createMonthlySettlements);

module.exports = router;