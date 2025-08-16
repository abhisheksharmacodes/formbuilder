/**
 * Main Express server entry point for the MERN backend.
 *
 * Responsibilities:
 * - Load environment configuration
 * - Connect to MongoDB
 * - Initialize Express, global middleware, and API routes
 * - Start the HTTP server
 */

// Load environment variables from `.env` (make sure to create it using `.env.example`)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');

// Database connection helper
const { connectToDatabase } = require('./db/connectDB');

// Routers (placeholder implementations live under `routes/`)
const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/forms');
const oauthRoutes = require('./routes/oauth');

// Create the Express application instance
const app = express();

// Global middleware
// - CORS: allow cross-origin requests from the frontend during local development
// - JSON parser: parse incoming request bodies with JSON payloads
// - Session: for OAuth state management
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Configure session middleware for OAuth state management
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 10 * 60 * 1000 // 10 minutes
  }
}));

// Simple health check endpoint for uptime monitoring and local diagnostics
app.get('/health', (req, res) => {
  const { getConnectionStatus } = require('./db/connectDB');
  const dbStatus = getConnectionStatus();
  
  res.status(200).json({ 
    status: 'ok',
    database: dbStatus
  });
});

// API route mounting (actual handlers to be implemented later)
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/oauth', oauthRoutes);

// Export the Express app for Vercel
module.exports = app;

// Only start the server if this file is run directly (not imported by Vercel)
if (require.main === module) {
  // Determine the port to listen on (defaults to 5000 for local dev)
  const PORT = process.env.PORT || 5000;

  // Establish the database connection first, then start the HTTP server
  connectToDatabase()
    .then(() => {
      app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to start the server due to database connection error:', error);
      process.exit(1);
    });
}


