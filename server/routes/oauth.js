const express = require('express')
const axios = require('axios')
const User = require('../models/User')
const router = express.Router()

// Airtable OAuth configuration
const AIRTABLE_CLIENT_ID = process.env.AIRTABLE_CLIENT_ID
const AIRTABLE_CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET
const AIRTABLE_REDIRECT_URI = process.env.AIRTABLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback'
const AIRTABLE_AUTH_URL = 'https://airtable.com/oauth2/v1/authorize'
const AIRTABLE_TOKEN_URL = 'https://airtable.com/oauth2/v1/token'

// Generate OAuth authorization URL
router.get('/auth', (req, res) => {
  if (!AIRTABLE_CLIENT_ID) {
    return res.status(500).json({ error: 'OAuth not configured' })
  }

  const state = Math.random().toString(36).substring(7)
  const authUrl = `${AIRTABLE_AUTH_URL}?` +
    `client_id=${encodeURIComponent(AIRTABLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(AIRTABLE_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=data.records:read%20data.records:write%20schema.bases:read` +
    `&state=${state}`

  res.json({ authUrl, state })
})

// Handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query

  if (error) {
    console.error('OAuth error:', error, error_description)
    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return res.redirect(`${frontendUrl}/oauth/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`)
  }

  if (!code) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return res.redirect(`${frontendUrl}/oauth/callback?error=no_code`)
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(AIRTABLE_TOKEN_URL, {
      grant_type: 'authorization_code',
      client_id: AIRTABLE_CLIENT_ID,
      client_secret: AIRTABLE_CLIENT_SECRET,
      redirect_uri: AIRTABLE_REDIRECT_URI,
      code: code
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    const { access_token, refresh_token, expires_in } = tokenResponse.data

    // Get user profile from Airtable
    const profileResponse = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    const userProfile = profileResponse.data
    const airtableId = userProfile.id
    const email = userProfile.email
    const name = userProfile.name || email.split('@')[0]

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000)

    // Find or create user
    let user = await User.findOne({ airtableId })
    
    if (user) {
      // Update existing user's tokens
      user.accessToken = access_token
      user.refreshToken = refresh_token
      user.tokenExpiresAt = tokenExpiresAt
      user.airtableProfile = userProfile
      user.updatedAt = new Date()
    } else {
      // Create new user
      user = new User({
        airtableId,
        email,
        name,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        airtableProfile: userProfile
      })
    }

    await user.save()

    // Redirect to frontend with user data
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const userData = encodeURIComponent(JSON.stringify({
      id: user._id,
      airtableId: user.airtableId,
      email: user.email,
      name: user.name,
      profile: user.airtableProfile
    }))
    
    return res.redirect(`${frontendUrl}/oauth/callback?success=true&user=${userData}`)

  } catch (error) {
    console.error('OAuth callback error:', error)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return res.redirect(`${frontendUrl}/oauth/callback?error=oauth_failed&error_description=${encodeURIComponent('Failed to complete OAuth flow')}`)
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

module.exports = router
