const Order = require('./model');
const Provider = require('../provider/model');
const User = require('../user/model');
const { formatResponse } = require('../../utils/helpers');

class OrderService {
  // Create new order
  static async createOrder(customerId, orderData) {
    try {
      const { providerId, quantity, deliveryAddress, specialInstructions, paymentMethod } = orderData;
      
      // Get provider details
      const provider = await Provider.findById(providerId);
      if (!provider) {
        return formatResponse(false, 'Provider not found', null, 404);
      }
      
      if (!provider.isOnline || !provider.isApproved) {
        return formatResponse(false, 'Provider is not available for orders', null, 400);
      }
      
      // Check minimum order requirement
      if (quantity < provider.minimumOrder) {
        return formatResponse(false, `Minimum order quantity is ${provider.minimumOrder}`, null, 400);
      }
      
      // Create order
      const order = await Order.create({
        customerId,
        providerId,
        items: {
          quantity,
          pricePerCan: provider.pricePerCan,
          totalPrice: quantity * provider.pricePerCan
        },
        deliveryAddress,
        specialInstructions: specialInstructions || '',
        paymentMethod: paymentMethod || 'cash_on_delivery'
      });
      
      // Populate order details
      const populatedOrder = await Order.findById(order._id)
        .populate('customerId', 'name phone email')
        .populate('providerId');
      
      return formatResponse(true, 'Order created successfully', populatedOrder, 201);
      
    } catch (error) {
      console.error('Create order error:', error);
      return formatResponse(false, 'Failed to create order', null, 500);
    }
  }
  
  // Get customer's orders
  static async getMyOrders(customerId, status = null, limit = 20, page = 1) {
    try {
      const query = { customerId };
      if (status) query.status = status;
      
      const skip = (page - 1) * limit;
      
      const orders = await Order.find(query)
        .populate('providerId')
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
      console.error('Get my orders error:', error);
      return formatResponse(false, 'Failed to retrieve orders', null, 500);
    }
  }
  
  // Get order by ID
  static async getOrderById(orderId, userId, userRole) {
    try {
      let query = { _id: orderId };
      
      // Restrict access based on user role
      if (userRole === 'customer') {
        query.customerId = userId;
      } else if (userRole === 'delivery') {
        query.deliveryBoyId = userId;
      } else if (userRole === 'provider') {
        const provider = await Provider.findOne({ userId });
        if (provider) {
          query.providerId = provider._id;
        }
      }
      // Admin can access all orders
      
      const order = await Order.findOne(query)
        .populate('customerId', 'name phone email address')
        .populate('providerId')
        .populate('deliveryBoyId', 'name phone email');
      
      if (!order) {
        return formatResponse(false, 'Order not found or access denied', null, 404);
      }
      
      return formatResponse(true, 'Order retrieved successfully', order, 200);
      
    } catch (error) {
      console.error('Get order by ID error:', error);
      return formatResponse(false, 'Failed to retrieve order', null, 500);
    }
  }
  
  // Track order
  static async trackOrder(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('customerId', 'name phone')
        .populate('providerId', 'businessName phone')
        .populate('deliveryBoyId', 'name phone');
      
      if (!order) {
        return formatResponse(false, 'Order not found', null, 404);
      }
      
      const trackingInfo = {
        orderNumber: order.orderNumber,
        status: order.status,
        timeline: order.timeline,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        deliveryAddress: order.deliveryAddress,
        items: order.items,
        provider: {
          businessName: order.providerId.businessName,
          phone: order.providerId.phone
        }
      };
      
      if (order.deliveryBoyId) {
        trackingInfo.deliveryBoy = {
          name: order.deliveryBoyId.name,
          phone: order.deliveryBoyId.phone
        };
      }
      
      return formatResponse(true, 'Order tracking retrieved successfully', trackingInfo, 200);
      
    } catch (error) {
      console.error('Track order error:', error);
      return formatResponse(false, 'Failed to track order', null, 500);
    }
  }
  
  // Cancel order (by customer)
  static async cancelOrder(orderId, customerId, reason = '') {
    try {
      const order = await Order.findOne({
        _id: orderId,
        customerId,
        status: { $in: ['pending', 'accepted'] }
      });
      
      if (!order) {
        return formatResponse(false, 'Order not found or cannot be cancelled', null, 404);
      }
      
      await order.updateStatus('cancelled', {
        cancellationReason: reason || 'Cancelled by customer'
      });
      
      return formatResponse(true, 'Order cancelled successfully', null, 200);
      
    } catch (error) {
      console.error('Cancel order error:', error);
      return formatResponse(false, 'Failed to cancel order', null, 500);
    }
  }
  
  // Get all orders (admin)
  static async getAllOrders(filters = {}, limit = 20, page = 1) {
    try {
      const { status, providerId, customerId, dateFrom, dateTo } = filters;
      
      let query = {};
      
      if (status) query.status = status;
      if (providerId) query.providerId = providerId;
      if (customerId) query.customerId = customerId;
      
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      const skip = (page - 1) * limit;
      
      const orders = await Order.find(query)
        .populate('customerId', 'name email phone')
        .populate('providerId', 'businessName userId')
        .populate('deliveryBoyId', 'name phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const totalOrders = await Order.countDocuments(query);
      
      // Get summary statistics
      const stats = await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$items.totalPrice' }
          }
        }
      ]);
      
      return formatResponse(true, 'All orders retrieved successfully', {
        orders,
        stats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: page < Math.ceil(totalOrders / limit),
          hasPrev: page > 1
        }
      }, 200);
      
    } catch (error) {
      console.error('Get all orders error:', error);
      return formatResponse(false, 'Failed to retrieve orders', null, 500);
    }
  }
  
  // Admin cancel order
  static async adminCancelOrder(orderId, reason = '') {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return formatResponse(false, 'Order not found', null, 404);
      }
      
      if (order.status === 'delivered' || order.status === 'cancelled') {
        return formatResponse(false, 'Cannot cancel delivered or already cancelled order', null, 400);
      }
      
      await order.updateStatus('cancelled', {
        cancellationReason: reason || 'Cancelled by admin'
      });
      
      return formatResponse(true, 'Order cancelled by admin successfully', null, 200);
      
    } catch (error) {
      console.error('Admin cancel order error:', error);
      return formatResponse(false, 'Failed to cancel order', null, 500);
    }
  }
}

module.exports = OrderService;