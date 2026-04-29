// api/index.js

const server = require('../src/server');

// Always export a function explicitly
module.exports = (req, res) => {
  return server(req, res);
};