import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import FormBuilder from './components/FormBuilder'
import Dashboard from './components/Dashboard'
import FormFiller from './components/FormFiller'
import Login from './components/Login'
import OAuthCallback from './components/OAuthCallback'

// Main App Component
function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Check for existing user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('airtable_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  // Handle user login
  const handleLogin = (userData: any) => {
    setUser(userData)
    localStorage.setItem('airtable_user', JSON.stringify(userData))
    navigate('/')
  }

  // Handle user logout
  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('airtable_user')
    navigate('/login')
  }

  // Determine current view mode based on pathname
  const getCurrentViewMode = () => {
    if (location.pathname === '/') return 'builder'
    if (location.pathname === '/dashboard') return 'dashboard'
    if (location.pathname.startsWith('/form/')) return 'filler'
    return 'builder'
  }

  const currentViewMode = getCurrentViewMode()

  const switchToBuilder = () => navigate('/')
  const switchToDashboard = () => navigate('/dashboard')
  const switchToFormFiller = (formId: string) => navigate(`/form/${formId}`)

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user && !location.pathname.includes('/oauth/callback')) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Navigation Tabs */}
      {!location.pathname.includes('/form/') && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex space-x-8">
                <button
                  onClick={switchToBuilder}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    currentViewMode === 'builder'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Form Builder
                </button>
                <button
                  onClick={switchToDashboard}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    currentViewMode === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dashboard
                </button>
              </div>
              
              {/* User Menu */}
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-700">
                  Welcome, {user?.name || user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="py-8">
        <Routes>
          <Route path="/" element={<FormBuilder />} />
          <Route path="/dashboard" element={<Dashboard onCreateForm={switchToBuilder} onViewForm={switchToFormFiller} />} />
          <Route path="/form/:formId" element={<FormFillerWrapper onBack={switchToDashboard} />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
        </Routes>
      </div>
    </div>
  )
}

// Wrapper component to extract formId from URL params
function FormFillerWrapper({ onBack }: { onBack: () => void }) {
  const { formId } = useParams<{ formId: string }>()
  return <FormFiller formId={formId || ''} onBack={onBack} />
}

export default App