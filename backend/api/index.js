// Vercel Serverless Function Entry Point
// This file is the entry point for Vercel's serverless deployment

// Import and export the serverless handler
const handler = require('../src/server');

// Vercel requires a default export that's a function
module.exports = handler;
module.exports.default = handler;
