const Settlement = require('../modules/settlement/model');
const Order = require('../modules/order/model');
const Provider = require('../modules/provider/model');
const mongoose = require('mongoose');

// Create settlement for a provider for a given period
const createSettlement = async (providerId, periodStart, periodEnd, processedBy) => {
  try {
    // Get all completed orders for this provider in the period
    const orders = await Order.find({
      providerId,
      status: 'delivered',
      deliveredAt: {
        $gte: new Date(periodStart),
        $lte: new Date(periodEnd)
      },
      paymentStatus: 'completed'
    });

    if (orders.length === 0) {
      throw new Error('No completed orders found for this period');
    }

    // Calculate total amount
    const totalAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    
    // Calculate platform fee (5% default)
    const platformFee = totalAmount * 0.05;
    
    // Calculate tax (18% GST on platform fee)
    const tax = platformFee * 0.18;
    
    // Net amount = total - platform fee - tax
    const netAmount = totalAmount - platformFee - tax;

    // Get provider's payment details
    const provider = await Provider.findOne({ userId: providerId });
    let paymentMethod = 'bank_transfer';
    
    if (provider && provider.upiId) {
      paymentMethod = 'upi';
    }

    // Check if settlement already exists for this period
    const existingSettlement = await Settlement.findOne({
      providerId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd)
    });

    if (existingSettlement) {
      throw new Error('Settlement already exists for this period');
    }

    // Create new settlement
    const settlement = new Settlement({
      providerId,
      userId: providerId,
      amount: totalAmount,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: 'pending',
      paymentMethod,
      orderIds: orders.map(order => order._id),
      orderCount: orders.length,
      platformFee,
      tax,
      netAmount,
      processedBy
    });

    await settlement.save();
    
    return settlement;
  } catch (error) {
    throw error;
  }
};

// Get all settlements with filters
const getAllSettlements = async (filters = {}) => {
  try {
    const query = {};
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.providerId) {
      query.providerId = filters.providerId;
    }
    
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    const settlements = await Settlement.find(query)
      .populate('providerId', 'businessName phoneNumber email')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 });

    return settlements;
  } catch (error) {
    throw error;
  }
};

// Get settlements for a specific provider
const getProviderSettlements = async (providerId) => {
  try {
    const settlements = await Settlement.find({ providerId })
      .populate('orderIds', 'orderNumber totalPrice deliveredAt')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 });

    return settlements;
  } catch (error) {
    throw error;
  }
};

// Get settlement by ID
const getSettlementById = async (settlementId) => {
  try {
    const settlement = await Settlement.findById(settlementId)
      .populate('providerId', 'businessName phoneNumber email')
      .populate('orderIds', 'orderNumber totalPrice deliveredAt')
      .populate('processedBy', 'name email');

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    return settlement;
  } catch (error) {
    throw error;
  }
};

// Update settlement status
const updateSettlementStatus = async (settlementId, status, processedBy, data = {}) => {
  try {
    const settlement = await Settlement.findById(settlementId);
    
    if (!settlement) {
      throw new Error('Settlement not found');
    }

    settlement.status = status;
    settlement.processedBy = processedBy;
    
    if (data.transactionId) {
      settlement.transactionId = data.transactionId;
    }
    
    if (data.notes) {
      settlement.notes = data.notes;
    }
    
    if (data.paymentMethod) {
      settlement.paymentMethod = data.paymentMethod;
    }

    if (status === 'processing') {
      settlement.processedAt = new Date();
    }
    
    if (status === 'completed') {
      settlement.completedAt = new Date();
    }

    await settlement.save();
    
    return settlement;
  } catch (error) {
    throw error;
  }
};

// Mark settlement as completed
const completeSettlement = async (settlementId, transactionId, processedBy, notes) => {
  try {
    return await updateSettlementStatus(
      settlementId, 
      'completed', 
      processedBy, 
      { transactionId, notes }
    );
  } catch (error) {
    throw error;
  }
};

// Get settlement statistics
const getSettlementStats = async () => {
  try {
    const stats = await Settlement.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$netAmount' }
              }
            }
          ],
          overall: [
            {
              $group: {
                _id: null,
                totalSettlements: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                totalPlatformFee: { $sum: '$platformFee' },
                totalTax: { $sum: '$tax' },
                totalNetAmount: { $sum: '$netAmount' }
              }
            }
          ],
          recentSettlements: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'providers',
                localField: 'providerId',
                foreignField: 'userId',
                as: 'provider'
              }
            },
            { $unwind: '$provider' }
          ]
        }
      }
    ]);

    return {
      byStatus: stats[0].byStatus,
      overall: stats[0].overall[0] || {
        totalSettlements: 0,
        totalAmount: 0,
        totalPlatformFee: 0,
        totalTax: 0,
        totalNetAmount: 0
      },
      recentSettlements: stats[0].recentSettlements
    };
  } catch (error) {
    throw error;
  }
};

// Get provider earnings summary
const getProviderEarnings = async (providerId) => {
  try {
    const earnings = await Settlement.aggregate([
      {
        $match: {
          providerId: new mongoose.Types.ObjectId(providerId)
        }
      },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$netAmount' }
              }
            }
          ],
          overall: [
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: '$amount' },
                totalPlatformFee: { $sum: '$platformFee' },
                totalTax: { $sum: '$tax' },
                netEarnings: { $sum: '$netAmount' },
                totalOrders: { $sum: '$orderCount' }
              }
            }
          ]
        }
      }
    ]);

    return {
      byStatus: earnings[0].byStatus,
      overall: earnings[0].overall[0] || {
        totalEarnings: 0,
        totalPlatformFee: 0,
        totalTax: 0,
        netEarnings: 0,
        totalOrders: 0
      }
    };
  } catch (error) {
    throw error;
  }
};

// Auto-create monthly settlements for all providers
const createMonthlySettlements = async (processedBy) => {
  try {
    // Get all active providers
    const providers = await Provider.find({ isApproved: true });
    
    // Calculate last month's date range
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // First day of previous month

    const results = {
      success: [],
      failed: []
    };

    for (const provider of providers) {
      try {
        const settlement = await createSettlement(
          provider.userId,
          periodStart,
          periodEnd,
          processedBy
        );
        results.success.push({
          providerId: provider.userId,
          settlementId: settlement._id
        });
      } catch (error) {
        results.failed.push({
          providerId: provider.userId,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createSettlement,
  getAllSettlements,
  getProviderSettlements,
  getSettlementById,
  updateSettlementStatus,
  completeSettlement,
  getSettlementStats,
  getProviderEarnings,
  createMonthlySettlements
};
