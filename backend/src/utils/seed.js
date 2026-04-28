require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../modules/user/model');
const Provider = require('../modules/provider/model');
const Order = require('../modules/order/model');
const Address = require('../modules/address/model');

const seedUsers = async () => {
  try {
    // Connect to MongoDB via environment variable (do NOT hardcode credentials)
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is required for seeding');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing demo users
    await User.deleteMany({ email: { $in: ['customer@demo.com', 'provider@demo.com', 'admin@demo.com'] } });
    await Provider.deleteMany({ businessName: 'Demo Water Provider' });
    await Address.deleteMany({ userId: { $exists: true } });
    await Order.deleteMany({});
    console.log('🗑️  Cleared existing demo data');

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
      coordinates: {
        latitude: 19.0760, // Mumbai coordinates as example
        longitude: 72.8777
      },
      isOnline: true,
      isApproved: true
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

    // Create provider profile object for reference
    const providerProfile = await Provider.findOne({ userId: providerUser._id });

    // Create customer address
    const customerAddress = await Address.create({
      userId: customer._id,
      street: '123 Demo Street',
      area: 'Demo Area',
      city: 'Demo City',
      pincode: '123456',
      isDefault: true,
      coordinates: {
        latitude: 19.0760,
        longitude: 72.8777
      }
    });
    console.log('✅ Created customer address');

    // Create sample delivered orders for revenue demonstration
    const now = new Date();
    const ordersToCreate = [];

    // Create 5 delivered orders from last month
    for (let i = 0; i < 5; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - (i + 5)); // 5-9 days ago

      ordersToCreate.push({
        customerId: customer._id,
        providerId: providerProfile.userId,
        orderNumber: `JLS${Date.now()}${i}`,
        items: {
          quantity: 2 + i,
          pricePerCan: 40,
          totalPrice: 40 * (2 + i)
        },
        deliveryAddress: {
          street: customerAddress.street,
          area: customerAddress.area,
          city: customerAddress.city,
          pincode: customerAddress.pincode
        },
        status: 'delivered',
        paymentMethod: 'online',
        paymentStatus: 'paid',
        timeline: {
          ordered: orderDate,
          accepted: new Date(orderDate.getTime() + 10 * 60000), // 10 min later
          outForDelivery: new Date(orderDate.getTime() + 30 * 60000), // 30 min later
          delivered: new Date(orderDate.getTime() + 60 * 60000) // 1 hour later
        },
        createdAt: orderDate,
        updatedAt: new Date(orderDate.getTime() + 60 * 60000)
      });
    }

    // Create 3 more orders from this month
    for (let i = 0; i < 3; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - i); // 0-2 days ago

      ordersToCreate.push({
        customerId: customer._id,
        providerId: providerProfile.userId,
        orderNumber: `JLS${Date.now()}${i + 5}`,
        items: {
          quantity: 3 + i,
          pricePerCan: 40,
          totalPrice: 40 * (3 + i)
        },
        deliveryAddress: {
          street: customerAddress.street,
          area: customerAddress.area,
          city: customerAddress.city,
          pincode: customerAddress.pincode
        },
        status: 'delivered',
        paymentMethod: 'online',
        paymentStatus: 'paid',
        timeline: {
          ordered: orderDate,
          accepted: new Date(orderDate.getTime() + 10 * 60000),
          outForDelivery: new Date(orderDate.getTime() + 30 * 60000),
          delivered: new Date(orderDate.getTime() + 60 * 60000)
        },
        createdAt: orderDate,
        updatedAt: new Date(orderDate.getTime() + 60 * 60000)
      });
    }

    // Insert all orders
    await Order.insertMany(ordersToCreate);
    console.log('✅ Created 8 sample delivered orders');

    const totalRevenue = ordersToCreate.reduce((sum, order) => sum + order.items.totalPrice, 0);
    console.log(`💰 Total demo revenue: ₹${totalRevenue}`);

    console.log('\n✅ Demo users created successfully!');
    console.log('Login credentials:');
    console.log('  Customer: customer@demo.com / password');
    console.log('  Provider: provider@demo.com / password');
    console.log('  Admin: admin@demo.com / password');
    console.log('\n📊 Sample Data:');
    console.log(`  - 8 delivered orders created`);
    console.log(`  - Total revenue: ₹${totalRevenue}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedUsers();
