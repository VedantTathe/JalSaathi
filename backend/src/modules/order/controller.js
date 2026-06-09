const OrderService = require('./service');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Create new order
const createOrder = asyncHandler(async (req, res) => {
  console.log('🎯 [ORDER CONTROLLER] Create order request received');
  console.log('  User ID:', req.user?._id);
  console.log('  Body:', JSON.stringify(req.body, null, 2));
  
  const requiredFields = ['providerId', 'quantity', 'deliveryAddress'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    console.log('❌ [ORDER CONTROLLER] Missing fields:', missingFields);
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    });
  }
  
  console.log('✅ [ORDER CONTROLLER] Validation passed, calling service...');
  const { response, statusCode } = await OrderService.createOrder(req.user._id, req.body);
  console.log('📤 [ORDER CONTROLLER] Response:', statusCode, response.success ? 'SUCCESS' : 'FAILED');
  res.status(statusCode).json(response);
});

// Get customer's orders
const getMyOrders = asyncHandler(async (req, res) => {
  const { status, limit = 20, page = 1, showAll = 'false' } = req.query;
  const includeAll = String(showAll).toLowerCase() === 'true';
  const { response, statusCode } = await OrderService.getMyOrders(
    req.user._id,
    status,
    parseInt(limit),
    parseInt(page),
    includeAll
  );
  res.status(statusCode).json(response);
});

// Get order by ID
const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { response, statusCode } = await OrderService.getOrderById(
    orderId,
    req.user._id,
    req.user.role
  );
  res.status(statusCode).json(response);
});

// Track order
const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { response, statusCode } = await OrderService.trackOrder(orderId);
  res.status(statusCode).json(response);
});

// Cancel order
const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const { response, statusCode } = await OrderService.cancelOrder(
    orderId,
    req.user._id,
    reason
  );
  res.status(statusCode).json(response);
});

// Create payment order (Razorpay) for an existing order
const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { response, statusCode } = await OrderService.createRazorpayOrder(req.user._id, orderId);
  res.status(statusCode).json(response);
});

// Verify payment after client checkout
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { response, statusCode } = await OrderService.verifyRazorpayPayment(req.user._id, orderId, req.body);
  res.status(statusCode).json(response);
});

// Check payment status by querying provider (useful if webhook not reachable)
const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { response, statusCode } = await OrderService.checkPaymentStatus(req.user._id, orderId);
  res.status(statusCode).json(response);
});

// Mark payment as failed (timeout / user closed popup)
const failPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { response, statusCode } = await OrderService.failPayment(req.user._id, orderId);
  res.status(statusCode).json(response);
});

// Get all orders (admin)
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, providerId, customerId, dateFrom, dateTo, limit = 20, page = 1 } = req.query;
  
  const filters = {};
  if (status) filters.status = status;
  if (providerId) filters.providerId = providerId;
  if (customerId) filters.customerId = customerId;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  
  const { response, statusCode } = await OrderService.getAllOrders(
    filters,
    parseInt(limit),
    parseInt(page)
  );
  res.status(statusCode).json(response);
});

// Admin cancel order
const adminCancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const { response, statusCode } = await OrderService.adminCancelOrder(orderId, reason);
  res.status(statusCode).json(response);
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
  createPaymentOrder,
  verifyPayment,
  checkPaymentStatus,
  failPayment,
  getAllOrders,
  adminCancelOrder
};