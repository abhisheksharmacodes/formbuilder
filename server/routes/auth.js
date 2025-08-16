/**
 * Airtable OAuth routes
 *
 * Endpoints:
 * - GET /api/auth/airtable
 *     Redirects the user to the Airtable OAuth authorization URL.
 * - GET /api/auth/airtable/callback
 *     Handles the OAuth callback, exchanges the authorization code for an
 *     access token, fetches the user's Airtable profile, persists a User
 *     document in MongoDB, and redirects back to the frontend with the
 *     user's identifier.
 */

const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const router = express.Router();

const User = require('../models/User');
const { ensureConnection } = require('../db/connectDB');

// Read required configuration from environment variables
const {
	AIRTABLE_CLIENT_ID,
	AIRTABLE_CLIENT_SECRET,
	AIRTABLE_REDIRECT_URI,
	FRONTEND_URL,
} = process.env;

// Utility: small helper to ensure required env vars are present
function assertEnvVars(vars) {
	const missing = vars.filter((v) => !v.value);
	if (missing.length > 0) {
		const names = missing.map((m) => m.name).join(', ');
		const error = new Error(`Missing required environment variables: ${names}`);
		error.statusCode = 500;
		throw error;
	}
}

/**
 * GET /api/auth/airtable
 *
 * Initiates the OAuth 2.0 Authorization Code flow with Airtable by redirecting
 * the user to Airtable's authorization endpoint.
 */
router.get('/airtable', (req, res) => {
	try {
		assertEnvVars([
			{ name: 'AIRTABLE_CLIENT_ID', value: AIRTABLE_CLIENT_ID },
			{ name: 'AIRTABLE_REDIRECT_URI', value: AIRTABLE_REDIRECT_URI },
		]);

		// Optional: allow callers to provide a state value for CSRF mitigation or deep-linking
		const state = typeof req.query.state === 'string' && req.query.state.length > 0
			? req.query.state
			: Math.random().toString(36).slice(2);

		// Scopes determine what parts of the Airtable API we can access on behalf of the user
		// Adjust as needed for your app's needs
		const scope = 'data.records:read data.records:write';

		const params = {
			client_id: AIRTABLE_CLIENT_ID,
			redirect_uri: AIRTABLE_REDIRECT_URI,
			response_type: 'code',
			scope,
			state,
		};

		const authorizationUrl = `https://airtable.com/oauth2/v1/authorize?${querystring.stringify(params)}`;
		return res.redirect(authorizationUrl);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to initiate Airtable OAuth flow:', error);
		return res.status(error.statusCode || 500).json({
			message: 'Failed to initiate Airtable OAuth flow',
			error: error.message,
		});
	}
});

/**
 * GET /api/auth/airtable/callback
 *
 * Handles the OAuth callback from Airtable, exchanging the authorization code
 * for an access token. Then uses the token to fetch the user's profile, and
 * persists/updates the user in MongoDB. Finally, redirects back to the
 * frontend with a user identifier.
 */
router.get('/airtable/callback', async (req, res) => {
	const { code } = req.query;

	if (!code || typeof code !== 'string') {
		return res.status(400).json({ message: 'Missing authorization code in callback request.' });
	}

	try {
		assertEnvVars([
			{ name: 'AIRTABLE_CLIENT_ID', value: AIRTABLE_CLIENT_ID },
			{ name: 'AIRTABLE_CLIENT_SECRET', value: AIRTABLE_CLIENT_SECRET },
			{ name: 'AIRTABLE_REDIRECT_URI', value: AIRTABLE_REDIRECT_URI },
		]);

		// 1) Exchange the authorization code for an access token
		// Airtable's token endpoint expects application/x-www-form-urlencoded payload
		const tokenBody = querystring.stringify({
			grant_type: 'authorization_code',
			code,
			client_id: AIRTABLE_CLIENT_ID,
			client_secret: AIRTABLE_CLIENT_SECRET,
			redirect_uri: AIRTABLE_REDIRECT_URI,
		});

		const tokenResponse = await axios.post('https://airtable.com/oauth2/v1/token', tokenBody, {
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			// A small timeout to avoid hanging requests
			timeout: 15_000,
		});

		if (!tokenResponse || tokenResponse.status < 200 || tokenResponse.status >= 300) {
			throw new Error(`Token exchange failed with status ${tokenResponse && tokenResponse.status}`);
		}

		const accessToken = tokenResponse.data && tokenResponse.data.access_token;
		if (!accessToken) {
			throw new Error('Token exchange response did not include an access_token');
		}

		// 2) Fetch the user's Airtable profile using the access token
		const profileResponse = await axios.get('https://api.airtable.com/v0/meta/whoami', {
			headers: { Authorization: `Bearer ${accessToken}` },
			timeout: 15_000,
		});

		if (!profileResponse || profileResponse.status < 200 || profileResponse.status >= 300) {
			throw new Error(`Profile fetch failed with status ${profileResponse && profileResponse.status}`);
		}

		// Example shape: { id: 'usrXXXXXXXXXXXXXX', email: 'user@example.com', name: 'Jane Doe', ... }
		const airtableId = profileResponse.data && profileResponse.data.id;
		const airtableName = profileResponse.data && (profileResponse.data.name || profileResponse.data.email || 'Airtable User');

		if (!airtableId) {
			throw new Error('Airtable profile response did not include an id');
		}

		// 3) Upsert the user in our database with the Airtable identifier and access token
		// Ensure database connection is active
		await ensureConnection();
		
		let user = await User.findOne({ airtableId }).select('+airtableAccessToken');
		if (!user) {
			user = new User({
				airtableId,
				airtableAccessToken: accessToken,
				name: airtableName,
			});
		} else {
			user.airtableAccessToken = accessToken;
			user.name = airtableName;
		}

		await user.save();

		// 4) Redirect back to the frontend application with the user identifier.
		// Choose a sensible default if FRONTEND_URL is not provided.
		const frontendBase = FRONTEND_URL || 'https://bustbrain-formbuilder.vercel.app';
		const redirectUrl = `${frontendBase}/oauth-success?userId=${encodeURIComponent(String(user._id))}`;
		return res.redirect(redirectUrl);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Airtable OAuth callback handling failed:', error.response?.data || error.message || error);
		const status = error.statusCode || (error.response && error.response.status) || 500;
		return res.status(status).json({
			message: 'Airtable OAuth processing failed',
			// Provide a safe error string; if axios error, include limited info
			error: typeof error === 'object' ? (error.message || 'Unknown error') : String(error),
		});
	}
});

module.exports = router;


