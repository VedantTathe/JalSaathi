// api/index.js

const { app } = require('../src/server');

// Vercel expects a (req, res) handler
module.exports = app;