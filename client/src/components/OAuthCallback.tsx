import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CustomAlert from './CustomAlert'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
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

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage(`OAuth error: ${error}`)
        setCustomAlert({
          isOpen: true,
          title: 'Authentication Failed',
          message: `OAuth error: ${error}`,
          type: 'error'
        })
        return
      }

      if (!code) {
        setStatus('error')
        setMessage('Authorization code not provided')
        setCustomAlert({
          isOpen: true,
          title: 'Authentication Failed',
          message: 'Authorization code not provided',
          type: 'error'
        })
        return
      }

      try {
        // Exchange code for tokens (this should be done on the backend)
        // For now, we'll simulate the callback by storing the code
        // In a real implementation, this would be handled by the backend callback endpoint
        
        // Store the authorization code temporarily
        localStorage.setItem('oauth_code', code)
        localStorage.setItem('oauth_state', state || '')
        
        setStatus('success')
        setMessage('Authentication successful! You can close this window.')
        
        // Notify the parent window
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_SUCCESS', code, state }, '*')
        }
        
        // Auto-close after a delay
        setTimeout(() => {
          window.close()
        }, 3000)
        
      } catch (error) {
        setStatus('error')
        setMessage('Failed to complete authentication')
        setCustomAlert({
          isOpen: true,
          title: 'Authentication Failed',
          message: error instanceof Error ? error.message : 'Failed to complete authentication',
          type: 'error'
        })
      }
    }

    handleCallback()
  }, [searchParams])

  const closeAlert = () => {
    setCustomAlert(prev => ({ ...prev, isOpen: false }))
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Authentication</h2>
          <p className="text-gray-600">Please wait while we complete your Airtable login...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-4">{message}</p>
          <button
            onClick={() => window.close()}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Successful!</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <p className="text-sm text-gray-500">This window will close automatically in a few seconds.</p>
        
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
