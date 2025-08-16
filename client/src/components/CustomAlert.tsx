import React, { useEffect, useState } from 'react'
import Toast from './Toast'

interface CustomAlertProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  showCopyButton?: boolean
  copyText?: string
  onConfirm?: () => void
}

export default function CustomAlert({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type, 
  showCopyButton = false,
  copyText = '',
  onConfirm
}: CustomAlertProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      setShowToast(true)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-400',
          title: 'text-green-800',
          message: 'text-green-700',
          button: 'bg-green-600 hover:bg-green-700'
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-400',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-400',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-400',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (!isVisible) return null

  const styles = getAlertStyles()

  return (
    <>
      <div className="fixed inset-0 bg-[#000000dd] bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div 
          className={`${styles.bg} ${styles.border} border rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ${
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="p-6">
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${styles.icon}`}>
                {getIcon()}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-lg font-medium ${styles.title}`}>
                  {title}
                </h3>
                <div className={`mt-2 text-sm ${styles.message} whitespace-pre-line`}>
                  {message}
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={onClose}
                  className={`${styles.icon} hover:${styles.icon.replace('text-', 'text-').replace('-400', '-600')} transition-colors`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              {showCopyButton && copyText && (
                <button
                  onClick={handleCopy}
                  className={`${styles.button} text-white px-4 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  Copy to Clipboard
                </button>
              )}
              {onConfirm ? (
                <>
                  <button
                    onClick={onClose}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onConfirm()
                      onClose()
                    }}
                    className={`${styles.button} text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1`}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className={`${styles.button} text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1`}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <Toast
          message="Copied to clipboard!"
          type="success"
          duration={2000}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  )
}
