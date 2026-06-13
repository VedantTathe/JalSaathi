const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://vedant:vedant@cluster0.3glbf3u.mongodb.net/JalSaathiDB?retryWrites=true&w=majority';
const ProviderSchema = new mongoose.Schema({}, { strict: false });
const Provider = mongoose.model('Provider', ProviderSchema, 'providers');

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const p = await Provider.findOne({ 
      $or: [
        { businessName: { $regex: /amrut/i } }, 
        { name: { $regex: /amrut/i } }, 
        { 'businessDetails.businessName': { $regex: /amrut/i } },
        { email: { $regex: /amrut/i } }
      ] 
    });
    console.log(JSON.stringify(p, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
})();
