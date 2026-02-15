require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Provider = require('../modules/provider/model');

const updateExistingProviders = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vedant:vedant@cluster0.3glbf3u.mongodb.net/JalSaathiDB?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update all providers to be approved and online
    const result = await Provider.updateMany(
      {}, 
      { 
        $set: { 
          isApproved: true,
          isOnline: true
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} providers`);
    console.log('All providers are now approved and online!');
    
    // List all providers
    const providers = await Provider.find().populate('userId', 'name email');
    console.log('\n📋 Current Providers:');
    providers.forEach(p => {
      console.log(`  - ${p.businessName} (${p.userId?.email}) - Online: ${p.isOnline}, Approved: ${p.isApproved}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating providers:', error);
    process.exit(1);
  }
};

updateExistingProviders();
