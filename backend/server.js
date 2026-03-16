// Entry point for Serverless Framework
// Re-exports the Lambda `handler` exported from `src/server.js` so the
// Serverless `handler: server.handler` path resolves to this file.
//
// The actual Express app (with `const app = express()`) remains in
// `backend/src/server.js` and already exports `module.exports.handler = serverless(app)`.

module.exports.handler = require('./src/server').handler;
