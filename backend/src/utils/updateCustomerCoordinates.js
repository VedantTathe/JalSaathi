const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../modules/user/model');

async function updateCustomerCoordinates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all customers without coordinates
    const customers = await User.find({
      role: 'customer',
      'address.coordinates': { $exists: false }
    });

    console.log(`\n📊 Found ${customers.length} customers without coordinates\n`);

    for (const customer of customers) {
      console.log(`\n👤 Customer: ${customer.name} (${customer.email})`);
      console.log(`   Current address:`, customer.address);
      
      // Add empty coordinates field (they can update later from profile)
      const result = await User.updateOne(
        { _id: customer._id },
        {
          $set: {
            'address.coordinates': {
              latitude: null,
              longitude: null
            }
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`   ✅ Added coordinates field (null values - customer can update from profile)`);
      }
    }

    console.log('\n✅ Update complete!\n');
    console.log('💡 Customers can now:');
    console.log('   1. Update their profile with location');
    console.log('   2. See distance-based provider filtering once coordinates are set\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateCustomerCoordinates();
