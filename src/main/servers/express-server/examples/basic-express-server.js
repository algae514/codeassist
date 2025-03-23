const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware to parse URL-encoded request bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Define a simple route
app.get('/', (req, res) => {
  res.send('Welcome to Express Server');
});

// Example API route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express Server API!' });
});

// Example route with parameter
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ userId, message: `Fetching details for user ${userId}` });
});

// Example POST route
app.post('/api/data', (req, res) => {
  const data = req.body;
  console.log('Received data:', data);
  res.json({ 
    message: 'Data received successfully',
    receivedData: data
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});
