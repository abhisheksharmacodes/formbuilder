/**
 * MongoDB connection helper using Mongoose.
 *
 * Exposes a single function `connectToDatabase` which reads the MongoDB
 * connection string from the `MONGODB_URI` environment variable and opens a
 * connection. If the variable is missing, the process will fail fast with an
 * actionable error.
 */

const mongoose = require('mongoose');

let isConnected = false;

/**
 * Establish a connection to MongoDB using the URI from environment variables.
 * Only connects once and caches the connection for reuse.
 */
async function connectToDatabase() {
  // If already connected and connection is healthy, return the existing connection
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('🔄 Using existing MongoDB connection');
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is not set. Please set it in your environment or in a .env file.'
    );
  }

  try {
    // Keep Mongoose from creating strictQuery deprecation warnings
    if (mongoose.set) {
      mongoose.set('strictQuery', true);
    }

    // Use minimal, widely-supported connection options
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, options);
    
    isConnected = true;
    console.log('✅ Connected to MongoDB successfully');
    console.log('🗄️  Database:', mongoose.connection.name);

    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('🟢 MongoDB connection established');
      isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('🔴 MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🟡 MongoDB connection disconnected');
      isConnected = false;
    });

    return mongoose.connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    isConnected = false;
    throw error;
  }
}

/**
 * Get the current database connection status
 */
function getConnectionStatus() {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    database: mongoose.connection.name,
    collections: Object.keys(mongoose.connection.collections || {}),
    connectionState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
}

/**
 * Ensure database connection is active before operations
 */
async function ensureConnection() {
  if (mongoose.connection.readyState !== 1) {
    console.log('⚠️  Connection not ready, reconnecting...');
    await connectToDatabase();
  }
  return mongoose.connection;
}

module.exports = { connectToDatabase, getConnectionStatus, ensureConnection };


