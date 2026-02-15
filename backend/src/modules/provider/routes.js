const express = require('express');
const router = express.Router();

const providerController = require('./controller');
const { authorizeRoles } = require('../../middlewares/auth');

// All routes require provider role
router.use(authorizeRoles('provider', 'admin'));

// Provider status management
router.patch('/toggle-status', 
  authorizeRoles('provider'),
  providerController.toggleOnlineStatus
);

router.put('/update-profile', 
  authorizeRoles('provider'),
  providerController.updateProviderProfile
);

// Order management
router.get('/orders', 
  authorizeRoles('provider'),
  providerController.getProviderOrders
);

router.patch('/orders/:orderId/accept', 
  authorizeRoles('provider'),
  providerController.acceptOrder
);

router.patch('/orders/:orderId/reject', 
  authorizeRoles('provider'),
  providerController.rejectOrder
);

router.patch('/orders/:orderId/assign-delivery', 
  authorizeRoles('provider'),
  providerController.assignDeliveryBoy
);

// Delivery boy management
router.get('/delivery-boys', 
  authorizeRoles('provider'),
  providerController.getDeliveryBoys
);

router.post('/delivery-boys', 
  authorizeRoles('provider'),
  providerController.addDeliveryBoy
);

router.delete('/delivery-boys/:deliveryBoyId', 
  authorizeRoles('provider'),
  providerController.removeDeliveryBoy
);

// Analytics
router.get('/analytics', 
  authorizeRoles('provider'),
  providerController.getAnalytics
);

module.exports = router;