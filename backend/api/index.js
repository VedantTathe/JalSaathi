// api/index.js

const { handler } = require('../src/server');

// Vercel expects a (req, res) handler wrapped by serverless-http
module.exports = handler;