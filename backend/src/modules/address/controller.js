const Address = require('./model');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Get all addresses for current user
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ userId: req.user._id }).sort('-isDefault -createdAt');
  
  res.status(200).json({
    success: true,
    data: { addresses }
  });
});

// Create new address
const createAddress = asyncHandler(async (req, res) => {
  const { label, street, area, city, pincode, isDefault } = req.body;
  
  // Validate required fields
  if (!street || !area || !city || !pincode) {
    return res.status(400).json({
      success: false,
      message: 'Street, area, city, and pincode are required'
    });
  }
  
  const address = await Address.create({
    userId: req.user._id,
    label: label || 'home',
    street,
    area,
    city,
    pincode,
    isDefault: isDefault || false
  });
  
  res.status(201).json({
    success: true,
    message: 'Address created successfully',
    data: { address }
  });
});

// Update address
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  
  // Check if address exists and belongs to user
  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  
  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }
  
  // Update address
  const updatedAddress = await Address.findByIdAndUpdate(
    addressId,
    req.body,
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    data: { address: updatedAddress }
  });
});

// Delete address
const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  
  // Check if address exists and belongs to user
  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  
  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }
  
  // Don't allow deletion of default address if it's the only one
  if (address.isDefault) {
    const addressCount = await Address.countDocuments({ userId: req.user._id });
    if (addressCount === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the only address'
      });
    }
  }
  
  await address.deleteOne();
  
  // If deleted address was default, set another as default
  if (address.isDefault) {
    const nextAddress = await Address.findOne({ userId: req.user._id });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }
  
  res.status(200).json({
    success: true,
    message: 'Address deleted successfully'
  });
});

// Set default address
const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  
  // Check if address exists and belongs to user
  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  
  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }
  
  // Update all addresses for this user
  await Address.updateMany(
    { userId: req.user._id },
    { isDefault: false }
  );
  
  // Set this as default
  address.isDefault = true;
  await address.save();
  
  res.status(200).json({
    success: true,
    message: 'Default address updated successfully',
    data: { address }
  });
});

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
