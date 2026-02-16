const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../../middlewares/auth');
const settlementService = require('../../services/settlementService');

// Admin routes
router.post('/create', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { providerId, periodStart, periodEnd } = req.body;
    
    if (!providerId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID, period start, and period end are required'
      });
    }

    const settlement = await settlementService.createSettlement(
      providerId,
      periodStart,
      periodEnd,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: 'Settlement created successfully',
      data: settlement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create settlement'
    });
  }
});

// Get all settlements (Admin only)
router.get('/all', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status, providerId, startDate, endDate } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (providerId) filters.providerId = providerId;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    const settlements = await settlementService.getAllSettlements(filters);

    res.status(200).json({
      success: true,
      data: settlements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch settlements'
    });
  }
});

// Get single settlement by ID
router.get('/:id', authenticateToken, authorizeRoles('admin', 'provider'), async (req, res) => {
  try {
    const settlement = await settlementService.getSettlementById(req.params.id);

    // If provider, check if they own this settlement
    if (req.user.role === 'provider' && settlement.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this settlement'
      });
    }

    res.status(200).json({
      success: true,
      data: settlement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch settlement'
    });
  }
});

// Update settlement status (Admin only)
router.patch('/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status, transactionId, notes, paymentMethod } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const settlement = await settlementService.updateSettlementStatus(
      req.params.id,
      status,
      req.user._id,
      { transactionId, notes, paymentMethod }
    );

    res.status(200).json({
      success: true,
      message: 'Settlement status updated successfully',
      data: settlement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update settlement status'
    });
  }
});

// Complete settlement (Admin only)
router.post('/:id/complete', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { transactionId, notes } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const settlement = await settlementService.completeSettlement(
      req.params.id,
      transactionId,
      req.user._id,
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Settlement completed successfully',
      data: settlement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete settlement'
    });
  }
});

// Get settlement statistics (Admin only)
router.get('/stats/overview', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const stats = await settlementService.getSettlementStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch settlement statistics'
    });
  }
});

// Get provider's own settlements
router.get('/provider/my-settlements', authenticateToken, authorizeRoles('provider'), async (req, res) => {
  try {
    const settlements = await settlementService.getProviderSettlements(req.user._id);

    res.status(200).json({
      success: true,
      data: settlements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch settlements'
    });
  }
});

// Get provider earnings summary
router.get('/provider/earnings', authenticateToken, authorizeRoles('provider'), async (req, res) => {
  try {
    const earnings = await settlementService.getProviderEarnings(req.user._id);

    res.status(200).json({
      success: true,
      data: earnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch earnings'
    });
  }
});

// Create monthly settlements for all providers (Admin only)
router.post('/create-monthly', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const results = await settlementService.createMonthlySettlements(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Monthly settlements created',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create monthly settlements'
    });
  }
});

module.exports = router;
