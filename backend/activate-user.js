require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/modules/user/model');

async function activateUser() {
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
    
    console.log('✅ Found user:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Current status:');
    console.log('     - isActive:', user.isActive);
    console.log('     - isEmailVerified:', user.isEmailVerified);
    
    // Activate the user
    user.isActive = true;
    user.isEmailVerified = true; // Also verify email if needed
    await user.save();
    
    console.log('\n✅ User activated successfully!');
    console.log('   New status:');
    console.log('     - isActive:', user.isActive);
    console.log('     - isEmailVerified:', user.isEmailVerified);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

activateUser();
