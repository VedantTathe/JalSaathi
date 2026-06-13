require('dotenv').config();
const mongoose = require('mongoose');
const Provider = require('./src/modules/provider/model');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jalsaathi')
  .then(async () => {
    console.log('Connected to DB');
    const result = await Provider.updateMany({}, { $set: { isOnline: true } });
    console.log('Updated providers:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
