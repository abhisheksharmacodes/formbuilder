import React, { useState, useEffect } from 'react'
import type { 
  ConditionalRule, 
  ConditionalLogic, 
  FormField, 
  FormDefinition, 
  FormResponse 
} from '../types'
import CustomAlert from './CustomAlert'

// Form Filler Component
export default function FormFiller({ formId, onBack }: { formId: string; onBack: () => void }) {
  const [form, setForm] = useState<FormDefinition | null>(null)
  const [formResponses, setFormResponses] = useState<FormResponse>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
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

  // Fetch form definition when component mounts
  useEffect(() => {
    console.log('formId', formId)
    if (formId) {
      fetchForm()
    }
  }, [formId])

  // Fetch form definition
  const fetchForm = async () => {
    if (!formId) return

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE}/forms/${formId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch form: ${response.statusText}`)
      }
      
      const data = await response.json()
      setForm(data.form)
      setFormResponses({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch form')
    } finally {
      setLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (fieldId: string, value: string | string[] | number | boolean | File[]) => {
    setFormResponses(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const closeAlert = () => {
    setCustomAlert(prev => ({ ...prev, isOpen: false }))
  }

  // Check if a field should be visible based on conditional logic
  const isFieldVisible = (field: FormField) => {
    if (field.conditionalLogic.rules.length === 0) return true
    
    return field.conditionalLogic.rules.some(rule => {
      if (!rule.fieldId || rule.value === '') return true
      
      const triggerValue = formResponses[rule.fieldId]
      return triggerValue === rule.value
    })
  }

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = reader.result as string
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = error => reject(error)
    })
  }

  // Submit form responses
  const submitForm = async () => {
    if (!form) return

    // Validate required fields
    const validationErrors: string[] = []
    const visibleFields = form.fields.filter(field => isFieldVisible(field))
    
    visibleFields.forEach(field => {
      if (field.required) {
        const value = formResponses[field.fieldId]
        if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')) {
          validationErrors.push(`${field.label} is required`)
        }
      }
    })
    
    if (validationErrors.length > 0) {
      setError('Please fill in all required fields:\n' + validationErrors.join('\n'))
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Process form responses to handle file attachments
      const processedResponses: Record<string, any> = {}
      
      for (const [fieldId, value] of Object.entries(formResponses)) {
        if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
          // Convert File objects to Airtable attachment format
          const attachments = await Promise.all(
            (value as File[]).map(async (file: File) => ({
              filename: file.name,
              base64: await fileToBase64(file)
            }))
          )
          processedResponses[fieldId] = attachments
        } else {
          processedResponses[fieldId] = value
        }
      }

      const response = await fetch(`${API_BASE}/forms/submit/${formId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: processedResponses })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.statusText}`)
      }

      const result = await response.json()
      setCustomAlert({
        isOpen: true,
        title: 'Form Submitted Successfully!',
        message: 'Your form has been submitted successfully. Thank you for your response!\n',
        type: 'success'
      })
      setFormResponses({})
      console.log('Form submitted:', result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  // Render form field based on type
  const renderField = (field: FormField) => {
    const value = formResponses[field.fieldId] || ''
    const isInvalid = field.required && (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === ''))

    switch (field.type) {
      case 'shortText':
        return (
          <div>
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {isInvalid && (
              <p className="text-xs text-red-600 mt-1">This field is required</p>
            )}
          </div>
        )

      case 'longText':
        return (
          <div>
            <textarea
              value={value as string}
              onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {isInvalid && (
              <p className="text-xs text-red-600 mt-1">This field is required</p>
            )}
          </div>
        )

      case 'singleSelect':
        return (
          <div>
            <select
              value={value as string}
              onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
              required={field.required}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {isInvalid && (
              <p className="text-xs text-red-600 mt-1">This field is required</p>
            )}
          </div>
        )

      case 'multipleSelect':
        return (
          <div>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(value as string[] || []).includes(option.id)}
                    onChange={(e) => {
                      const currentValues = (value as string[]) || []
                      const newValues = e.target.checked
                        ? [...currentValues, option.id]
                        : currentValues.filter(v => v !== option.id)
                      handleInputChange(field.fieldId, newValues)
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{option.name}</span>
                </label>
              ))}
            </div>
            {isInvalid && (
              <p className="text-xs text-red-600 mt-1">This field is required</p>
            )}
          </div>
        )

      case 'number':
        return (
          <div>
            <input
              type="number"
              value={value as number || ''}
              onChange={(e) => handleInputChange(field.fieldId, e.target.valueAsNumber || '')}
              placeholder={field.placeholder}
              required={field.required}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {isInvalid && (
              <p className="text-xs text-red-600 mt-1">This field is required</p>
            )}
          </div>
        )
      
      case 'email':
        return (
          <div>
            <input
              type="email"
              value={value as string}
              onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvalid ? 'border-red-300 bg-red-50' : 'border-transparent'
              }`}
            />
            {isInvalid && (
              <p className="text-xs text-red-600 mt-1">This field is required</p>
            )}
          </div>
        )
      
      case 'date':
        return (
          <div>
            <input
              type="date"
              value={value as string}
              onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
              required={field.required}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {isInvalid && (
              <p className="text-xs text-red-600 mt-1">This field is required</p>
            )}
          </div>
        )
      
      case 'attachment':
        return (
          <div>
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                // Store the actual File objects instead of blob URLs
                handleInputChange(field.fieldId, files)
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: Images, PDFs, documents. Max file size: 10MB per file.
            </p>
            {isInvalid && (
              <p className="text-xs text-red-600 mt-1">This field is required</p>
            )}
          </div>
        )

      default:
        return <div className="text-gray-500">Unsupported field type: {field.type}</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Fill Out Form</h1>
            <p className="text-lg text-gray-600">Complete the form you created</p>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 whitespace-pre-line">
            {error}
          </div>
        )}
        
        {/* Form Display */}
        {form && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{form.name}</h2>
            
            {/* Conditional Logic Info */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">ℹ️ How Conditional Logic Works</h3>
              <p className="text-sm text-blue-700 mb-2">
                Some questions may be hidden based on your answers to other questions. 
                This creates a dynamic form that adapts to your responses.
              </p>
              <p className="text-xs text-blue-600">
                Showing {form.fields.filter(field => isFieldVisible(field)).length} of {form.fields.length} questions
              </p>
            </div>

            <form className="space-y-6">
              {form.fields.map((field) => (
                <div key={field.fieldId} className={`border-b border-gray-200 pb-6 last:border-b-0 ${
                  isFieldVisible(field) ? '' : 'hidden'
                }`}>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.helpText && (
                    <p className="text-sm text-gray-600 mb-3">{field.helpText}</p>
                  )}

                  {renderField(field)}
                </div>
              ))}

              <div className="pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={submitForm}
                  disabled={submitting}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {submitting ? 'Submitting...' : 'Submit Form'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading form...</p>
          </div>
        )}

        {/* Instructions */}
        {!form && !loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-center">
            <p>Enter a Form ID and click "Load Form" to start filling out a form.</p>
          </div>
        )}

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
