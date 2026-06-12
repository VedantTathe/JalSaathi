const User = require('../user/model');
const Provider = require('../provider/model');
const Order = require('../order/model');
const Settlement = require('../settlement/model');
const settlementService = require('../../services/settlementService');
const { formatResponse } = require('../../utils/helpers');
const mailer = require('../../utils/mailer');

class AdminService {
  // Get all users
  static async getAllUsers(filters = {}, limit = 20, page = 1) {
    try {
      const { role, isActive, search } = filters;
      
      let query = {};
      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive === 'true';
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const totalUsers = await User.countDocuments(query);
      
      return formatResponse(true, 'Users retrieved successfully', {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: page < Math.ceil(totalUsers / limit),
          hasPrev: page > 1
        }
      }, 200);
      
    } catch (error) {
      console.error('Get all users error:', error);
      return formatResponse(false, 'Failed to retrieve users', null, 500);
    }
  }
  
  // Get user by ID
  static async getUserById(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      let userData = user.toObject();
      
      // If user is a provider, include provider details
      if (user.role === 'provider') {
        const provider = await Provider.findOne({ userId });
        if (provider) {
          userData.providerDetails = provider;
        }
      }
      
      // Get user's order statistics
      const orderStats = await Order.aggregate([
        { $match: { customerId: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$items.totalPrice' }
          }
        }
      ]);
      
      userData.orderStatistics = orderStats;
      
      return formatResponse(true, 'User retrieved successfully', userData, 200);
      
    } catch (error) {
      console.error('Get user by ID error:', error);
      return formatResponse(false, 'Failed to retrieve user', null, 500);
    }
  }
  
  // Toggle user active status
  static async toggleUserStatus(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      user.isActive = !user.isActive;
      await user.save();
      
      return formatResponse(true, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, {
        isActive: user.isActive
      }, 200);
      
    } catch (error) {
      console.error('Toggle user status error:', error);
      return formatResponse(false, 'Failed to update user status', null, 500);
    }
  }
  
  // Get all providers
  static async getAllProviders(filters = {}, limit = 20, page = 1) {
    try {
      const { isApproved, isOnline, area } = filters;
      
      let query = {};
      if (isApproved !== undefined) query.isApproved = isApproved === 'true';
      if (isOnline !== undefined) query.isOnline = isOnline === 'true';
      if (area) query.area = new RegExp(area, 'i');
      
      const skip = (page - 1) * limit;
      
      const providers = await Provider.find(query)
        .populate('userId', 'name email phone isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Get order counts and revenue for each provider
      const providersWithStats = await Promise.all(
        providers.map(async (provider) => {
          const orderCount = await Order.countDocuments({ providerId: provider._id });
          const revenueResult = await Order.aggregate([
            { $match: { providerId: provider._id, status: 'delivered' } },
            { $group: { _id: null, total: { $sum: '$items.totalPrice' } } }
          ]);
          
          return {
            ...provider.toObject(),
            orderCount,
            totalRevenue: revenueResult[0]?.total || 0
          };
        })
      );
      
      const totalProviders = await Provider.countDocuments(query);
      
      return formatResponse(true, 'Providers retrieved successfully', {
        providers: providersWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalProviders / limit),
          totalProviders,
          hasNext: page < Math.ceil(totalProviders / limit),
          hasPrev: page > 1
        }
      }, 200);
      
    } catch (error) {
      console.error('Get all providers error:', error);
      return formatResponse(false, 'Failed to retrieve providers', null, 500);
    }
  }
  
  // Approve provider
  static async approveProvider(providerId, adminId) {
    try {
      const provider = await Provider.findById(providerId);
      
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      if (provider.isApproved) {
        return formatResponse(false, 'Provider is already approved', null, 400);
      }
      
      provider.isApproved = true;
      provider.approvedBy = adminId;
      provider.approvedAt = new Date();
      await provider.save();
      
      // Send approval email
      const user = await User.findById(provider.userId);
      if (user && user.email) {
        // Run asynchronously without awaiting so it doesn't block the response
        mailer.sendProviderApprovalEmail(user.email, user.name || provider.businessName).catch(err => {
          console.error('Failed to send provider approval email:', err);
        });
      }
      
      return formatResponse(true, 'Provider approved successfully', null, 200);
      
    } catch (error) {
      console.error('Approve provider error:', error);
      return formatResponse(false, 'Failed to approve provider', null, 500);
    }
  }
  
  // Get admin dashboard
  static async getAdminDashboard() {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      
      // Basic counts
      const totalUsers = await User.countDocuments();
      const totalCustomers = await User.countDocuments({ role: 'customer' });
      const totalProviders = await Provider.countDocuments();
      const approvedProviders = await Provider.countDocuments({ isApproved: true });
      const onlineProviders = await Provider.countDocuments({ isOnline: true, isApproved: true });
      const totalOrders = await Order.countDocuments();
      
      // Today's statistics
      const todayOrders = await Order.countDocuments({ 
        createdAt: { $gte: startOfToday }
      });
      
      const todayRevenue = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            paymentMethod: 'online',
            paymentStatus: 'paid',
            'timeline.delivered': { $gte: startOfToday }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$items.totalPrice' }
          }
        }
      ]);
      
      // Monthly statistics
      const monthlyOrders = await Order.countDocuments({
        createdAt: { $gte: startOfMonth }
      });
      
      const monthlyRevenue = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            paymentMethod: 'online',
            paymentStatus: 'paid',
            'timeline.delivered': { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$items.totalPrice' }
          }
        }
      ]);
      
      // Total all-time revenue from all providers
      const totalRevenue = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            paymentMethod: 'online',
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$items.totalPrice' }
          }
        }
      ]);
      
      // Order status distribution
      const ordersByStatus = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Recent orders
      const recentOrders = await Order.find()
        .populate('customerId', 'name email')
        .populate('providerId', 'businessName')
        .sort({ createdAt: -1 })
        .limit(5);
      
      const calcAdminRevenue = (amount) => Math.round((amount || 0) * 0.05 * 100) / 100;

      return formatResponse(true, 'Admin dashboard data retrieved successfully', {
        // Stats formatted for easy access
        totalUsers,
        totalCustomers,
        totalProviders,
        activeProviders: onlineProviders,
        approvedProviders,
        totalOrders,
        totalRevenue: calcAdminRevenue(totalRevenue[0]?.total),
        revenueThisMonth: calcAdminRevenue(monthlyRevenue[0]?.total),
        ordersThisMonth: monthlyOrders,
        newUsersThisMonth: 0, // Can be calculated if needed
        pendingProviders: totalProviders - approvedProviders,
        
        // Detailed breakdown
        overview: {
          totalUsers,
          totalCustomers,
          totalProviders,
          approvedProviders,
          onlineProviders,
          totalOrders
        },
        today: {
          orders: todayOrders,
          revenue: calcAdminRevenue(todayRevenue[0]?.total)
        },
        monthly: {
          orders: monthlyOrders,
          revenue: calcAdminRevenue(monthlyRevenue[0]?.total)
        },
        ordersByStatus,
        recentOrders
      }, 200);
      
    } catch (error) {
      console.error('Get admin dashboard error:', error);
      return formatResponse(false, 'Failed to retrieve dashboard data', null, 500);
    }
  }
  
  // Get system overview analytics
  static async getSystemOverview() {
    try {
      // User growth over last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const userGrowth = await User.aggregate([
        {
          $match: { createdAt: { $gte: sixMonthsAgo } }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);
      
      // Order trends
      const orderTrends = await Order.aggregate([
        {
          $match: { createdAt: { $gte: sixMonthsAgo } }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              status: '$status'
            },
            count: { $sum: 1 },
            revenue: { $sum: '$items.totalPrice' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);
      
      // Top performing providers
      const topProviders = await Provider.find({ isApproved: true })
        .sort({ 'rating.average': -1, completedOrders: -1 })
        .populate('userId', 'name')
        .limit(10);
      
      return formatResponse(true, 'System overview retrieved successfully', {
        userGrowth,
        orderTrends,
        topProviders
      }, 200);
      
    } catch (error) {
      console.error('Get system overview error:', error);
      return formatResponse(false, 'Failed to retrieve system overview', null, 500);
    }
  }
  
  // Delete user (soft delete by deactivation)
  static async deleteUser(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      // Check for pending orders
      const pendingOrders = await Order.countDocuments({
        $or: [
          { customerId: userId, status: { $in: ['pending', 'accepted', 'assigned', 'out_for_delivery'] } },
          { deliveryBoyId: userId, status: { $in: ['assigned', 'out_for_delivery'] } }
        ]
      });
      
      if (pendingOrders > 0) {
        return formatResponse(false, 'Cannot delete user with pending orders', null, 400);
      }
      
      // If the user is a provider, delete the associated provider record
      if (user.role === 'provider') {
        await Provider.deleteOne({ userId: user._id });
      }

      // Hard delete the user
      await User.deleteOne({ _id: userId });
      
      return formatResponse(true, 'User deleted successfully', null, 200);
      
    } catch (error) {
      console.error('Delete user error:', error);
      return formatResponse(false, 'Failed to delete user', null, 500);
    }
  }

  // Settlement Management Methods
  
  // Get all settlements with filters
  static async getAllSettlements(filters = {}, limit = 20, page = 1) {
    try {
      const settlements = await settlementService.getAllSettlements(filters);
      
      return formatResponse(true, 'Settlements retrieved successfully', settlements, 200);
      
    } catch (error) {
      console.error('Get all settlements error:', error);
      return formatResponse(false, 'Failed to retrieve settlements', null, 500);
    }
  }
  
  // Get settlement statistics
  static async getSettlementStats() {
    try {
      const stats = await settlementService.getSettlementStats();
      
      return formatResponse(true, 'Settlement statistics retrieved successfully', stats, 200);
      
    } catch (error) {
      console.error('Get settlement stats error:', error);
      return formatResponse(false, 'Failed to retrieve settlement statistics', null, 500);
    }
  }
  
  // Create settlement for a provider
  static async createSettlement(providerId, periodStart, periodEnd, adminId) {
    try {
      const settlement = await settlementService.createSettlement(
        providerId,
        periodStart,
        periodEnd,
        adminId
      );
      
      return formatResponse(true, 'Settlement created successfully', settlement, 201);
      
    } catch (error) {
      console.error('Create settlement error:', error);
      return formatResponse(false, error.message || 'Failed to create settlement', null, 500);
    }
  }
  
  // Update settlement status
  static async updateSettlementStatus(settlementId, status, adminId, data = {}) {
    try {
      const settlement = await settlementService.updateSettlementStatus(
        settlementId,
        status,
        adminId,
        data
      );
      
      return formatResponse(true, 'Settlement status updated successfully', settlement, 200);
      
    } catch (error) {
      console.error('Update settlement status error:', error);
      return formatResponse(false, error.message || 'Failed to update settlement status', null, 500);
    }
  }
  
  // Complete settlement
  static async completeSettlement(settlementId, transactionId, adminId, notes) {
    try {
      const settlement = await settlementService.completeSettlement(
        settlementId,
        transactionId,
        adminId,
        notes
      );
      
      return formatResponse(true, 'Settlement completed successfully', settlement, 200);
      
    } catch (error) {
      console.error('Complete settlement error:', error);
      return formatResponse(false, error.message || 'Failed to complete settlement', null, 500);
    }
  }
  
  // Create monthly settlements for all providers
  static async createMonthlySettlements(adminId) {
    try {
      const results = await settlementService.createMonthlySettlements(adminId);
      
      return formatResponse(true, 'Monthly settlements created', results, 200);
      
    } catch (error) {
      console.error('Create monthly settlements error:', error);
      return formatResponse(false, error.message || 'Failed to create monthly settlements', null, 500);
    }
  }
}

module.exports = AdminService;