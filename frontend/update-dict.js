const fs = require('fs');
const enFile = 'src/translations/en.js';
const mrFile = 'src/translations/mr.js';

let en = fs.readFileSync(enFile, 'utf8');
let mr = fs.readFileSync(mrFile, 'utf8');

const navKeysEn = \`
  // Navigation Labels
  'Dashboard Home': 'Dashboard Home',
  'Home': 'Home',
  'My Orders': 'My Orders',
  'Orders': 'Orders',
  'Address Management': 'Address Management',
  'Address': 'Address',
  'My Store': 'My Store',
  'Store': 'Store',
  'Finances': 'Finances',
  'Delivery Boys': 'Delivery Boys',
  'Delivery': 'Delivery',
  'Delivery Tracking': 'Delivery Route',
  'Route': 'Route',
\`;

const navKeysMr = \`
  // Navigation Labels
  'Dashboard Home': 'डॅशबोर्ड',
  'Home': 'होम',
  'My Orders': 'माझे ऑर्डर्स',
  'Orders': 'ऑर्डर्स',
  'Address Management': 'पत्ते व्यवस्थापन',
  'Address': 'पत्ता',
  'My Store': 'माझे दुकान',
  'Store': 'दुकान',
  'Finances': 'आर्थिक',
  'Delivery Boys': 'डिलिव्हरी मुले',
  'Delivery': 'डिलिव्हरी',
  'Delivery Tracking': 'मार्ग ट्रॅकिंग',
  'Route': 'मार्ग',
\`;

en = en.replace(/export default {/, 'export default {' + navKeysEn);
mr = mr.replace(/export default {/, 'export default {' + navKeysMr);

fs.writeFileSync(enFile, en);
fs.writeFileSync(mrFile, mr);
console.log('Navigation keys added');
