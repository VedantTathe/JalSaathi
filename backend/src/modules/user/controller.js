const UserService = require('./service');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Get user dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const { response, statusCode } = await UserService.getDashboard(req.user._id, req.user.role);
  res.status(statusCode).json(response);
});

// Get nearby providers
const getNearbyProviders = asyncHandler(async (req, res) => {
  console.error("Failed to fetch nearby providers");

  return res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

// Get customer orders
const getCustomerOrders = asyncHandler(async (req, res) => {
  const { status, limit = 20, page = 1 } = req.query;
  const { response, statusCode } = await UserService.getCustomerOrders(
    req.user._id, 
    status, 
    parseInt(limit), 
    parseInt(page)
  );
  res.status(statusCode).json(response);
});

// Rate order
const rateOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { rating, feedback } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }
  
  const { response, statusCode } = await UserService.rateOrder(
    req.user._id, 
    orderId, 
    rating, 
    feedback
  );
  res.status(statusCode).json(response);
});

// Update user address
const updateAddress = asyncHandler(async (req, res) => {
  const User = require('./model');
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { address: req.body.address },
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    data: { address: user.address }
  });
});

// Get order history
const getOrderHistory = asyncHandler(async (req, res) => {
  const { limit = 20, page = 1 } = req.query;
  const { response, statusCode } = await UserService.getCustomerOrders(
    req.user._id,
    null,
    parseInt(limit),
    parseInt(page)
  );
  res.status(statusCode).json(response);
});

// Get payments
const getPayments = asyncHandler(async (req, res) => {
  const Order = require('../order/model');
  
  try {
    // Get all orders for the customer
    const orders = await Order.find({ customerId: req.user._id })
      .populate('providerId', 'businessName')
      .sort({ 'timeline.ordered': -1 });
    
    // Calculate payment summary
    const totalPaid = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.items.totalPrice || 0), 0);
    
    const totalPending = orders
      .filter(o => o.paymentStatus === 'pending' && o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.items.totalPrice || 0), 0);
    
    const totalAmount = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.items.totalPrice || 0), 0);
    
    // Format payment transactions
    const transactions = orders.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      provider: order.providerId?.businessName || 'Unknown',
      amount: order.items.totalPrice,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      date: order.timeline.ordered,
      orderStatus: order.status
    }));
    
    res.status(200).json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        summary: {
          totalAmount,
          totalPaid,
          totalPending,
          completedOrders: orders.filter(o => o.status === 'delivered').length
        },
        transactions
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments'
    });
  }
});

module.exports = {
  getDashboard,
  getNearbyProviders,
  getCustomerOrders,
  rateOrder,
  updateAddress,
  getOrderHistory,
  getPayments
};