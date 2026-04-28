require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Provider = require('../modules/provider/model');
const User = require('../modules/user/model');

const checkProviders = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is required');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const providers = await Provider.find().populate('userId', 'name email');
    
    console.log(`📊 Total Providers in Database: ${providers.length}\n`);
    
    if (providers.length === 0) {
      console.log('❌ No providers found in database!');
      console.log('You need to create provider accounts first.');
    } else {
      console.log('📋 Provider Details:');
      providers.forEach((p, index) => {
        console.log(`\n${index + 1}. ${p.businessName}`);
        console.log(`   ID: ${p._id}`);
        console.log(`   User Email: ${p.userId?.email || 'N/A'}`);
        console.log(`   Area: ${p.area}`);
        console.log(`   Price: ₹${p.pricePerCan}/can`);
        console.log(`   Online: ${p.isOnline ? '✅ Yes' : '❌ No'}`);
        console.log(`   Approved: ${p.isApproved ? '✅ Yes' : '❌ No'}`);
        console.log(`   Service Radius: ${p.serviceRadius}km`);
        console.log(`   Coordinates: ${p.coordinates?.latitude || 'N/A'}, ${p.coordinates?.longitude || 'N/A'}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkProviders();
