const express = require('express');
const path = require('path');
const { EventEmitter } = require('events');

class ExpressServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 3000;
    this.app = express();
    this.server = null;
    
    // Configure middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Default route
    this.app.get('/', (req, res) => {
      res.json({ message: 'Express server is running' });
    });
    
    // Set up error handling
    this.app.use((err, req, res, next) => {
      console.error('Express server error:', err);
      res.status(500).json({
        error: 'Server error',
        message: err.message
      });
    });
  }
  
  /**
   * Start the Express server
   * @returns {Promise<number>} The port number
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`Express server started on port ${this.port}`);
          resolve(this.port);
        });
      } catch (error) {
        console.error('Failed to start Express server:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Stop the Express server
   * @returns {Promise<void>}
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((err) => {
        if (err) {
          console.error('Error closing Express server:', err);
          reject(err);
          return;
        }
        
        console.log('Express server stopped');
        this.server = null;
        resolve();
      });
    });
  }
  
  /**
   * Add a GET route to the server
   * @param {string} path - The route path
   * @param {Function} handler - The route handler
   */
  addGetRoute(path, handler) {
    this.app.get(path, async (req, res, next) => {
      try {
        const result = await handler(req);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });
  }
  
  /**
   * Add a POST route to the server
   * @param {string} path - The route path
   * @param {Function} handler - The route handler
   */
  addPostRoute(path, handler) {
    this.app.post(path, async (req, res, next) => {
      try {
        const result = await handler(req);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });
  }
  
  /**
   * Add a static files directory
   * @param {string} urlPath - The URL path
   * @param {string} dirPath - The directory path
   */
  addStaticDirectory(urlPath, dirPath) {
    this.app.use(urlPath, express.static(dirPath));
    console.log(`Added static directory: ${dirPath} at ${urlPath}`);
  }
}

module.exports = { ExpressServer };
