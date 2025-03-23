/**
 * Example routes for the Express server
 */
const path = require('path');
const fs = require('fs');

/**
 * Set up demo routes for the Express server
 * @param {ExpressServer} server - The Express server instance
 */
function setupDemoRoutes(server) {
  // Serve static files from the public directory
  const publicPath = path.join(__dirname, 'public');
  server.addStaticDirectory('/', publicPath);

  // Example GET route
  server.addGetRoute('/api/info', async (req) => {
    return {
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString()
    };
  });
  
  // Example POST route
  server.addPostRoute('/api/echo', async (req) => {
    return {
      received: req.body,
      timestamp: new Date().toISOString()
    };
  });

  // Example route with parameters
  server.addGetRoute('/api/users/:id', async (req) => {
    const userId = req.params.id;
    return {
      userId,
      message: `Fetching details for user ${userId}`,
      timestamp: new Date().toISOString()
    };
  });

  // Serve the basic express server example
  server.addGetRoute('/examples/basic-express-server', async (req) => {
    const examplePath = path.join(__dirname, 'examples/basic-express-server.js');
    const content = fs.readFileSync(examplePath, 'utf8');
    return {
      title: "Basic Express Server Example",
      code: content
    };
  });
}

module.exports = { setupDemoRoutes };
