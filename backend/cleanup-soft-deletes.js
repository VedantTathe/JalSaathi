require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/modules/user/model');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await User.deleteMany({ isActive: false });
  console.log('Cleaned up soft-deleted users:', result.deletedCount);
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
