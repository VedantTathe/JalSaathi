// api/index.js

const handler = require('../src/server');

// Ensure Vercel gets a function
module.exports = async (req, res) => {
  return handler(req, res);
};