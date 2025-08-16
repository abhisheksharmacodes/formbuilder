/**
 * Authentication routes (non-OAuth)
 *
 * This file handles traditional authentication methods.
 * For OAuth functionality, see /routes/oauth.js
 */

const express = require('express');
const router = express.Router();

// Placeholder for future non-OAuth authentication routes
// Examples: login, register, password reset, etc.

// Health check for auth routes
router.get('/health', (req, res) => {
  res.json({ status: 'Auth routes operational' });
});

module.exports = router;


