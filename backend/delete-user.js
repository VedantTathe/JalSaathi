require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/modules/user/model');
const Provider = require('./src/modules/provider/model');
const Order = require('./src/modules/order/model');

async function deleteUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const email = 'sahilpatil8657933899@gmail.com';
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found with email:', email);
      process.exit(1);
    }
    
    console.log('✅ Found user:', user.name, user.email, 'Role:', user.role);
    console.log('   User ID:', user._id);
    
    // Delete related data based on role
    let deletedOrders = 0;
    let deletedProvider = false;
    
    // If user is a provider, delete provider profile and related data
    if (user.role === 'provider') {
      const provider = await Provider.findOne({ userId: user._id });
      if (provider) {
        console.log('🔍 Found provider profile:', provider.businessName);
        
        // Delete orders related to this provider
        const orderResult = await Order.deleteMany({ providerId: provider._id });
        deletedOrders = orderResult.deletedCount || 0;
        console.log(`   Deleted ${deletedOrders} orders`);
        
        // Remove this provider from delivery boys' providerId
        await User.updateMany(
          { providerId: provider._id, role: 'delivery' },
          { $unset: { providerId: 1 } }
        );
        console.log('   Removed provider reference from delivery boys');
        
        // Delete provider profile
        await Provider.findByIdAndDelete(provider._id);
        deletedProvider = true;
        console.log('   Deleted provider profile');
      }
    }
    
    // If user is a customer, delete their orders
    if (user.role === 'customer') {
      const orderResult = await Order.deleteMany({ customerId: user._id });
      deletedOrders = orderResult.deletedCount || 0;
      console.log(`🗑️  Deleted ${deletedOrders} orders`);
    }
    
    // If user is a delivery boy, remove them from provider's delivery boys list
    if (user.role === 'delivery' && user.providerId) {
      await Provider.updateOne(
        { _id: user.providerId },
        { $pull: { deliveryBoys: user._id } }
      );
      console.log('🗑️  Removed from provider delivery boys list');
    }
    
    // Delete the user
    await User.findByIdAndDelete(user._id);
    console.log('✅ User deleted successfully!');
    
    // Summary
    console.log('\n📊 Deletion Summary:');
    console.log('   User:', email);
    console.log('   Role:', user.role);
    console.log('   Orders deleted:', deletedOrders);
    if (deletedProvider) console.log('   Provider profile: Deleted');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteUser();
