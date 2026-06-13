const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://vedant:vedant@cluster0.3glbf3u.mongodb.net/JalSaathiDB?retryWrites=true&w=majority';
const ProviderSchema = new mongoose.Schema({}, { strict: false });
const Provider = mongoose.model('Provider', ProviderSchema, 'providers');

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const result = await Provider.updateOne(
      { businessName: "Amrut Pani" },
      { $set: { serviceRadius: 100000 } }
    );
    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
})();
