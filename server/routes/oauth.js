/**
 * Secure Airtable OAuth 2.0 Implementation
 *
 * Endpoints:
 * - GET /api/oauth/airtable - Initiate OAuth flow with secure state
 * - GET /api/oauth/airtable/callback - Handle OAuth callback with state verification
 * - POST /api/oauth/refresh - Refresh access tokens
 * - GET /api/oauth/profile/:userId - Get user profile
 * - POST /api/oauth/logout - Logout and revoke tokens
 */

const express = require('express')
const axios = require('axios')
const crypto = require('crypto')
const querystring = require('querystring')
const User = require('../models/User')
const { ensureConnection } = require('../db/connectDB')
const router = express.Router()

// Airtable OAuth configuration
const AIRTABLE_CLIENT_ID = process.env.AIRTABLE_CLIENT_ID
const AIRTABLE_CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET
const AIRTABLE_REDIRECT_URI = process.env.AIRTABLE_REDIRECT_URI || 'http://localhost:5000/api/oauth/airtable/callback'
const FRONTEND_URL = process.env.FRONTEND_URL
const AIRTABLE_AUTH_URL = 'https://airtable.com/oauth2/v1/authorize'
const AIRTABLE_TOKEN_URL = 'https://airtable.com/oauth2/v1/token'

// Utility: Ensure required environment variables are present
function assertEnvVars(vars) {
  const missing = vars.filter((v) => !v.value)
  if (missing.length > 0) {
    const names = missing.map((m) => m.name).join(', ')
    const error = new Error(`Missing required environment variables: ${names}`)
    error.statusCode = 500
    throw error
  }
}

/**
 * GET /api/oauth/airtable
 *
 * Initiates the OAuth 2.0 Authorization Code flow with Airtable.
 * Generates a cryptographically secure state parameter and redirects to Airtable.
 */
router.get('/airtable', (req, res) => {
  try {
    assertEnvVars([
      { name: 'AIRTABLE_CLIENT_ID', value: AIRTABLE_CLIENT_ID },
      { name: 'AIRTABLE_REDIRECT_URI', value: AIRTABLE_REDIRECT_URI },
    ])

    // Generate cryptographically secure state parameter
    const state = crypto.randomBytes(32).toString('hex')
    const stateExpiry = Date.now() + (10 * 60 * 1000) // 10 minutes from now
    
    // Store state and expiry in session for CSRF protection
    req.session.oauthState = state
    req.session.oauthStateExpiry = stateExpiry
    
    // Build authorization URL with all required parameters
    const params = {
      client_id: AIRTABLE_CLIENT_ID,
      redirect_uri: AIRTABLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'data.records:read data.records:write schema.bases:read',
      state: state
    }

    const authorizationUrl = `${AIRTABLE_AUTH_URL}?${querystring.stringify(params)}`
    
    // Redirect user to Airtable for authorization
    return res.redirect(authorizationUrl)
  } catch (error) {
    console.error('Failed to initiate Airtable OAuth flow:', error)
    return res.status(error.statusCode || 500).json({
      message: 'Failed to initiate Airtable OAuth flow',
      error: error.message,
    })
  }
})

/**
 * GET /api/oauth/airtable/callback
 *
 * Handles the OAuth callback from Airtable with comprehensive security checks.
 * Verifies state parameter, exchanges code for tokens, and creates/updates user.
 */
