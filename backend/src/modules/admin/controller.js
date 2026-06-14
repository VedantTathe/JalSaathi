const AdminService = require('./service');
const OrderService = require('../order/service');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Get all users
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, isActive, search, limit = 20, page = 1 } = req.query;
  
  const filters = {};
  if (role) filters.role = role;
  if (isActive !== undefined) filters.isActive = isActive;
  if (search) filters.search = search;
  
  const { response, statusCode } = await AdminService.getAllUsers(
    filters,
    parseInt(limit),
    parseInt(page)
  );
  res.status(statusCode).json(response);
});

// Get user by ID
const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { response, statusCode } = await AdminService.getUserById(userId);
  res.status(statusCode).json(response);
});

// Toggle user status
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { response, statusCode } = await AdminService.toggleUserStatus(userId);
  res.status(statusCode).json(response);
});

// Delete user
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { response, statusCode } = await AdminService.deleteUser(userId);
  res.status(statusCode).json(response);
});

// Get all providers
const getAllProviders = asyncHandler(async (req, res) => {
  const { isApproved, isOnline, area, limit = 20, page = 1 } = req.query;
  
  const filters = {};
  if (isApproved !== undefined) filters.isApproved = isApproved;
  if (isOnline !== undefined) filters.isOnline = isOnline;
  if (area) filters.area = area;
  
  const { response, statusCode } = await AdminService.getAllProviders(
    filters,
    parseInt(limit),
    parseInt(page)
  );
  res.status(statusCode).json(response);
});

// Get provider by ID
const getProviderById = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const Provider = require('../provider/model');
  const Order = require('../order/model');
  const mongoose = require('mongoose');

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid provider ID format'
    });
  }
  
  const provider = await Provider.findById(providerId)
    .populate('userId', 'name email phone address')
    .populate('deliveryBoys', 'name email phone');
  
  if (!provider) {
    return res.status(404).json({
      success: false,
      message: 'Provider not found'
    });
  }

  // Get provider's orders with customer details
  const orders = await Order.find({ providerId: provider._id })
    .populate('customerId', 'name email phone')
    .populate('deliveryBoyId', 'name phone')
    .sort({ createdAt: -1 })
    .limit(50);

  // Get order statistics
  const orderStats = await Order.aggregate([
    { $match: { providerId: provider._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$items.totalPrice' }
      }
    }
  ]);

  const totalOrders = await Order.countDocuments({ providerId: provider._id });
  const totalRevenue = await Order.aggregate([
    { $match: { providerId: provider._id, status: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$items.totalPrice' } } }
  ]);
  
  res.status(200).json({
    success: true,
    message: 'Provider retrieved successfully',
    data: {
      provider,
      orders,
      statistics: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus: orderStats
      }
    }
  });
});

// Approve provider
const approveProvider = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const { response, statusCode } = await AdminService.approveProvider(providerId, req.user.id);
  res.status(statusCode).json(response);
});

// Reject provider
const rejectProvider = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const { reason } = req.body;
  
  const Provider = require('../provider/model');
  const provider = await Provider.findById(providerId);
  
  if (!provider) {
    return res.status(404).json({
      success: false,
      message: 'Provider not found'
    });
  }
  
  provider.isApproved = false;
  provider.rejectionReason = reason || 'Rejected by admin';
  await provider.save();
  
  res.status(200).json({
    success: true,
    message: 'Provider rejected successfully'
  });
});

// Toggle provider status
const toggleProviderStatus = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const Provider = require('../provider/model');
  
  const provider = await Provider.findById(providerId);
  
  if (!provider) {
    return res.status(404).json({
      success: false,
      message: 'Provider not found'
    });
  }
  
  provider.isOnline = !provider.isOnline;
  await provider.save();
  
  res.status(200).json({
    success: true,
    message: `Provider is now ${provider.isOnline ? 'online' : 'offline'}`,
    data: { isOnline: provider.isOnline }
  });
});

// Get all orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { response, statusCode } = await OrderService.getAllOrders(req.query, 20, 1);
  res.status(statusCode).json(response);
});

// Get order statistics
const getOrderStatistics = asyncHandler(async (req, res) => {
  const Order = require('../order/model');
  
  const stats = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$items.totalPrice' }
      }
    }
  ]);
  
  const totalOrders = await Order.countDocuments();
  const totalRevenue = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$items.totalPrice' } } }
  ]);
  
  res.status(200).json({
    success: true,
    message: 'Order statistics retrieved successfully',
    data: {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusBreakdown: stats
    }
  });
});

// Cancel order
const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const { response, statusCode } = await OrderService.adminCancelOrder(orderId, reason);
  res.status(statusCode).json(response);
});

// Get admin dashboard
const getAdminDashboard = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AdminService.getAdminDashboard();
  res.status(statusCode).json(response);
});

// Get system overview
const getSystemOverview = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AdminService.getSystemOverview();
  res.status(statusCode).json(response);
});

// Get revenue analytics
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const Order = require('../order/model');
  
  const { period = 'month' } = req.query;
  let dateFilter;
  
  const now = new Date();
  if (period === 'week') {
    dateFilter = new Date(now.setDate(now.getDate() - 7));
  } else if (period === 'year') {
    dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
  } else {
    dateFilter = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  const revenueData = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
        'timeline.delivered': { $gte: dateFilter }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timeline.delivered' },
          month: { $month: '$timeline.delivered' },
          day: { $dayOfMonth: '$timeline.delivered' }
        },
        revenue: { $sum: '$items.totalPrice' },
        orders: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
  
  res.status(200).json({
    success: true,
    message: 'Revenue analytics retrieved successfully',
    data: revenueData
  });
});

