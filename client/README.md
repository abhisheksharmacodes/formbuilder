# Form Builder Frontend

A modern React application for building and managing dynamic forms connected to Airtable.

## 🏗️ Project Structure

```
client/src/
├── components/           # Reusable UI components
│   ├── FormBuilder.tsx  # Form creation interface
│   ├── Dashboard.tsx    # Form management dashboard
│   └── FormFiller.tsx   # Form completion interface
├── types/               # Shared TypeScript interfaces
│   └── index.ts        # Common type definitions
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## 🎯 Components Overview

### **FormBuilder**
- **Purpose**: Create and configure dynamic forms
- **Features**:
  - Connect to Airtable bases and tables
  - Add form fields with validation
  - Configure conditional logic rules
  - Live form preview
  - Save forms to backend
  - **Form URL Generation**: Automatically generates shareable form URLs

### **Dashboard**
- **Purpose**: Manage all saved forms
- **Features**:
  - View form statistics
  - List all user forms with shareable URLs
  - View detailed form information
  - Delete forms
  - Quick navigation to form builder
  - **Form URLs**: Display and copy form URLs for sharing

### **FormFiller**
- **Purpose**: Complete form submissions
- **Features**:
  - Dynamic form rendering
  - Conditional logic support
  - Field validation
  - Submit responses to backend
  - Responsive design
  - **Form URL Display**: Shows the current form's shareable URL

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   cd client
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## 🔧 Configuration

The application requires a backend server running at `https://formbuilder-back.vercel.app/api`. Ensure the backend is properly configured with:

- MongoDB connection
- Airtable OAuth credentials
- Required API endpoints

## 📱 Features

- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Type Safety**: Full TypeScript support with shared interfaces
- **Component Architecture**: Modular, maintainable code structure
- **Form Validation**: Client-side validation with visual feedback
- **Conditional Logic**: Dynamic form behavior based on user input
- **Real-time Preview**: See form changes as you build
- **Responsive Design**: Works on all device sizes

## 🎨 Styling

The application uses Tailwind CSS for styling with:
- Consistent color scheme
- Responsive grid layouts
- Interactive hover states
- Professional form styling
- Accessible design patterns

## 🔄 State Management

Each component manages its own state using React hooks:
- `useState` for local component state
- `useEffect` for side effects and API calls
- `useCallback` for performance optimization
- Props for parent-child communication

## 📊 API Integration

Components communicate with the backend through:
- RESTful API endpoints
- JSON data exchange
- Error handling and user feedback
- Loading states and progress indicators

## 🧪 Development

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Component Isolation**: Each component is self-contained
- **Shared Types**: Common interfaces in `types/index.ts`
- **Modular Structure**: Easy to maintain and extend

## 🚀 Deployment

The application can be deployed to:
- Vercel (recommended)
- Netlify
- Any static hosting service

Build the project and deploy the `dist` folder contents.

## 📝 Contributing

1. Follow the existing component structure
2. Use shared types from `types/index.ts`
3. Maintain consistent styling with Tailwind CSS
4. Add proper error handling and loading states
5. Test responsive behavior on different screen sizes

## 🔗 Related Files

- **Backend**: `../server/` - Express.js API server
- **Database**: MongoDB with Mongoose ODM
- **External**: Airtable REST API integration
