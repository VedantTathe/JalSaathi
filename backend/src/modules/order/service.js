const Order = require('./model');
const Provider = require('../provider/model');
const User = require('../user/model');
const { formatResponse } = require('../../utils/helpers');
const crypto = require('crypto');
const razorpayService = require('../../services/razorpayService');

class OrderService {
  // Check if website is accepting orders (defaults to true if env not set)
  static isWebsiteAcceptingOrders() {
    const isWebsiteOn = process.env.IS_WEBSITE_ON;
    // Default to true if not set, only false if explicitly set to 'false' or '0'
    if (isWebsiteOn === undefined || isWebsiteOn === null || isWebsiteOn === '') {
      return true;
    }
    return isWebsiteOn === 'true' || isWebsiteOn === '1';
  }

  // Create new order
  static async createOrder(customerId, orderData) {
    console.log('🆕 [CREATE ORDER] Called for customer:', customerId, 'Payment method:', orderData.paymentMethod);
    
    try {
      // Check if website is accepting orders
      if (!this.isWebsiteAcceptingOrders()) {
        return formatResponse(false, 'Sorry, we are not able to place orders right now. Please try again later.', null, 503);
      }

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
      // Normalize payment method and determine initial statuses
      const paymentMethodNormalized = (paymentMethod || 'cash_on_delivery').toString().toLowerCase();
      const isOnline = paymentMethodNormalized === 'online';
      const isCOD = paymentMethodNormalized === 'cash_on_delivery';
      // For COD we place the order but keep it pending (provider needs to accept)
      const initialStatus = isOnline ? 'pending' : (isCOD ? 'pending' : 'accepted');
      const initialPaymentStatus = isOnline ? 'pending' : (isCOD ? 'pending' : 'pending');

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
        paymentMethod: paymentMethod || 'cash_on_delivery',
        status: initialStatus,
        paymentStatus: initialPaymentStatus
      });
      
      // Populate order details
      const populatedOrder = await Order.findById(order._id)
        .populate('customerId', 'name phone email')
        .populate('providerId');
      
      // Update provider statistics only for auto-accepted orders
      if (initialStatus === 'accepted') {
        try {
          provider.totalOrders = (provider.totalOrders || 0) + 1;
          await provider.save();
        } catch (err) {
          // non-fatal
          console.error('Failed to update provider stats after auto-accept:', err);
        }
      }

