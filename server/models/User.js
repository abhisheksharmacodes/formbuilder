/**
 * User model
 *
 * Stores identification details required to associate an application user with
 * their Airtable account and to access the Airtable API on their behalf.
 */

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // The user's Airtable account identifier (unique per Airtable user)
    airtableId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // OAuth access token to act on behalf of the user against Airtable's API
    // Marked as `select: false` to avoid returning it from queries by default
    airtableAccessToken: {
      type: String,
      required: true,
      select: false,
    },

    // Human-readable name of the user (as obtained from Airtable or user input)
    name: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt and updatedAt
  }
);

module.exports = mongoose.model('User', UserSchema);