router.get('/airtable/callback', async (req, res) => {
  const { code, state, error } = req.query

  // Handle OAuth errors from Airtable
  if (error) {
    console.error('OAuth error from Airtable:', error)
    const frontendBase = FRONTEND_URL || 'https://bustbrain-formbuilder.vercel.app/'
    return res.redirect(`${frontendBase}?error=${encodeURIComponent(error)}`)
  }

  // Validate authorization code
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code not provided' })
  }

  // Comprehensive state parameter validation
  if (!state) {
    return res.status(400).json({ error: 'State parameter is required for security' })
  }

  if (!req.session.oauthState) {
    return res.status(400).json({ error: 'No OAuth state found in session. Please restart the OAuth flow.' })
  }

  if (state !== req.session.oauthState) {
    console.error('State mismatch - possible CSRF attack:', { received: state, expected: req.session.oauthState })
    return res.status(400).json({ error: 'Invalid state parameter. Possible CSRF attack detected.' })
  }

  // Check state expiration to prevent replay attacks
  if (Date.now() > req.session.oauthStateExpiry) {
    delete req.session.oauthState
    delete req.session.oauthStateExpiry
    return res.status(400).json({ error: 'OAuth state has expired. Please restart the OAuth flow.' })
  }

  // Clear state from session after successful verification
  delete req.session.oauthState
  delete req.session.oauthStateExpiry

  try {
    assertEnvVars([
      { name: 'AIRTABLE_CLIENT_ID', value: AIRTABLE_CLIENT_ID },
      { name: 'AIRTABLE_CLIENT_SECRET', value: AIRTABLE_CLIENT_SECRET },
      { name: 'AIRTABLE_REDIRECT_URI', value: AIRTABLE_REDIRECT_URI },
    ])

    // Ensure database connection
    await ensureConnection()

    // 1) Exchange authorization code for access token
    const tokenBody = querystring.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: AIRTABLE_CLIENT_ID,
      client_secret: AIRTABLE_CLIENT_SECRET,
      redirect_uri: AIRTABLE_REDIRECT_URI,
    })

    const tokenResponse = await axios.post(AIRTABLE_TOKEN_URL, tokenBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15_000,
    })

    if (!tokenResponse || tokenResponse.status < 200 || tokenResponse.status >= 300) {
      throw new Error(`Token exchange failed with status ${tokenResponse && tokenResponse.status}`)
    }

    const { access_token, refresh_token, expires_in } = tokenResponse.data
    if (!access_token) {
      throw new Error('Token exchange response did not include an access_token')
    }

    // 2) Fetch user profile from Airtable
    const profileResponse = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: { Authorization: `Bearer ${access_token}` },
      timeout: 15_000,
    })

    if (!profileResponse || profileResponse.status < 200 || profileResponse.status >= 300) {
      throw new Error(`Profile fetch failed with status ${profileResponse && profileResponse.status}`)
    }

    const userProfile = profileResponse.data
    const airtableId = userProfile.id
    const email = userProfile.email
    const name = userProfile.name || userProfile.email || 'Airtable User'

    if (!airtableId) {
      throw new Error('Airtable profile response did not include an id')
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + (expires_in * 1000))

    // 3) Find or create user in database
    let user = await User.findOne({ airtableId }).select('+airtableAccessToken')
    
    if (user) {
      // Update existing user's tokens and profile
      user.airtableAccessToken = access_token
      user.refreshToken = refresh_token
      user.tokenExpiresAt = tokenExpiresAt
      user.airtableProfile = userProfile
      user.name = name
      user.email = email
      user.updatedAt = new Date()
    } else {
      // Create new user
      user = new User({
        airtableId,
        email,
        name,
        airtableAccessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        airtableProfile: userProfile
      })
    }

    await user.save()

    // 4) Redirect back to frontend with user identifier
    const frontendBase = FRONTEND_URL || 'https://bustbrain-formbuilder.vercel.app/'
    const redirectUrl = `${frontendBase}?userId=${encodeURIComponent(String(user._id))}`
    return res.redirect(redirectUrl)

  } catch (error) {
    console.error('Airtable OAuth callback handling failed:', error.response?.data || error.message || error)
    const status = error.statusCode || (error.response && error.response.status) || 500
    const frontendBase = FRONTEND_URL || 'https://bustbrain-formbuilder.vercel.app/'
    return res.redirect(`${frontendBase}?error=${encodeURIComponent('OAuth processing failed')}`)
  }
})

// Refresh access token
router.post('/refresh', async (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if token needs refresh
    if (user.tokenExpiresAt > new Date()) {
      return res.json({ 
        success: true, 
        accessToken: user.accessToken,
        expiresAt: user.tokenExpiresAt
      })
    }

    // Refresh token
    const refreshResponse = await axios.post(AIRTABLE_TOKEN_URL, {
      grant_type: 'refresh_token',
      client_id: AIRTABLE_CLIENT_ID,
      client_secret: AIRTABLE_CLIENT_SECRET,
      refresh_token: user.refreshToken
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    const { access_token, refresh_token, expires_in } = refreshResponse.data
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000)

    // Update user's tokens
    user.accessToken = access_token
    user.refreshToken = refresh_token || user.refreshToken // Keep old refresh token if new one not provided
    user.tokenExpiresAt = tokenExpiresAt
    user.updatedAt = new Date()

    await user.save()

    res.json({
      success: true,
      accessToken: access_token,
      expiresAt: tokenExpiresAt
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(500).json({ error: 'Failed to refresh token' })
  }
})

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-accessToken -refreshToken')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Failed to get user profile' })
  }
})

// Logout (revoke tokens)
router.post('/logout', async (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Clear tokens
    user.accessToken = null
    user.refreshToken = null
    user.tokenExpiresAt = null
    user.updatedAt = new Date()

    await user.save()

    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Failed to logout' })
  }
})

/**
 * GET /api/oauth/auth
 * 
 * Alternative endpoint for JSON response (for AJAX calls)
 * Returns authorization URL instead of redirecting
 */
router.get('/auth', (req, res) => {
  try {
    assertEnvVars([
      { name: 'AIRTABLE_CLIENT_ID', value: AIRTABLE_CLIENT_ID },
      { name: 'AIRTABLE_REDIRECT_URI', value: AIRTABLE_REDIRECT_URI },
    ])

    // Generate cryptographically secure state parameter
    const state = crypto.randomBytes(32).toString('hex')
    const stateExpiry = Date.now() + (10 * 60 * 1000) // 10 minutes from now
    
    // Store state and expiry in session
    req.session.oauthState = state
    req.session.oauthStateExpiry = stateExpiry
    
    const params = {
      client_id: AIRTABLE_CLIENT_ID,
      redirect_uri: AIRTABLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'data.records:read data.records:write schema.bases:read',
      state: state
    }

    const authUrl = `${AIRTABLE_AUTH_URL}?${querystring.stringify(params)}`
    
    res.json({ authUrl })
  } catch (error) {
    console.error('Failed to generate OAuth URL:', error)
    return res.status(error.statusCode || 500).json({
      error: 'Failed to generate OAuth URL',
      message: error.message,
    })
  }
})

module.exports = router
