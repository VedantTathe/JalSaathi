const User = require('./model');
const Provider = require('../provider/model');
const Order = require('../order/model');
const { formatResponse, calculateDistance } = require('../../utils/helpers');

class UserService {
  // Get user dashboard data based on role
  static async getDashboard(userId, userRole) {
    try {
      let dashboardData = {};
      
      switch (userRole) {
        case 'customer':
          dashboardData = await this.getCustomerDashboard(userId);
          break;
        case 'provider':
          dashboardData = await this.getProviderDashboard(userId);
          break;
        case 'delivery':
          dashboardData = await this.getDeliveryDashboard(userId);
          break;
        case 'admin':
          dashboardData = await this.getAdminDashboard();
          break;
        default:
          return formatResponse(false, 'Invalid user role', null, 400);
      }
      
      return formatResponse(true, 'Dashboard data retrieved successfully', dashboardData, 200);
      
    } catch (error) {
      console.error('Get dashboard error:', error);
      return formatResponse(false, 'Failed to retrieve dashboard data', null, 500);
    }
  }
  
  // Customer dashboard
  static async getCustomerDashboard(userId) {
    const recentOrders = await Order.findByCustomer(userId).limit(5);
    const orderStats = await Order.aggregate([
      { $match: { customerId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    return {
      recentOrders,
      orderStats,
      totalOrders: recentOrders.length
    };
  }
  
  // Provider dashboard
  static async getProviderDashboard(userId) {
    const provider = await Provider.findOne({ userId });
    if (!provider) throw new Error('Provider not found');
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayOrders = await Order.countDocuments({
      providerId: provider._id,
      createdAt: { $gte: todayStart }
    });
    
    const pendingOrders = await Order.findByProvider(provider._id, 'pending').limit(10);
    
    return {
      provider: {
        businessName: provider.businessName,
        isOnline: provider.isOnline,
        rating: provider.rating,
        totalOrders: provider.totalOrders,
        completedOrders: provider.completedOrders,
        revenue: provider.revenue
      },
      todayOrders,
      pendingOrders
    };
  }
  
  // Delivery dashboard
  static async getDeliveryDashboard(userId) {
    const assignedOrders = await Order.find({
      deliveryBoyId: userId,
      status: { $in: ['assigned', 'out_for_delivery'] }
    }).populate('customerId', 'name phone address');
    
    const completedToday = await Order.countDocuments({
      deliveryBoyId: userId,
      status: 'delivered',
      'timeline.delivered': { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    
    return {
      assignedOrders,
      completedToday,
      totalCompleted: await Order.countDocuments({
        deliveryBoyId: userId,
        status: 'delivered'
      })
    };
  }
  
  // Admin dashboard
  static async getAdminDashboard() {
    const totalUsers = await User.countDocuments();
    const totalProviders = await Provider.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const recentOrders = await Order.find()
      .populate('customerId', 'name email')
      .populate('providerId')
      .sort({ createdAt: -1 })
      .limit(10);
    
    return {
      stats: {
        totalUsers,
        totalProviders,
        totalOrders
      },
      ordersByStatus,
      recentOrders
    };
  }
  
  // Get nearby providers for customers
  static async getNearbyProviders(userId, area) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      // Find providers in the same area that are online and approved
      const searchArea = area || user.address?.area;
      if (!searchArea) {
        return formatResponse(false, 'Area information is required', null, 400);
      }
      
      const providers = await Provider.findAvailableProviders(searchArea);
      
      return formatResponse(true, 'Nearby providers retrieved successfully', providers, 200);
      
    } catch (error) {
      console.error('Get nearby providers error:', error);
      return formatResponse(false, 'Failed to retrieve nearby providers', null, 500);
    }
  }
  
  // Get customer orders
  static async getCustomerOrders(userId, status = null, limit = 20, page = 1) {
    try {
      const query = { customerId: userId };
      if (status) query.status = status;
      
      const skip = (page - 1) * limit;
      
      const orders = await Order.find(query)
        .populate('providerId')
        .populate('deliveryBoyId', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const totalOrders = await Order.countDocuments(query);
      
      return formatResponse(true, 'Orders retrieved successfully', {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: page < Math.ceil(totalOrders / limit),
          hasPrev: page > 1
        }
      }, 200);
      
    } catch (error) {
      console.error('Get customer orders error:', error);
      return formatResponse(false, 'Failed to retrieve orders', null, 500);
    }
  }
  
  // Rate an order
  static async rateOrder(userId, orderId, rating, feedback = '') {
    try {
      const order = await Order.findOne({
        _id: orderId,
        customerId: userId,
        status: 'delivered'
      });
      
      if (!order) {
        return formatResponse(false, 'Order not found or not delivered', null, 404);
      }
      
      if (order.rating.score) {
        return formatResponse(false, 'Order already rated', null, 400);
      }
      
      // Update order rating
      order.rating = {
        score: rating,
        feedback,
        ratedAt: new Date()
      };
      await order.save();
      
      // Update provider rating
      const provider = await Provider.findById(order.providerId);
      if (provider) {
        const totalScore = (provider.rating.average * provider.rating.count) + rating;
        provider.rating.count += 1;
        provider.rating.average = totalScore / provider.rating.count;
        await provider.save();
      }
      
      return formatResponse(true, 'Order rated successfully', null, 200);
      
    } catch (error) {
      console.error('Rate order error:', error);
      return formatResponse(false, 'Failed to rate order', null, 500);
    }
  }
}

module.exports = UserService;