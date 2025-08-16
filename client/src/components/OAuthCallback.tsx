import { useEffect, useState } from 'react'
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


  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success')
      const user = searchParams.get('user')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        setStatus('error')
        const errorMsg = errorDescription || error
        setMessage(`OAuth error: ${errorMsg}`)
        setCustomAlert({
          isOpen: true,
          title: 'Authentication Failed',
          message: `OAuth error: ${errorMsg}`,
          type: 'error'
        })
        return
      }

      if (success === 'true' && user) {
        try {
          const userData = JSON.parse(decodeURIComponent(user))
          
          // Store user data for the parent window
          localStorage.setItem('airtable_user', JSON.stringify(userData))
          
          setStatus('success')
          setMessage('Authentication successful! You can close this window.')
          
          // Notify the parent window
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', user: userData }, '*')
          }
          
          // Auto-close after a delay
          setTimeout(() => {
            window.close()
          }, 2000)
          
        } catch (parseError) {
          setStatus('error')
          setMessage('Failed to parse user data')
          setCustomAlert({
            isOpen: true,
            title: 'Authentication Failed',
            message: 'Failed to parse user data',
            type: 'error'
          })
        }
      } else {
        setStatus('error')
        setMessage('Authentication failed - no user data received')
        setCustomAlert({
          isOpen: true,
          title: 'Authentication Failed',
          message: 'Authentication failed - no user data received',
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
