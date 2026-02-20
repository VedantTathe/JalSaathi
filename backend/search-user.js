require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/modules/user/model');

async function searchUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Search for users with similar emails
    const searchPattern = 'sahilpatil8657933899';
    const users = await User.find({ 
      email: { $regex: searchPattern, $options: 'i' }
    });
    
    if (users.length === 0) {
      console.log('❌ No users found matching:', searchPattern);
      
      // Try broader search
      console.log('\n🔍 Searching for users with "sahilpatil" in email...');
      const broadUsers = await User.find({
        email: { $regex: 'sahilpatil', $options: 'i' }
      });
      
      if (broadUsers.length > 0) {
        console.log(`\n✅ Found ${broadUsers.length} users:`);
        broadUsers.forEach((u, i) => {
          console.log(`\n${i + 1}. ${u.name}`);
          console.log(`   Email: ${u.email}`);
          console.log(`   Role: ${u.role}`);
          console.log(`   ID: ${u._id}`);
        });
      } else {
        console.log('❌ No users found with "sahilpatil" in email');
      }
    } else {
      console.log(`\n✅ Found ${users.length} matching users:`);
      users.forEach((u, i) => {
        console.log(`\n${i + 1}. ${u.name}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Role: ${u.role}`);
        console.log(`   ID: ${u._id}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

searchUsers();
