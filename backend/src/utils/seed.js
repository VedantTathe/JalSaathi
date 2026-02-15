require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../modules/user/model');
const Provider = require('../modules/provider/model');

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = 'mongodb+srv://vedant:vedant@cluster0.3glbf3u.mongodb.net/JalSaathiDB?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing demo users
    await User.deleteMany({ email: { $in: ['customer@demo.com', 'provider@demo.com', 'admin@demo.com'] } });
    await Provider.deleteMany({ businessName: 'Demo Water Provider' });
    console.log('🗑️  Cleared existing demo users');

    // Create customer
    const customer = await User.create({
      name: 'Demo Customer',
      email: 'customer@demo.com',
      password: 'password',
      role: 'customer',
      phone: '1234567890',
      address: {
        street: '123 Demo Street',
        area: 'Demo Area',
        city: 'Demo City',
        pincode: '123456'
      }
    });
    console.log('✅ Created customer:', customer.email);

    // Create provider user
    const providerUser = await User.create({
      name: 'Demo Provider',
      email: 'provider@demo.com',
      password: 'password',
      role: 'provider',
      phone: '9876543210',
      address: {
        street: '456 Provider Street',
        area: 'Provider Area',
        city: 'Demo City',
        pincode: '123456'
      }
    });

    // Create provider profile
    await Provider.create({
      userId: providerUser._id,
      businessName: 'Demo Water Provider',
      area: 'Provider Area',
      pricePerCan: 40,
      serviceRadius: 10,
      isActive: true
    });
    console.log('✅ Created provider:', providerUser.email);

    // Create admin
    const admin = await User.create({
      name: 'Demo Admin',
      email: 'admin@demo.com',
      password: 'password',
      role: 'admin',
      phone: '5555555555',
      address: {
        street: '789 Admin Street',
        area: 'Admin Area',
        city: 'Demo City',
        pincode: '123456'
      }
    });
    console.log('✅ Created admin:', admin.email);

    console.log('\n✅ Demo users created successfully!');
    console.log('Login credentials:');
    console.log('  Customer: customer@demo.com / password');
    console.log('  Provider: provider@demo.com / password');
    console.log('  Admin: admin@demo.com / password');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedUsers();
