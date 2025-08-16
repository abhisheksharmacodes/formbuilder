import React from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import FormBuilder from './components/FormBuilder'
import Dashboard from './components/Dashboard'
import FormFiller from './components/FormFiller'

// Main App Component
function App() {
  const navigate = useNavigate()
  const location = useLocation()
  
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Navigation Tabs */}
      {!location.pathname.includes('/form/') && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4">
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
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="py-8">
        <Routes>
          <Route path="/" element={<FormBuilder />} />
          <Route path="/dashboard" element={<Dashboard onCreateForm={switchToBuilder} onViewForm={switchToFormFiller} />} />
          <Route path="/form/:formId" element={<FormFillerWrapper onBack={switchToDashboard} />} />
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