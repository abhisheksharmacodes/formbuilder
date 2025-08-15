# BustBrain - Dynamic Form Builder with Airtable Integration

## Overview

BustBrain is a full-stack web application that enables users to create dynamic, conditional forms connected to Airtable databases. The application features a powerful Form Builder for creating forms with conditional logic and a Form Viewer for filling out and submitting forms. All form submissions are automatically saved to the corresponding Airtable tables.

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **Airtable API** - External database integration
- **OAuth 2.0** - Authentication with Airtable

### Frontend
- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server

### Development Tools
- **ESLint** - Code linting and formatting
- **Nodemon** - Development server with auto-restart

## Features

### Core Features ✅
- **Form Builder**: Create dynamic forms by selecting Airtable bases, tables, and fields
- **Field Management**: Support for multiple field types (short text, long text, single select, multiple select, attachments)
- **Conditional Logic**: Show/hide form fields based on user responses to other questions
- **Form Viewer**: Fill out forms with real-time conditional field visibility
- **Airtable Integration**: Seamless connection to Airtable databases via OAuth
- **Form Submission**: Automatic saving of form responses to Airtable tables
- **User Management**: Secure user authentication and form ownership

### Bonus Features ✅
- **Real-time Conditional Logic**: Fields dynamically show/hide as users type
- **Comprehensive Field Types**: Support for all major Airtable field types
- **Professional UI/UX**: Clean, responsive interface with Tailwind CSS
- **Error Handling**: Robust error handling for all API calls and user interactions
- **Loading States**: User-friendly loading indicators throughout the application

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB instance (local or Atlas)
- Airtable account with API access

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd bustbrain
```

### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your configuration
# MONGODB_URI=your_mongodb_connection_string
# AIRTABLE_CLIENT_ID=your_airtable_client_id
# AIRTABLE_CLIENT_SECRET=your_airtable_client_secret
# AIRTABLE_REDIRECT_URI=http://localhost:5000/api/auth/airtable/callback
# FRONTEND_URL=http://localhost:5173

# Start the server
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup
```bash
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

### 4. Database Setup
Ensure your MongoDB instance is running and accessible. The application will automatically create the necessary collections on first use.

## Airtable OAuth App Setup

### Step 1: Create Airtable App
1. Go to [Airtable Developer Hub](https://airtable.com/developers)
2. Click "Create a new app"
3. Fill in the app details:
   - **App name**: BustBrain Forms
   - **App description**: Dynamic form builder with conditional logic
   - **App icon**: Upload a custom icon (optional)

### Step 2: Configure OAuth Settings
1. In your app settings, go to the "OAuth" tab
2. Set the **Redirect URI** to: `http://localhost:5000/api/auth/airtable/callback`
3. Add the following **Scopes**:
   - `data.records:read` - Read records from tables
   - `data.records:write` - Write records to tables
   - `schema.bases:read` - Read base and table schemas

### Step 3: Get Credentials
1. Copy your **Client ID** and **Client Secret**
2. Add them to your `.env` file:
   ```env
   AIRTABLE_CLIENT_ID=your_client_id_here
   AIRTABLE_CLIENT_SECRET=your_client_secret_here
   AIRTABLE_REDIRECT_URI=http://localhost:5000/api/auth/airtable/callback
   ```

### Step 4: Test OAuth Flow
1. Start both backend and frontend servers
2. Navigate to the Form Builder
3. Enter a test User ID
4. Click "Switch to Form Viewer" to test the OAuth flow
5. Complete the Airtable authorization process

## Explanation of Conditional Logic

### How It Works
The conditional logic system allows form creators to show or hide specific questions based on user responses to other questions. This creates dynamic, intelligent forms that adapt to user input.

### In the Form Builder
1. **Rule Creation**: For each field, creators can add conditional rules
2. **Trigger Fields**: Select which field will trigger the condition
3. **Operators**: Choose from equals, not equals, contains, greater than, less than
4. **Values**: Set the specific value that triggers the condition
5. **Logic Type**: Choose between "ALL rules must be true" or "ANY rule can be true"

### In the Form Viewer
1. **Real-time Evaluation**: As users type, conditions are evaluated instantly
2. **Dynamic Visibility**: Fields appear/disappear based on current responses
3. **Smooth Transitions**: UI updates smoothly without page refreshes

### Example Use Case
```
Question 1: "What is your age?" (Type: Number)
Question 2: "Are you a student?" (Type: Single Select, Options: Yes/No)
Question 3: "What school do you attend?" (Type: Short Text)

Conditional Logic for Question 3:
- Show when: Question 2 equals "Yes"
- Result: School question only appears for students
```

## Deliverables

### Repository Structure
```
bustbrain/
├── client/                          # React frontend application
│   ├── src/
│   │   ├── App.tsx                 # Main application component
│   │   ├── App.css                 # Application styles
│   │   └── main.tsx                # Application entry point
│   ├── package.json                # Frontend dependencies
│   └── README.md                   # Frontend documentation
├── server/                          # Node.js backend application
│   ├── models/                      # MongoDB schemas
│   │   ├── User.js                 # User model with Airtable integration
│   │   └── Form.js                 # Form definition model
│   ├── routes/                      # API endpoints
│   │   ├── auth.js                 # OAuth and authentication routes
│   │   └── forms.js                # Form management and submission routes
│   ├── db/                          # Database connection
│   │   └── connectDB.js            # MongoDB connection handler
│   ├── server.js                    # Main server entry point
│   ├── package.json                 # Backend dependencies
│   └── .env.example                # Environment variables template
└── README.md                        # This file - project documentation
```

### API Endpoints
- `GET /api/forms/bases/:userId` - Fetch user's Airtable bases
- `GET /api/forms/tables/:userId/:baseId` - Fetch tables in a base
- `GET /api/forms/fields/:userId/:baseId/:tableId` - Fetch filtered fields
- `POST /api/forms/:userId` - Create new form
- `GET /api/forms/:formId` - Fetch form definition
- `POST /api/forms/submit/:formId` - Submit form responses
- `GET /api/auth/airtable` - Initiate OAuth flow
- `GET /api/auth/airtable/callback` - OAuth callback handler

### Database Collections
- **Users**: Store Airtable OAuth tokens and user information
- **Forms**: Store form definitions with conditional logic rules

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ using modern web technologies**
