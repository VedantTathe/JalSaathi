const Provider = require('./model');
const User = require('../user/model');
const Order = require('../order/model');
const { formatResponse } = require('../../utils/helpers');

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
      const allowedUpdates = ['businessName', 'pricePerCan', 'serviceRadius', 'minimumOrder', 'operatingHours', 'description'];
      const filteredData = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });
      
      const provider = await Provider.findOneAndUpdate(
        { userId },
        filteredData,
        { new: true, runValidators: true }
      ).populate('userId', 'name email phone address');
      
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      return formatResponse(true, 'Provider profile updated successfully', provider, 200);
      
    } catch (error) {
      console.error('Update provider profile error:', error);
      return formatResponse(false, 'Failed to update profile', null, 500);
    }
  }
  
  // Get provider orders
  static async getProviderOrders(userId, status = null, limit = 20, page = 1) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      const query = { providerId: provider._id };
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
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      // Check if delivery boy belongs to this provider
      if (!provider.deliveryBoys.includes(deliveryBoyId)) {
        return formatResponse(false, 'Delivery boy not associated with this provider', null, 400);
      }
      
      const order = await Order.findOne({
        _id: orderId,
        providerId: provider._id,
        status: 'accepted'
      });
      
      if (!order) {
        return formatResponse(false, 'Order not found or not in accepted status', null, 404);
      }
      
      await order.assignDeliveryBoy(deliveryBoyId);
      
      return formatResponse(true, 'Delivery boy assigned successfully', null, 200);
      
    } catch (error) {
      console.error('Assign delivery boy error:', error);
      return formatResponse(false, 'Failed to assign delivery boy', null, 500);
    }
  }
  
  // Get delivery boys
  static async getDeliveryBoys(userId) {
    try {
      const provider = await Provider.findOne({ userId }).populate(
        'deliveryBoys', 
        'name email phone isActive'
      );
      
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      return formatResponse(true, 'Delivery boys retrieved successfully', provider.deliveryBoys, 200);
      
    } catch (error) {
      console.error('Get delivery boys error:', error);
      return formatResponse(false, 'Failed to retrieve delivery boys', null, 500);
    }
  }
  
  // Add delivery boy
  static async addDeliveryBoy(userId, deliveryBoyData) {
    try {
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      // Create delivery boy user
      // Ensure required password exists for User model; generate if not provided
      if (!deliveryBoyData.password) {
        deliveryBoyData.password = Math.random().toString(36).slice(-8);
      }

      const toCreate = {
        ...deliveryBoyData,
        role: 'delivery',
        providerId: provider._id
      };

      const deliveryBoy = await User.create(toCreate);
      
      // Add to provider's delivery boys list
      provider.deliveryBoys.push(deliveryBoy._id);
      await provider.save();
      
      return formatResponse(true, 'Delivery boy added successfully', {
        id: deliveryBoy._id,
        name: deliveryBoy.name,
        email: deliveryBoy.email,
        phone: deliveryBoy.phone
      }, 201);
      
    } catch (error) {
      console.error('Add delivery boy error:', error);
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