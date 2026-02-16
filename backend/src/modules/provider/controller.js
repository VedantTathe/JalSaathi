const ProviderService = require('./service');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Toggle online status
const toggleOnlineStatus = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.toggleOnlineStatus(req.user._id);
  res.status(statusCode).json(response);
});

// Update provider profile
const updateProviderProfile = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.updateProviderProfile(req.user._id, req.body);
  res.status(statusCode).json(response);
});

// Get provider orders
const getProviderOrders = asyncHandler(async (req, res) => {
  const { status, limit = 20, page = 1 } = req.query;
  const { response, statusCode } = await ProviderService.getProviderOrders(
    req.user._id,
    status,
    parseInt(limit),
    parseInt(page)
  );
  res.status(statusCode).json(response);
});

// Accept order
const acceptOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { response, statusCode } = await ProviderService.acceptOrder(req.user._id, orderId);
  res.status(statusCode).json(response);
});

// Reject order
const rejectOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const { response, statusCode } = await ProviderService.rejectOrder(req.user._id, orderId, reason);
  res.status(statusCode).json(response);
});

// Assign delivery boy
const assignDeliveryBoy = asyncHandler(async (req, res) => {
  console.log(`[assignDeliveryBoy Controller] orderId=${req.params.orderId}, body=`, req.body);
  const { orderId } = req.params;
  const { deliveryBoyId } = req.body;
  
  if (!deliveryBoyId) {
    return res.status(400).json({
      success: false,
      message: 'Delivery boy ID is required'
    });
  }
  
  const { response, statusCode } = await ProviderService.assignDeliveryBoy(
    req.user._id, 
    orderId, 
    deliveryBoyId
  );
  console.log(`[assignDeliveryBoy Controller] response status=${statusCode}`);
  res.status(statusCode).json(response);
});

// Get delivery boys
const getDeliveryBoys = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.getDeliveryBoys(req.user._id);
  res.status(statusCode).json(response);
});

// Add delivery boy
const addDeliveryBoy = asyncHandler(async (req, res) => {
  const requiredFields = ['name', 'email', 'password', 'phone'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    });
  }
  
  const { response, statusCode } = await ProviderService.addDeliveryBoy(req.user._id, req.body);
  res.status(statusCode).json(response);
});

// Remove delivery boy
const removeDeliveryBoy = asyncHandler(async (req, res) => {
  const { deliveryBoyId } = req.params;
  const { response, statusCode } = await ProviderService.removeDeliveryBoy(req.user._id, deliveryBoyId);
  res.status(statusCode).json(response);
});

// Get analytics
const getAnalytics = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.getAnalytics(req.user._id);
  res.status(statusCode).json(response);
});

// Get order history grouped by day
const getOrderHistory = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.getOrderHistory(req.user._id, req.query);
  res.status(statusCode).json(response);
});

// Get customers who ordered from this provider
const getCustomers = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.getCustomers(req.user._id, req.query);
  res.status(statusCode).json(response);
});

// Update bank account details
const updateBankDetails = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.updateBankDetails(req.user._id, req.body);
  res.status(statusCode).json(response);
});

// Get bank account details (masked)
const getBankDetails = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.getBankDetails(req.user._id);
  res.status(statusCode).json(response);
});

// Get wallet/earnings summary
const getWalletSummary = asyncHandler(async (req, res) => {
  const { response, statusCode } = await ProviderService.getWalletSummary(req.user._id);
  res.status(statusCode).json(response);
});

module.exports = {
  toggleOnlineStatus,
  updateProviderProfile,
  getProviderOrders,
  acceptOrder,
  rejectOrder,
  assignDeliveryBoy,
  getDeliveryBoys,
  addDeliveryBoy,
  removeDeliveryBoy,
  getAnalytics,
  getOrderHistory,
  getCustomers,
  updateBankDetails,
  getBankDetails,
  getWalletSummary
};