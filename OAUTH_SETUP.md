# Airtable OAuth Setup Guide

## Overview
This application now supports OAuth authentication with Airtable, allowing users to securely connect their Airtable accounts without manually entering API keys.

## Backend Setup

### 1. Environment Variables
Create a `.env` file in the `server/` directory with the following variables:

```env
# Airtable OAuth Configuration
AIRTABLE_CLIENT_ID=your_airtable_client_id_here
AIRTABLE_CLIENT_SECRET=your_airtable_client_secret_here
AIRTABLE_REDIRECT_URI=https://your-domain.vercel.app/oauth/callback

# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string_here

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 2. Airtable OAuth App Setup

1. Go to [Airtable Developer Hub](https://airtable.com/developers)
2. Create a new OAuth application
3. Set the redirect URI to: `https://your-domain.vercel.app/oauth/callback`
4. Copy the Client ID and Client Secret to your `.env` file

### 3. Install Dependencies
```bash
cd server
npm install axios
```

## Frontend Setup

The frontend components are already set up and include:

- **Login Component**: Handles OAuth initiation
- **OAuth Callback**: Processes OAuth redirects
- **Authentication State**: Manages user sessions
- **Protected Routes**: Ensures authenticated access

## How It Works

### 1. User Login Flow
1. User clicks "Log in with Airtable"
2. OAuth popup opens with Airtable authorization
3. User authorizes the application
4. Airtable redirects to callback with authorization code
5. Backend exchanges code for access token
6. User profile and tokens are saved to MongoDB
7. User is logged in and redirected to Form Builder

### 2. Token Management
- Access tokens are automatically refreshed when expired
- User sessions persist across browser sessions
- Secure token storage in MongoDB (not exposed to frontend)

### 3. API Access
- All Airtable API calls use the user's access token
- No need for manual API key entry
- Secure, user-specific access to Airtable data

## Security Features

- **OAuth 2.0**: Industry-standard authentication protocol
- **Secure Token Storage**: Tokens stored securely in MongoDB
- **Automatic Token Refresh**: Handles token expiration automatically
- **User Isolation**: Each user can only access their own Airtable data
- **No API Key Exposure**: API keys never exposed to frontend

## User Experience

- **Seamless Login**: One-click Airtable authentication
- **No Manual Setup**: Users don't need to find or enter API keys
- **Persistent Sessions**: Stay logged in across browser sessions
- **Professional UI**: Clean, modern authentication interface

## Troubleshooting

### Common Issues

1. **OAuth Not Configured Error**
   - Ensure environment variables are set correctly
   - Check that Airtable OAuth app is properly configured

2. **Redirect URI Mismatch**
   - Verify redirect URI in Airtable matches your environment variable
   - Check for trailing slashes or protocol mismatches

3. **Token Refresh Failures**
   - Ensure refresh tokens are being stored correctly
   - Check MongoDB connection and User model

### Debug Steps

1. Check server logs for OAuth errors
2. Verify environment variables are loaded
3. Test MongoDB connection
4. Check Airtable OAuth app configuration

## Production Deployment

### Vercel Deployment
1. Set environment variables in Vercel dashboard
2. Ensure redirect URI matches production domain
3. Update CORS settings if needed

### Security Considerations
- Use HTTPS in production
- Set appropriate CORS policies
- Monitor OAuth usage and errors
- Implement rate limiting if needed

## API Endpoints

- `GET /api/oauth/auth` - Get OAuth authorization URL
- `GET /api/oauth/callback` - Handle OAuth callback
- `POST /api/oauth/refresh` - Refresh access token
- `GET /api/oauth/profile/:userId` - Get user profile
- `POST /api/oauth/logout` - Logout user

## Database Schema

The User model includes:
- `airtableId`: Unique Airtable user identifier
- `email`: User's email address
- `name`: User's display name
- `accessToken`: OAuth access token
- `refreshToken`: OAuth refresh token
- `tokenExpiresAt`: Token expiration timestamp
- `airtableProfile`: Full Airtable user profile
- `createdAt`/`updatedAt`: Timestamps

This OAuth implementation provides a secure, user-friendly way to connect to Airtable while maintaining security best practices.
