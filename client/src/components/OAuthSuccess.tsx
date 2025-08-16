import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function OAuthSuccess() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const userId = searchParams.get('userId')
    const error = searchParams.get('error')

    if (error) {
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'OAUTH_ERROR', 
          error: error 
        }, window.location.origin)
      }
      window.close()
      return
    }

    if (userId) {
      // Send success with userId to parent window
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'OAUTH_SUCCESS', 
          userId: userId 
        }, window.location.origin)
      }
      window.close()
    } else {
      // No userId found, send error
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'OAUTH_ERROR', 
          error: 'No user ID received' 
        }, window.location.origin)
      }
      window.close()
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Authentication</h2>
        <p className="text-gray-600">This window will close automatically...</p>
      </div>
    </div>
  )
}
