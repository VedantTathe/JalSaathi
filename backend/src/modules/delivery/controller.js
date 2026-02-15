const DeliveryService = require('./service');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Get assigned orders
const getAssignedOrders = asyncHandler(async (req, res) => {
  const { response, statusCode } = await DeliveryService.getAssignedOrders(req.user.id);
  res.status(statusCode).json(response);
});

// Update delivery status
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, notes } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required'
    });
  }
  
  const { response, statusCode } = await DeliveryService.updateDeliveryStatus(
    req.user.id,
    orderId,
    status,
    notes
  );
  res.status(statusCode).json(response);
});

// Mark as delivered
const markAsDelivered = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { deliveryNotes } = req.body;
  
  const { response, statusCode } = await DeliveryService.markAsDelivered(
    req.user.id,
    orderId,
    deliveryNotes
  );
  res.status(statusCode).json(response);
});

// Get delivery history
const getDeliveryHistory = asyncHandler(async (req, res) => {
  const { limit = 20, page = 1 } = req.query;
  const { response, statusCode } = await DeliveryService.getDeliveryHistory(
    req.user.id,
    parseInt(limit),
    parseInt(page)
  );
  res.status(statusCode).json(response);
});

// Get performance statistics
const getPerformanceStats = asyncHandler(async (req, res) => {
  const { response, statusCode } = await DeliveryService.getPerformanceStats(req.user.id);
  res.status(statusCode).json(response);
});

module.exports = {
  getAssignedOrders,
  updateDeliveryStatus,
  markAsDelivered,
  getDeliveryHistory,
  getPerformanceStats
};