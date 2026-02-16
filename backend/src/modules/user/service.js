const User = require('./model');
const Provider = require('../provider/model');
const Order = require('../order/model');
const Address = require('../address/model');
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
      
      // Try to get customer coordinates from default address first, fallback to user address
      let customerLat = null;
      let customerLon = null;
      
      // Check for default address
      const defaultAddress = await Address.findOne({ userId, isDefault: true });
      
      console.log('📍 Default Address Query Result:', defaultAddress ? {
        _id: defaultAddress._id,
        label: defaultAddress.label,
        coordinates: defaultAddress.coordinates,
        hasLat: !!defaultAddress.coordinates?.latitude,
        hasLng: !!defaultAddress.coordinates?.longitude
      } : null);
      
      if (defaultAddress && defaultAddress.coordinates) {
        customerLat = defaultAddress.coordinates.latitude;
        customerLon = defaultAddress.coordinates.longitude;
        console.log('📍 Using default address coordinates:', { customerLat, customerLon });
      } else if (user.address && user.address.coordinates) {
        customerLat = user.address.coordinates.latitude;
        customerLon = user.address.coordinates.longitude;
        console.log('📍 Using user profile address coordinates');
      }
      
      console.log('📍 Customer Info:');
      console.log('  - User ID:', userId);
      console.log('  - Name:', user.name);
      console.log('  - Has Default Address:', !!defaultAddress);
      console.log('  - Has Coordinates:', !!(customerLat && customerLon));
      console.log('  - Latitude:', customerLat);
      console.log('  - Longitude:', customerLon);
      
      // Fetch all providers
      let providers = await Provider.find()
        .populate('userId', 'name phone email')
        .sort({ isOnline: -1, 'rating.average': -1 });
      
      console.log('📊 getNearbyProviders - Total providers:', providers.length);
      
      // Filter by distance if customer has coordinates
      if (customerLat && customerLon) {
        providers = providers.filter(provider => {
          // Skip providers without coordinates
          if (!provider.coordinates?.latitude || !provider.coordinates?.longitude) {
            console.log(`⚠️ Provider ${provider.businessName} has no coordinates, skipping`);
            return false;
          }
          
          // Calculate distance between customer and provider
          const distance = calculateDistance(
            customerLat,
            customerLon,
            provider.coordinates.latitude,
            provider.coordinates.longitude
          );
          
          // Check if customer is within provider's service radius
          const isInRange = distance <= provider.serviceRadius;
          
          // Add distance and operating hours status to provider object for frontend display
          provider._doc.distance = parseFloat(distance.toFixed(2));
          provider._doc.isWithinOperatingHours = provider.isWithinOperatingHours;
          provider._doc.isAcceptingOrders = provider.isAcceptingOrders;
          
          console.log(`🔍 Provider: ${provider.businessName}, Distance: ${distance.toFixed(2)}km, Radius: ${provider.serviceRadius}km, InRange: ${isInRange}, Hours: ${provider.operatingHours?.open}-${provider.operatingHours?.close}, Accepting: ${provider.isAcceptingOrders}`);
          
          return isInRange;
        });
        
        // Sort by distance (closest first) after filtering
        providers.sort((a, b) => a._doc.distance - b._doc.distance);
        
        console.log('✅ Providers in range:', providers.length);
      } else {
        console.log('⚠️ Customer has no coordinates, showing all providers without distance filtering');
        // Still add distance as null for all providers and add operating hours status
        providers.forEach(provider => {
          provider._doc.distance = null;
          provider._doc.isWithinOperatingHours = provider.isWithinOperatingHours;
          provider._doc.isAcceptingOrders = provider.isAcceptingOrders;
        });
      }
      
      // Return providers in correct format
      return formatResponse(true, 'Providers retrieved successfully', { providers }, 200);
      
    } catch (error) {
      console.error('❌ Get nearby providers error:', error);
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