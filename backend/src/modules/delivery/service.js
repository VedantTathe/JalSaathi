const Order = require('../order/model');
const User = require('../user/model');
const { formatResponse } = require('../../utils/helpers');
const mailer = require('../../utils/mailer');

class DeliveryService {
  // Get assigned orders for delivery boy
  static async getAssignedOrders(deliveryBoyId) {
    try {
      const orders = await Order.find({
        deliveryBoyId,
        status: { $in: ['assigned', 'out_for_delivery'] }
      })
      .populate('customerId', 'name phone address specialNotes')
      .populate('providerId', 'businessName phone')
      .sort({ createdAt: -1 });
      
      return formatResponse(true, 'Assigned orders retrieved successfully', orders, 200);
      
    } catch (error) {
      console.error('Get assigned orders error:', error);
      return formatResponse(false, 'Failed to retrieve assigned orders', null, 500);
    }
  }
  
  // Update delivery status
  static async updateDeliveryStatus(deliveryBoyId, orderId, newStatus, notes = '') {
    try {
      const validStatuses = ['assigned', 'out_for_delivery', 'delivered'];
      
      if (!validStatuses.includes(newStatus)) {
        return formatResponse(false, 'Invalid status', null, 400);
      }
      
      const order = await Order.findOne({
        _id: orderId,
        deliveryBoyId,
        status: { $ne: 'delivered' }
      });
      
      if (!order) {
        return formatResponse(false, 'Order not found or already delivered', null, 404);
      }
      
      // Update order status
      await order.updateStatus(newStatus, {
        deliveryNotes: notes
      });

      // Send email if delivered
      if (newStatus === 'delivered') {
        const populatedOrder = await Order.findById(orderId)
          .populate('customerId', 'name email')
          .populate('providerId', 'businessName');
          
        if (populatedOrder && populatedOrder.customerId?.email) {
          mailer.sendOrderDeliveredEmail(
            populatedOrder.customerId.email,
            populatedOrder.customerId.name || 'Customer',
            populatedOrder.orderNumber || populatedOrder._id.toString().slice(-8),
            populatedOrder.providerId?.businessName || 'Your Provider'
          ).catch(err => console.error('Background email failed:', err));
        }
      }
      
      return formatResponse(true, 'Delivery status updated successfully', null, 200);
      
    } catch (error) {
      console.error('Update delivery status error:', error);
      return formatResponse(false, 'Failed to update delivery status', null, 500);
    }
  }
  
  // Mark order as delivered
  static async markAsDelivered(deliveryBoyId, orderId, deliveryNotes = '') {
    try {
      const order = await Order.findOne({
        _id: orderId,
        deliveryBoyId,
        status: { $in: ['assigned', 'out_for_delivery'] }
      }).populate('providerId').populate('customerId', 'name email');
      
      if (!order) {
        return formatResponse(false, 'Order not found or cannot be marked as delivered', null, 404);
      }
      
      // For COD orders, payment must be collected first
      if (order.paymentMethod === 'cash_on_delivery' && order.paymentStatus !== 'paid') {
        return formatResponse(false, 'Please collect COD payment before marking as delivered', null, 400);
      }
      
      // Mark as delivered
      await order.updateStatus('delivered', {
        deliveryNotes
      });
      
      // Update provider statistics
      if (order.providerId) {
        order.providerId.completedOrders += 1;
        order.providerId.revenue.total += order.items.totalPrice;
        order.providerId.revenue.thisMonth += order.items.totalPrice;
        await order.providerId.save();
      }

      // Send delivery email to customer
      if (order.customerId?.email) {
        mailer.sendOrderDeliveredEmail(
          order.customerId.email,
          order.customerId.name || 'Customer',
          order.orderNumber || order._id.toString().slice(-8),
          order.providerId?.businessName || 'Your Provider'
        ).catch(err => console.error('Background email failed:', err));
      }
      
      return formatResponse(true, 'Order marked as delivered successfully', null, 200);
      
    } catch (error) {
      console.error('Mark as delivered error:', error);
      return formatResponse(false, 'Failed to mark order as delivered', null, 500);
    }
  }
  
  // Get delivery history
  static async getDeliveryHistory(deliveryBoyId, limit = 20, page = 1) {
    try {
      const skip = (page - 1) * limit;
      
      const orders = await Order.find({
        deliveryBoyId,
        status: 'delivered'
      })
      .populate('customerId', 'name address')
      .populate('providerId', 'businessName')
      .sort({ 'timeline.delivered': -1 })
      .skip(skip)
      .limit(limit);
      
      const totalOrders = await Order.countDocuments({
        deliveryBoyId,
        status: 'delivered'
      });
      
      return formatResponse(true, 'Delivery history retrieved successfully', {
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
      console.error('Get delivery history error:', error);
      return formatResponse(false, 'Failed to retrieve delivery history', null, 500);
    }
  }
  
  // Mark COD payment as received
  static async markPaymentReceived(deliveryBoyId, orderId) {
    try {
      const order = await Order.findOne({
        _id: orderId,
        deliveryBoyId,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'pending'
      });
      
      if (!order) {
        return formatResponse(false, 'Order not found or payment already received', null, 404);
      }
      
      // Update payment status to paid
      order.paymentStatus = 'paid';
      await order.save();
      
      return formatResponse(true, 'Payment marked as received successfully', null, 200);
      
    } catch (error) {
      console.error('Mark payment received error:', error);
      return formatResponse(false, 'Failed to mark payment as received', null, 500);
    }
  }
  
  // Get performance statistics
  static async getPerformanceStats(deliveryBoyId) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      
      // Total deliveries
      const totalDeliveries = await Order.countDocuments({
        deliveryBoyId,
        status: 'delivered'
      });
      
      // Today's deliveries
      const todayDeliveries = await Order.countDocuments({
        deliveryBoyId,
        status: 'delivered',
        'timeline.delivered': { $gte: startOfToday }
      });
      
      // This week's deliveries
      const weekDeliveries = await Order.countDocuments({
        deliveryBoyId,
        status: 'delivered',
        'timeline.delivered': { $gte: startOfWeek }
      });
      
      // This month's deliveries
      const monthDeliveries = await Order.countDocuments({
        deliveryBoyId,
        status: 'delivered',
        'timeline.delivered': { $gte: startOfMonth }
      });
      
      // Average delivery time
      const avgDeliveryTime = await Order.aggregate([
        {
          $match: {
            deliveryBoyId: deliveryBoyId,
            status: 'delivered',
            'timeline.assigned': { $exists: true },
            'timeline.delivered': { $exists: true }
          }
        },
        {
          $project: {
            deliveryTime: {
              $subtract: ['$timeline.delivered', '$timeline.assigned']
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
      
      // Convert milliseconds to minutes
      const avgTimeInMinutes = avgDeliveryTime.length > 0 
        ? Math.round(avgDeliveryTime[0].avgTime / (1000 * 60))
        : 0;
      
      return formatResponse(true, 'Performance statistics retrieved successfully', {
        totalDeliveries,
        todayDeliveries,
        weekDeliveries,
        monthDeliveries,
        averageDeliveryTime: avgTimeInMinutes
      }, 200);
      
    } catch (error) {
      console.error('Get performance stats error:', error);
      return formatResponse(false, 'Failed to retrieve performance statistics', null, 500);
    }
  }
}

module.exports = DeliveryService;