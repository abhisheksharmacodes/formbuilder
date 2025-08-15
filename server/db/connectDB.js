/**
 * MongoDB connection helper using Mongoose.
 *
 * Exposes a single function `connectToDatabase` which reads the MongoDB
 * connection string from the `MONGODB_URI` environment variable and opens a
 * connection. If the variable is missing, the process will fail fast with an
 * actionable error.
 */

const mongoose = require('mongoose');

/**
 * Establish a connection to MongoDB using the URI from environment variables.
 *
 * Returns a Promise that resolves once the connection succeeds.
 */
async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is not set. Please set it in your environment or in a .env file.'
    );
  }

  // Keep Mongoose from creating strictQuery deprecation warnings in recent versions
  if (mongoose.set) {
    mongoose.set('strictQuery', true);
  }

  // Initiate the connection
  await mongoose.connect(mongoUri);

  // eslint-disable-next-line no-console
  console.log('✅ Connected to MongoDB');
}

module.exports = { connectToDatabase };


