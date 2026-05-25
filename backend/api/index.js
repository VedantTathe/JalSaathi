// api/index.js

const { app } = require('../src/server');

// Vercel expects the raw Express app exported directly, not the AWS Lambda serverless-http wrapper.
module.exports = app;