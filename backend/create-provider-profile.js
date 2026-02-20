require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/modules/user/model');
const Provider = require('./src/modules/provider/model');

async function createProviderProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const email = 'sahilbang003@gmail.com';
    
    // Find user
    const user = await User.findOne({ email, role: 'provider' });
    if (!user) {
      console.log('❌ Provider user not found with email:', email);
      process.exit(1);
    }
    
    console.log('✅ Found user:', user.name, user.email);
    
    // Check if provider profile already exists
    const existingProvider = await Provider.findOne({ userId: user._id });
    if (existingProvider) {
      console.log('✅ Provider profile already exists');
      console.log('   Business Name:', existingProvider.businessName);
      console.log('   Provider ID:', existingProvider._id);
      process.exit(0);
    }
    
    // Create provider profile
    const provider = await Provider.create({
      userId: user._id,
      businessName: user.name + "'s Water Supply",
      area: user.address?.area || 'Default Area',
      pricePerCan: 20,
      serviceRadius: 5,
      minimumOrder: 1,
      coordinates: { latitude: 0, longitude: 0 },
      operatingHours: { open: '08:00', close: '20:00' },
      description: 'Quality water supply services',
      isApproved: true, // Auto-approve for existing users
      isOnline: false
    });
    
    console.log('✅ Provider profile created successfully!');
    console.log('   Business Name:', provider.businessName);
    console.log('   Provider ID:', provider._id);
    console.log('   Status:', provider.isApproved ? 'Approved' : 'Pending');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createProviderProfile();
