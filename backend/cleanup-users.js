require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/modules/user/model');
const Order = require('./src/modules/order/model');
const Provider = require('./src/modules/provider/model');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    console.log('Starting cleanup of inactive users...');
    const activeStatuses = ['pending', 'accepted', 'assigned', 'out_for_delivery'];

    // Find all active orders
    const activeOrders = await Order.find({ status: { $in: activeStatuses } });
    
    // Extract unique customer IDs and provider IDs who have active orders
    const activeCustomerIds = new Set(activeOrders.map(o => o.customerId.toString()));
    const activeProviderIds = new Set(activeOrders.map(o => o.providerId.toString()));
    
    console.log(`Found ${activeOrders.length} active orders.`);
    console.log(`Active Customers: ${activeCustomerIds.size}`);
    console.log(`Active Providers: ${activeProviderIds.size}`);

    // Get all users
    const users = await User.find({ role: { $in: ['customer', 'provider'] } });
    
    let deletedCustomers = 0;
    let deletedProviders = 0;

    for (const user of users) {
      const idStr = user._id.toString();
      
      if (user.role === 'customer') {
        if (!activeCustomerIds.has(idStr)) {
          // Delete customer
          await User.deleteOne({ _id: user._id });
          deletedCustomers++;
        }
      } else if (user.role === 'provider') {
        if (!activeProviderIds.has(idStr)) {
          // Delete provider user and their provider profile
          await Provider.deleteOne({ userId: user._id });
          await User.deleteOne({ _id: user._id });
          deletedProviders++;
        }
      }
    }

    console.log(`Cleanup complete!`);
    console.log(`Deleted Customers: ${deletedCustomers}`);
    console.log(`Deleted Providers: ${deletedProviders}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
});