// Get performance analytics
const getPerformanceAnalytics = asyncHandler(async (req, res) => {
  const Order = require('../order/model');
  const Provider = require('../provider/model');
  
  // Average delivery time
  const avgDeliveryTime = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
        'timeline.accepted': { $exists: true },
        'timeline.delivered': { $exists: true }
      }
    },
    {
      $project: {
        deliveryTime: {
          $subtract: ['$timeline.delivered', '$timeline.accepted']
        }
      }
    },
    {
      $group: {
        _id: null,
        avgTime: { $avg: '$deliveryTime' }
      }
    }
  ]);
  
  // Provider performance
  const providerPerformance = await Provider.find({ isApproved: true })
    .select('businessName totalOrders completedOrders rating')
    .sort({ 'rating.average': -1 })
    .limit(10);
  
  res.status(200).json({
    success: true,
    message: 'Performance analytics retrieved successfully',
    data: {
      averageDeliveryTime: avgDeliveryTime[0]?.avgTime 
        ? Math.round(avgDeliveryTime[0].avgTime / (1000 * 60)) 
        : 0,
      topProviders: providerPerformance
    }
  });
});

// Cleanup cancelled orders
const cleanupCancelledOrders = asyncHandler(async (req, res) => {
  const Order = require('../order/model');
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const result = await Order.deleteMany({
    status: 'cancelled',
    'timeline.cancelled': { $lt: thirtyDaysAgo }
  });
  
  res.status(200).json({
    success: true,
    message: `Cleaned up ${result.deletedCount} cancelled orders`
  });
});

// Get system health
const getSystemHealth = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      api: 'running'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  res.status(200).json({
    success: true,
    message: 'System health retrieved successfully',
    data: health
  });
});

// Settlement Management Controllers

// Get all settlements
const getAllSettlements = asyncHandler(async (req, res) => {
  const { status, providerId, startDate, endDate, limit = 20, page = 1 } = req.query;
  
  const filters = {};
  if (status) filters.status = status;
  if (providerId) filters.providerId = providerId;
  if (startDate && endDate) {
    filters.startDate = startDate;
    filters.endDate = endDate;
  }
  
  const { response, statusCode } = await AdminService.getAllSettlements(
    filters,
    parseInt(limit),
    parseInt(page)
  );
  res.status(statusCode).json(response);
});

// Get settlement statistics
const getSettlementStats = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AdminService.getSettlementStats();
  res.status(statusCode).json(response);
});

// Create settlement
const createSettlement = asyncHandler(async (req, res) => {
  const { providerId, periodStart, periodEnd } = req.body;
  
  if (!providerId || !periodStart || !periodEnd) {
    return res.status(400).json({
      success: false,
      message: 'Provider ID, period start, and period end are required'
    });
  }
  
  const { response, statusCode } = await AdminService.createSettlement(
    providerId,
    periodStart,
    periodEnd,
    req.user._id
  );
  res.status(statusCode).json(response);
});

// Update settlement status
const updateSettlementStatus = asyncHandler(async (req, res) => {
  const { settlementId } = req.params;
  const { status, transactionId, notes, paymentMethod } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required'
    });
  }
  
  const { response, statusCode } = await AdminService.updateSettlementStatus(
    settlementId,
    status,
    req.user._id,
    { transactionId, notes, paymentMethod }
  );
  res.status(statusCode).json(response);
});

// Complete settlement
const completeSettlement = asyncHandler(async (req, res) => {
  const { settlementId } = req.params;
  const { transactionId, notes, amountPaid } = req.body;
  
  if (!transactionId) {
    return res.status(400).json({
      success: false,
      message: 'Transaction ID is required'
    });
  }
  
  const { response, statusCode } = await AdminService.completeSettlement(
    settlementId,
    transactionId,
    req.user._id,
    notes,
    amountPaid
  );
  res.status(statusCode).json(response);
});

// Create monthly settlements
const createMonthlySettlements = asyncHandler(async (req, res) => {
  const { response, statusCode } = await AdminService.createMonthlySettlements(req.user._id);
  res.status(statusCode).json(response);
});

// Ad-hoc Settle Remaining
const settleRemaining = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const { amountPaid, transactionId, notes } = req.body;
  
  if (!amountPaid) {
    return res.status(400).json({
      success: false,
      message: 'Amount paid is required'
    });
  }
  
  const { response, statusCode } = await AdminService.settleRemaining(
    providerId,
    amountPaid,
    transactionId,
    notes,
    req.user._id
  );
  res.status(statusCode).json(response);
});

module.exports = {
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  getAllProviders,
  getProviderById,
  approveProvider,
  rejectProvider,
  toggleProviderStatus,
  getAllOrders,
  getOrderStatistics,
  cancelOrder,
  getAdminDashboard,
  getSystemOverview,
  getRevenueAnalytics,
  getPerformanceAnalytics,
  cleanupCancelledOrders,
  getSystemHealth,
  getAllSettlements,
  getSettlementStats,
  createSettlement,
  updateSettlementStatus,
  completeSettlement,
  createMonthlySettlements,
  settleRemaining
};