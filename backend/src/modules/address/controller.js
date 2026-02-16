const Address = require('./model');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Get all addresses for current user
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ userId: req.user._id }).sort('-isDefault -createdAt');
  
  console.log('📋 Fetching addresses for user:', req.user._id);
  console.log('📋 Found', addresses.length, 'addresses');
  addresses.forEach((addr, idx) => {
    console.log(`  Address ${idx + 1}:`, {
      label: addr.label,
      isDefault: addr.isDefault,
      hasCoordinates: !!(addr.coordinates?.latitude && addr.coordinates?.longitude),
      coordinates: addr.coordinates
    });
  });
  
  res.status(200).json({
    success: true,
    data: { addresses }
  });
});

// Create new address
const createAddress = asyncHandler(async (req, res) => {
  const { label, street, area, city, pincode, isDefault, coordinates } = req.body;
  
  console.log('📍 Creating address with data:', JSON.stringify(req.body, null, 2));
  console.log('📍 Coordinates received:', coordinates);
  
  // Validate required fields
  if (!street || !area || !city || !pincode) {
    return res.status(400).json({
      success: false,
      message: 'Street, area, city, and pincode are required'
    });
  }
  
  const addressData = {
  const addressData = {
    userId: req.user._id,
    label: label || 'home',
    street,
    area,
    city,
    pincode,
    isDefault: isDefault || false
  };
  
  // Add coordinates if provided
  if (coordinates && coordinates.latitude && coordinates.longitude) {
    addressData.coordinates = {
      latitude: parseFloat(coordinates.latitude),
      longitude: parseFloat(coordinates.longitude)
    };
    console.log('✅ Coordinates added to address:', addressData.coordinates);
  } else {
    console.log('⚠️ No valid coordinates provided');
  }
  
  const address = await Address.create(addressData);
  console.log('💾 Address saved to DB:', JSON.stringify(address, null, 2));
  
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
  
  // Prepare update data
  const updateData = { ...req.body };
  
  // Handle coordinates properly if provided
  if (updateData.coordinates && updateData.coordinates.latitude && updateData.coordinates.longitude) {
    updateData.coordinates = {
      latitude: parseFloat(updateData.coordinates.latitude),
      longitude: parseFloat(updateData.coordinates.longitude)
    };
  }
  
  // Update address
  const updatedAddress = await Address.findByIdAndUpdate(
    addressId,
    updateData,
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
