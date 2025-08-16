import React, { useState, useEffect } from 'react'
import CustomAlert from './CustomAlert'

interface LoginProps {
  onLogin: (user: any) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false)
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const API_BASE = 'https://formbuilder-back.vercel.app/api'

  const handleAirtableLogin = async () => {
    setLoading(true)
    try {
      // Get OAuth authorization URL
      const response = await fetch(`${API_BASE}/oauth/auth`)
      if (!response.ok) {
        throw new Error('Failed to get OAuth URL')
      }

      const { authUrl } = await response.json()
      
      // Open OAuth popup
      const popup = window.open(
        authUrl,
        'airtable-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      // Listen for OAuth callback
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup)
          setLoading(false)
          
          // Check if we have user data in localStorage (set by callback page)
          const userData = localStorage.getItem('airtable_user')
          if (userData) {
            const user = JSON.parse(userData)
            localStorage.removeItem('airtable_user') // Clean up
            onLogin(user)
          }
        }
      }, 1000)

    } catch (error) {
      setLoading(false)
      setCustomAlert({
        isOpen: true,
        title: 'Login Error',
        message: error instanceof Error ? error.message : 'Failed to start OAuth flow',
        type: 'error'
      })
    }
  }

  const closeAlert = () => {
    setCustomAlert(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Form Builder
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your Airtable account to start building forms
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <button
              onClick={handleAirtableLogin}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Log in with Airtable
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By logging in, you authorize Form Builder to access your Airtable data
            </p>
          </div>
        </div>

        {/* Custom Alert */}
        <CustomAlert
          isOpen={customAlert.isOpen}
          onClose={closeAlert}
          title={customAlert.title}
          message={customAlert.message}
          type={customAlert.type}
        />
      </div>
    </div>
  )
}