      const message = isOnline ? 'Order created, awaiting payment' : (initialStatus === 'accepted' ? 'Order created and auto-accepted' : 'Order created and pending acceptance');
      return formatResponse(true, message, populatedOrder, 201);
    } catch (error) {
      console.error('Create order error:', error);
      return formatResponse(false, 'Failed to create order', null, 500);
    }
  }
  
  // Get customer's orders
  static async getMyOrders(customerId, status = null, limit = 20, page = 1, showAll = false) {
    try {
      const query = { customerId };
      if (status) {
        query.status = status;
      } else if (!showAll) {
        // Default: show only orders considered "placed" to the user.
        // Placed = non-online payment orders (e.g., COD) OR online payments that succeeded.
        query.$or = [
          { paymentMethod: { $ne: 'online' } },
          { paymentStatus: 'paid' }
        ];
      }

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

// Razorpay integration: create order and verify payment
OrderService.createRazorpayOrder = async function(customerId, orderId) {
  try {
    if (!this.isWebsiteAcceptingOrders()) {
      return formatResponse(false, 'Sorry, we are not able to process payments right now. Please try again later.', null, 503);
    }

    const order = await Order.findById(orderId);
    if (!order) return formatResponse(false, 'Order not found', null, 404);
    if (order.customerId.toString() !== customerId.toString()) return formatResponse(false, 'Not authorized', null, 403);

    if (order.paymentStatus === 'paid') {
      return formatResponse(false, 'Order payment is already completed', null, 400);
    }

    const amount = Number(order.items.totalPrice || 0);

    try {
      // Ensure we pass full customer details (not just an ObjectId) to Razorpay
      let customer = null;
      try {
        customer = await User.findById(order.customerId).select('name phone email');
      } catch (e) {
        console.error('Failed to fetch customer details for payment:', e);
      }

      // If customer phone is missing, decline creating online payment order
      const customerPhone = (customer && (customer.phone || customer.mobile || customer.contact)) || null;
      if (!customerPhone) {
        console.error('Customer phone missing; cannot create Razorpay order');
        return formatResponse(false, 'Customer phone is required for online payments', null, 400);
      }

      // Normalize phone: digits only, add India country code if 10 digits
      const rawPhone = String(customerPhone || '');
      const digits = rawPhone.replace(/\D/g, '');
      let normalizedPhone = digits;
      if (digits.length === 10) normalizedPhone = '91' + digits;
      else if (digits.length === 11 && digits.startsWith('0')) normalizedPhone = '91' + digits.slice(1);
      else if (digits.length < 10 || digits.length > 13) {
        console.error('Customer phone invalid after normalization:', { rawPhone, digits });
        return formatResponse(false, 'Customer phone is invalid for online payments', null, 400);
      }

      const customerPayload = {
        _id: customer ? customer._id : order.customerId,
        name: (customer && customer.name) || '',
        email: (customer && customer.email) || '',
        phone: normalizedPhone,
        _rawPhone: rawPhone // debug only
      };

      console.log('🆕 Creating NEW Razorpay payment session for order:', order._id.toString());
      const data = await razorpayService.createOrder({ orderId: order._id, amount, customer: customerPayload });

      // Persist razorpay order id (if returned)
      try {
        order.paymentInfo = order.paymentInfo || {};
        // Razorpay returns 'order_id' field in response payload
        if (data && (data.order_id || data.id)) {
          order.paymentInfo.orderId = data.order_id || data.id;
        } else {
          // Fallback: Razorpay order ids are prefixed with 'order_' + internal id
          order.paymentInfo.orderId = `order_${order._id}`;
        }
        order.paymentInfo.provider = 'razorpay';
        await order.save();
      } catch (e) {
        console.error('Failed to persist razorpay order id on order:', e);
      }

      return formatResponse(true, 'Razorpay order created', { appId: process.env.RAZORPAY_KEY_ID, order: data }, 200);
    } catch (err) {
      console.error('Razorpay order create failed:', err);
      let msg = 'Failed to create payment order';
      if (err) {
        if (err.details) {
          if (typeof err.details === 'string') msg = err.details;
          else if (err.details.message) msg = err.details.message;
          else {
            try {
              msg = JSON.stringify(err.details);
            } catch (e) {
              msg = String(err.details);
            }
          }
        } else if (err.message) {
          msg = err.message;
        }
      }

      return formatResponse(false, msg, null, 500);
    }
  } catch (error) {
    console.error('createRazorpayOrder error:', error);
    return formatResponse(false, 'Failed to create payment order: ' + error.message, null, 500);
  }
};

OrderService.verifyRazorpayPayment = async function(customerId, orderId, paymentPayload) {
  try {
    const order = await Order.findById(orderId);
    if (!order) return formatResponse(false, 'Order not found', null, 404);
    if (order.customerId.toString() !== customerId.toString()) return formatResponse(false, 'Not authorized', null, 403);

    // Expected fields vary; try common names
    const orderIdFromPayload = paymentPayload.razorpay_order_id || paymentPayload.order_id || paymentPayload.orderId || paymentPayload.order;
    const referenceId = paymentPayload.razorpay_payment_id || paymentPayload.reference_id || paymentPayload.referenceId || paymentPayload.reference;
    const txStatus = paymentPayload.razorpay_signature ? 'SUCCESS' : (paymentPayload.tx_status || paymentPayload.txStatus || paymentPayload.status || paymentPayload.txStatus);
    const signature = paymentPayload.razorpay_signature || paymentPayload.signature || paymentPayload.signature_hash || paymentPayload.sig;

    if (!orderIdFromPayload || !referenceId || !txStatus || !signature) {
      console.error('Invalid Razorpay payment payload:', paymentPayload);
      return formatResponse(false, 'Invalid payment payload', null, 400);
    }

    // Basic signature verification (Razorpay may provide different signature rules).
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('Razorpay secret not configured');
      return formatResponse(false, 'Payment gateway not configured', null, 500);
    }

    const expected = crypto.createHmac('sha256', secret).update(orderIdFromPayload + '|' + referenceId).digest('hex');
    if (expected !== signature) {
      console.error('Razorpay payment signature mismatch', { expected, received: signature });
      order.paymentStatus = 'failed';
      order.status = 'failed'; // Always mark as failed
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.failedAt = new Date();
      order.paymentInfo.failedReason = 'Signature verification failed';
      await order.save();
      console.log('❌ Payment verification failed - order marked as failed:', orderId);
      return formatResponse(false, 'Payment verification failed', null, 400);
    }

    if (txStatus.toUpperCase() !== 'SUCCESS') {
      order.paymentStatus = 'failed';
      order.status = 'failed'; // Always mark as failed
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.provider = 'razorpay';
      order.paymentInfo.paymentId = referenceId;
      order.paymentInfo.orderId = orderIdFromPayload;
      order.paymentInfo.failedAt = new Date();
      order.paymentInfo.failedReason = 'Transaction not successful';
      await order.save();
      console.log('❌ Payment not successful - order marked as failed:', orderId);
      return formatResponse(false, 'Payment not successful', null, 400);
    }

    // Mark paid
    order.paymentStatus = 'paid';
    order.paymentMethod = 'online';
    order.paymentInfo = {
      provider: 'razorpay',
      paymentId: referenceId,
      orderId: orderIdFromPayload,
      signature,
      verifiedAt: new Date()
    };

    await order.save();

    const populatedOrder = await Order.findById(orderId)
      .populate('customerId', 'name phone email')
      .populate('providerId');

    return formatResponse(true, 'Payment verified and order marked paid', populatedOrder, 200);
  } catch (error) {
    console.error('verifyRazorpayPayment error:', error);
    return formatResponse(false, 'Failed to verify payment: ' + error.message, null, 500);
  }
};

module.exports = OrderService;

// Check payment status by querying Razorpay directly (useful when webhooks can't reach localhost)
OrderService.checkPaymentStatus = async function(customerId, orderId) {
  try {
    const order = await Order.findById(orderId);
    if (!order) return formatResponse(false, 'Order not found', null, 404);
    if (order.customerId.toString() !== customerId.toString()) return formatResponse(false, 'Not authorized', null, 403);

    const cfOrderId = order.paymentInfo && (order.paymentInfo.orderId || order.paymentInfo.order_id);
    if (!cfOrderId) {
      console.warn('[OrderService] No stored Razorpay order id; payment session not created yet');
      return formatResponse(false, 'Payment session not created. Please retry payment.', null, 409);
    }
    const effectiveCfOrderId = cfOrderId;

    console.log('[OrderService] Checking payment status for order:', orderId, 'Razorpay Order ID:', effectiveCfOrderId);
    const payments = await razorpayService.getOrderPayments(effectiveCfOrderId);
    console.log('[OrderService] Payments API result:', JSON.stringify(payments));
    // payments may be an object with 'items' or an array
    const items = Array.isArray(payments) ? payments : (payments.items || payments.data || []);

    // Find successful payment (support various Razorpay response field names)
    const successPayment = items.find(p => {
      const status = (p.txStatus || p.status || p.tx_status || p.payment_status || p.paymentStatus || '').toString().toLowerCase();
      return status === 'success' || status === 'succeeded' || status === 'successful' || status === 'ok';
    });

    if (successPayment) {
      const referenceId = successPayment.reference_id || successPayment.paymentId || successPayment.referenceId || successPayment.reference || successPayment.id || successPayment.cf_payment_id || successPayment.cf_payment_id;

      console.log('[OrderService] Detected successful payment:', { orderId: orderId, cfOrderId, referenceId });

      order.paymentStatus = 'paid';
      order.paymentMethod = 'online';
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.provider = 'razorpay';
      order.paymentInfo.paymentId = referenceId;
      order.paymentInfo.orderId = cfOrderId;
      order.paymentInfo.capturedAt = new Date();
      order.paymentInfo.verifiedAt = new Date();

      // Accept order and update provider stats if it was pending
      if (order.status === 'pending') {
        order.status = 'accepted';
        try {
          const provider = await Provider.findById(order.providerId);
          if (provider) {
            provider.totalOrders = (provider.totalOrders || 0) + 1;
            await provider.save();
          }
        } catch (e) {
          console.error('Failed to update provider stats after payment check:', e);
        }
      }

      await order.save();
      const populated = await Order.findById(orderId).populate('providerId');
      return formatResponse(true, 'Payment verified and order accepted', populated, 200);
    }

    // If no successful payment found, leave as pending or mark failed if terminal
    return formatResponse(false, 'No successful payment found yet', { payments: items }, 202);
  } catch (err) {
    console.error('[OrderService] checkPaymentStatus error:', err);
    if (err && err.details && err.details.code === 'order_not_found') {
      return formatResponse(false, 'Payment session not found. Please retry payment.', { code: err.details.code }, 409);
    }
    return formatResponse(false, 'Failed to check payment status: ' + (err.message || ''), null, 500);
  }
};

// Mark an order's payment as failed (customer action or timeout)
OrderService.failPayment = async function(customerId, orderId, reason = 'Payment failed or timeout') {
  try {
    const order = await Order.findById(orderId);
    if (!order) return formatResponse(false, 'Order not found', null, 404);
    if (order.customerId.toString() !== customerId.toString()) return formatResponse(false, 'Not authorized', null, 403);

    if (order.paymentStatus === 'paid') {
      return formatResponse(false, 'Order payment already completed', null, 400);
    }

    console.log(`❌ Failing order ${orderId}: current status="${order.status}", paymentStatus="${order.paymentStatus}"`);
    
    order.paymentStatus = 'failed';
    order.status = 'failed'; // Always set to failed, not just when pending
    order.paymentInfo = order.paymentInfo || {};
    order.paymentInfo.failedAt = new Date();
    order.paymentInfo.failedReason = reason;

    await order.save();
    
    console.log(`✅ Order ${orderId} marked as failed: status="${order.status}", paymentStatus="${order.paymentStatus}"`);

    const populated = await Order.findById(orderId).populate('providerId');
    return formatResponse(true, 'Order marked as payment failed', populated, 200);
  } catch (err) {
    console.error('failPayment error:', err);
    return formatResponse(false, 'Failed to mark order as failed: ' + (err.message || ''), null, 500);
  }
};