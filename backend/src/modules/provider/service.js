const Provider = require('./model');
const User = require('../user/model');
const Order = require('../order/model');
const { formatResponse } = require('../../utils/helpers');
const { sendDeliveryBoyCredentialsEmail } = require('../../utils/mailer');

class ProviderService {
  // Toggle provider online/offline status
  static async toggleOnlineStatus(userId) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider profile not found', null, 404);
      }
      
      if (!provider.isApproved) {
        return formatResponse(false, 'Provider not approved yet', null, 403);
      }
      
      await provider.toggleOnlineStatus();
      
      return formatResponse(true, `Provider is now ${provider.isOnline ? 'online' : 'offline'}`, {
        isOnline: provider.isOnline
      }, 200);
      
    } catch (error) {
      console.error('Toggle online status error:', error);
      return formatResponse(false, 'Failed to update status', null, 500);
    }
  }
  
  // Update provider profile
  static async updateProviderProfile(userId, updateData) {
    try {
      // Allow updating provider-specific fields plus coordinates and area
      const allowedProviderUpdates = [
        'businessName', 'area', 'pricePerCan', 'serviceRadius', 'minimumOrder',
        'operatingHours', 'description', 'coordinates'
      ];

      const providerUpdates = {};
      const userUpdates = {};

      Object.keys(updateData).forEach(key => {
        if (allowedProviderUpdates.includes(key)) providerUpdates[key] = updateData[key];
        // Accept some user fields as well so provider settings can update contact info
        if (['name', 'email', 'phone', 'address'].includes(key)) userUpdates[key] = updateData[key];
      });

      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }

      // Update user contact details if provided
      if (Object.keys(userUpdates).length > 0) {
        try {
          await User.findByIdAndUpdate(provider.userId, userUpdates, { new: true, runValidators: true });
        } catch (uErr) {
          console.error('Failed to update provider user fields:', uErr);
          return formatResponse(false, 'Failed to update contact details', null, 400);
        }
      }

      // Update provider fields
      Object.keys(providerUpdates).forEach(k => {
        provider[k] = providerUpdates[k];
      });

      await provider.save();

      const populated = await Provider.findById(provider._id).populate('userId', 'name email phone address');

      return formatResponse(true, 'Provider profile updated successfully', populated, 200);
      
    } catch (error) {
      console.error('Update provider profile error:', error);
      return formatResponse(false, 'Failed to update profile', null, 500);
    }
  }
  
  // Get provider orders (last 16 hours only)
  static async getProviderOrders(userId, status = null, limit = 100, page = 1) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      // Only fetch orders from last 16 hours
      const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000);
      
      const query = { 
        providerId: provider._id,
        createdAt: { $gte: sixteenHoursAgo }
      };
      if (status) query.status = status;
      
      const skip = (page - 1) * limit;
      
      const orders = await Order.find(query)
        .populate('customerId', 'name phone email address')
        .populate('deliveryBoyId', 'name phone email')
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
      console.error('Get provider orders error:', error);
      return formatResponse(false, 'Failed to retrieve orders', null, 500);
    }
  }
  
  // Accept order
  static async acceptOrder(userId, orderId) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      const order = await Order.findOne({
        _id: orderId,
        providerId: provider._id,
        status: 'pending'
      });
      
      if (!order) {
        return formatResponse(false, 'Order not found or already processed', null, 404);
      }
      
      await order.updateStatus('accepted');
      
      // Update provider statistics
      provider.totalOrders += 1;
      await provider.save();
      
      return formatResponse(true, 'Order accepted successfully', null, 200);
      
    } catch (error) {
      console.error('Accept order error:', error);
      return formatResponse(false, 'Failed to accept order', null, 500);
    }
  }
  
  // Reject order
  static async rejectOrder(userId, orderId, reason = '') {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      const order = await Order.findOne({
        _id: orderId,
        providerId: provider._id,
        status: 'pending'
      });
      
      if (!order) {
        return formatResponse(false, 'Order not found or already processed', null, 404);
      }
      
      await order.updateStatus('cancelled', { 
        cancellationReason: reason || 'Rejected by provider'
      });
      
      return formatResponse(true, 'Order rejected successfully', null, 200);
      
    } catch (error) {
      console.error('Reject order error:', error);
      return formatResponse(false, 'Failed to reject order', null, 500);
    }
  }
  
  // Assign delivery boy to order
  static async assignDeliveryBoy(userId, orderId, deliveryBoyId) {
    try {
      console.log(`[assignDeliveryBoy] userId=${userId}, orderId=${orderId}, deliveryBoyId=${deliveryBoyId}`);
      
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        console.log('[assignDeliveryBoy] Provider not found');
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      // Check if delivery boy belongs to this provider
      if (!provider.deliveryBoys.includes(deliveryBoyId)) {
        console.log('[assignDeliveryBoy] Delivery boy not in provider list');
        return formatResponse(false, 'Delivery boy not associated with this provider', null, 400);
      }
      
      // Allow assigning to orders in pending, accepted, assigned, or out_for_delivery status
      const order = await Order.findOne({
        _id: orderId,
        providerId: provider._id,
        status: { $in: ['pending', 'accepted', 'assigned', 'out_for_delivery'] }
      });
      
      if (!order) {
        console.log('[assignDeliveryBoy] Order not found or wrong status');
        return formatResponse(false, 'Order not found or not in assignable status', null, 404);
      }
      
      await order.assignDeliveryBoy(deliveryBoyId);
      console.log('[assignDeliveryBoy] Successfully assigned');
      
      return formatResponse(true, 'Delivery boy assigned successfully', null, 200);
      
    } catch (error) {
      console.error('Assign delivery boy error:', error);
      return formatResponse(false, 'Failed to assign delivery boy', null, 500);
    }
  }
  
  // Get delivery boys
  static async getDeliveryBoys(userId) {
    try {
      console.log('[Service] getDeliveryBoys called for userId:', userId);
      
      const provider = await Provider.findOne({ userId }).populate(
        'deliveryBoys', 
        'name email phone isActive'
      );
      
      if (!provider) {
        console.log('[Service] Provider not found');
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      console.log('[Service] Provider found:', provider.businessName);
      console.log('[Service] Delivery boys count:', provider.deliveryBoys?.length || 0);
      console.log('[Service] Delivery boys:', JSON.stringify(provider.deliveryBoys, null, 2));
      
      return formatResponse(true, 'Delivery boys retrieved successfully', provider.deliveryBoys, 200);
      
    } catch (error) {
      console.error('[Service] Get delivery boys error:', error);
      return formatResponse(false, 'Failed to retrieve delivery boys', null, 500);
    }
  }
  
  // Add delivery boy
  static async addDeliveryBoy(userId, deliveryBoyData) {
    try {
      console.log('[Service] addDeliveryBoy called for userId:', userId);
      console.log('[Service] Delivery boy data:', { name: deliveryBoyData.name, email: deliveryBoyData.email });
      
      const provider = await Provider.findOne({ userId }).populate('userId', 'name');
      if (!provider) {
        console.log('[Service] Provider not found');
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      console.log('[Service] Provider found:', provider.businessName);
      
      // Validate email is provided
      if (!deliveryBoyData.email) {
        console.log('[Service] Email not provided');
        return formatResponse(false, 'Email is required for delivery boy', null, 400);
      }
      
      // Check if email already exists
      console.log('[Service] Checking if email exists:', deliveryBoyData.email);
      const existingUser = await User.findOne({ email: deliveryBoyData.email });
      if (existingUser) {
        console.log('[Service] Email already registered for user:', existingUser.name, 'with role:', existingUser.role);
        return formatResponse(
          false, 
          `This email is already registered in the system${existingUser.role ? ` as a ${existingUser.role}` : ''}. Please use a different email address.`, 
          null, 
          400
        );
      }
      
      console.log('[Service] Email is available');
      
      // Create delivery boy user
      // If password not provided, generate one and return it to the caller so provider can note it
      let generatedPassword = null;
      if (!deliveryBoyData.password) {
        generatedPassword = Math.random().toString(36).slice(-8);
        deliveryBoyData.password = generatedPassword;
        console.log('[Service] Auto-generated password');
      }

      const toCreate = {
        ...deliveryBoyData,
        role: 'delivery',
        providerId: provider._id,
        isEmailVerified: true, // Auto-verify for delivery boys
        isActive: true
      };

      console.log('[Service] Creating delivery boy user...');
      const deliveryBoy = await User.create(toCreate);
      console.log('[Service] Delivery boy user created:', deliveryBoy._id);

      // Add to provider's delivery boys list
      provider.deliveryBoys.push(deliveryBoy._id);
      await provider.save();
      console.log('[Service] Added to provider delivery boys list');
      
      // Send credentials email to delivery boy
      const passwordToSend = generatedPassword || deliveryBoyData.password;
      const providerName = provider.userId?.name || provider.businessName || 'Your Provider';
      
      console.log(`[Service] Sending credentials email to ${deliveryBoy.email}`);
      const emailResult = await sendDeliveryBoyCredentialsEmail(
        deliveryBoy.email,
        deliveryBoy.name,
        passwordToSend,
        providerName
      );
      
      if (!emailResult.success) {
        console.warn(`[Service] Failed to send credentials email to ${deliveryBoy.email}`);
      } else {
        console.log(`[Service] Credentials email sent successfully`);
      }

      const responsePayload = {
        id: deliveryBoy._id,
        name: deliveryBoy.name,
        email: deliveryBoy.email,
        phone: deliveryBoy.phone,
        credentialsSent: emailResult.success
      };

      if (generatedPassword) responsePayload.generatedPassword = generatedPassword;

      console.log('[Service] Delivery boy added successfully');
      return formatResponse(true, 'Delivery boy added successfully. Credentials sent to email.', responsePayload, 201);
      
    } catch (error) {
      console.error('[Service] Add delivery boy error:', error);
      return formatResponse(false, 'Failed to add delivery boy', null, 500);
    }
  }
  
  // Remove delivery boy
  static async removeDeliveryBoy(userId, deliveryBoyId) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      // Check for pending orders assigned to this delivery boy
      const pendingOrders = await Order.countDocuments({
        deliveryBoyId,
        status: { $in: ['assigned', 'out_for_delivery'] }
      });
      
      if (pendingOrders > 0) {
        return formatResponse(false, 'Cannot remove delivery boy with pending orders', null, 400);
      }
      
      // Remove from provider's list
      provider.deliveryBoys = provider.deliveryBoys.filter(
        id => id.toString() !== deliveryBoyId
      );
      await provider.save();
      
      // Deactivate user account
      await User.findByIdAndUpdate(deliveryBoyId, { isActive: false });
      
      return formatResponse(true, 'Delivery boy removed successfully', null, 200);
      
    } catch (error) {
      console.error('Remove delivery boy error:', error);
      return formatResponse(false, 'Failed to remove delivery boy', null, 500);
    }
  }
  
  // Get provider analytics
  static async getAnalytics(userId) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      
      // Monthly orders
      const monthlyOrders = await Order.countDocuments({
        providerId: provider._id,
        createdAt: { $gte: startOfMonth }
      });
      
      // Weekly orders
      const weeklyOrders = await Order.countDocuments({
        providerId: provider._id,
        createdAt: { $gte: startOfWeek }
      });
      
      // Order status distribution
      const ordersByStatus = await Order.aggregate([
        { $match: { providerId: provider._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      
      // Monthly revenue
      const monthlyRevenue = await Order.aggregate([
        { 
          $match: { 
            providerId: provider._id,
            status: 'delivered',
            createdAt: { $gte: startOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$items.totalPrice' } } }
      ]);
      
      return formatResponse(true, 'Analytics retrieved successfully', {
        totalOrders: provider.totalOrders,
        completedOrders: provider.completedOrders,
        completionRate: provider.completionRate,
        monthlyOrders,
        weeklyOrders,
        monthlyRevenue: (monthlyRevenue[0] && monthlyRevenue[0].total) || 0,
        rating: provider.rating,
        ordersByStatus
      }, 200);
    } catch (error) {
      console.error('Get analytics error:', error);
      return formatResponse(false, 'Failed to retrieve analytics', null, 500);
    }
  }

  // Get order history grouped by day with revenue summary
  static async getOrderHistory(userId, query = {}) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }

      const days = parseInt(query.days) || 30; // Default last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Get all orders in date range
      const orders = await Order.find({
        providerId: provider._id,
        createdAt: { $gte: startDate }
      })
        .populate('customerId', 'name phone email')
        .populate('deliveryBoyId', 'name phone')
        .sort({ createdAt: -1 });

      // Group orders by date
      const groupedByDay = {};
      orders.forEach(order => {
        const dateKey = new Date(order.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
        if (!groupedByDay[dateKey]) {
          groupedByDay[dateKey] = {
            date: dateKey,
            orders: [],
            totalOrders: 0,
            totalRevenue: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            pendingOrders: 0
          };
        }
        groupedByDay[dateKey].orders.push(order);
        groupedByDay[dateKey].totalOrders++;
        groupedByDay[dateKey].totalRevenue += order.items?.totalPrice || 0;
        
        if (order.status === 'delivered') groupedByDay[dateKey].deliveredOrders++;
        else if (order.status === 'cancelled') groupedByDay[dateKey].cancelledOrders++;
        else groupedByDay[dateKey].pendingOrders++;
      });

      // Convert to array sorted by date descending
      const dailySummary = Object.values(groupedByDay).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      // Calculate overall stats
      const totalRevenue = orders.reduce((sum, o) => sum + (o.items?.totalPrice || 0), 0);
      const totalOrders = orders.length;
      const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
      const paidOrders = orders.filter(o => o.paymentStatus === 'paid').length;
      const paidRevenue = orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + (o.items?.totalPrice || 0), 0);

      return formatResponse(true, 'Order history retrieved successfully', {
        dailySummary,
        overallStats: {
          totalRevenue,
          totalOrders,
          deliveredOrders,
          paidOrders,
          paidRevenue,
          avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
          days
        }
      }, 200);

    } catch (error) {
      console.error('Get order history error:', error);
      return formatResponse(false, 'Failed to retrieve order history', null, 500);
    }
  }

  // Get customers who have ordered from this provider
  static async getCustomers(userId, query = {}) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }

      const limit = parseInt(query.limit) || 50;
      const page = parseInt(query.page) || 1;

      // Aggregate orders grouped by customer
      const pipeline = [
        { $match: { providerId: provider._id } },
        { $group: {
          _id: '$customerId',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$items.totalPrice' },
          lastOrdered: { $max: '$timeline.ordered' }
        }},
        { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }},
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: false } },
        { $project: {
          _id: 0,
          customerId: '$_id',
          name: '$customer.name',
          email: '$customer.email',
          phone: '$customer.phone',
          totalOrders: 1,
          totalRevenue: 1,
          lastOrdered: 1
        }},
        { $sort: { lastOrdered: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ];

      const customers = await Order.aggregate(pipeline);

      return formatResponse(true, 'Customers retrieved successfully', {
        customers,
        pagination: {
          currentPage: page,
          perPage: limit,
          count: customers.length
        }
      }, 200);

    } catch (error) {
      console.error('Get customers error:', error);
      return formatResponse(false, 'Failed to retrieve customers', null, 500);
    }
  }

}

module.exports = ProviderService;