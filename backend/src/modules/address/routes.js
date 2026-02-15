const express = require('express');
const router = express.Router();

const addressController = require('./controller');
const { authorizeRoles } = require('../../middlewares/auth');

// All routes require authentication
router.get('/', 
  authorizeRoles('customer'),
  addressController.getAddresses
);

router.post('/', 
  authorizeRoles('customer'),
  addressController.createAddress
);

router.put('/:addressId', 
  authorizeRoles('customer'),
  addressController.updateAddress
);

router.delete('/:addressId', 
  authorizeRoles('customer'),
  addressController.deleteAddress
);

router.patch('/:addressId/set-default', 
  authorizeRoles('customer'),
  addressController.setDefaultAddress
);

module.exports = router;
