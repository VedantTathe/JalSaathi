/**
 * One-time script: Update ALL providers' serviceRadius to 5000 km
 * so they are visible across all of India.
 * Run: node update-provider-radius.js
 */
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://vedant:vedant@cluster0.3glbf3u.mongodb.net/JalSaathiDB?retryWrites=true&w=majority';

const ProviderSchema = new mongoose.Schema({}, { strict: false });
const Provider = mongoose.model('Provider', ProviderSchema, 'providers');

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Provider.updateMany(
      {},
      { $set: { serviceRadius: 5000 } }
    );

    console.log(`✅ Updated ${result.modifiedCount} provider(s) to serviceRadius: 5000 km`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected');
  }
})();
