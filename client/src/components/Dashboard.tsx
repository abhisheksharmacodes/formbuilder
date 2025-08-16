import React, { useState, useEffect } from 'react'
import type { FormDefinitionWithId } from '../types'
import CustomAlert from './CustomAlert'

// Dashboard Component
export default function Dashboard({ 
  onCreateForm, 
  onViewForm 
}: { 
  onCreateForm: () => void
  onViewForm: (formId: string) => void
}) {
  const [userId, setUserId] = useState<string>('')
  const [forms, setForms] = useState<FormDefinitionWithId[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [selectedForm, setSelectedForm] = useState<FormDefinitionWithId | null>(null)
  const [showFormDetails, setShowFormDetails] = useState<boolean>(false)
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState<boolean>(false)
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    onConfirm?: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const API_BASE = 'https://formbuilder-back.vercel.app/api'

  // Fetch forms for a user
  const fetchForms = async () => {
    if (!userId) return

    setLoading(true)
    setError('')
    setHasAttemptedFetch(true)
    
    try {
      const response = await fetch(`${API_BASE}/forms/user/${userId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch forms: ${response.statusText}`)
      }
      
      const data = await response.json()
      setForms(data.forms || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forms')
    } finally {
      setLoading(false)
    }
  }

  // Delete a form
  const deleteForm = async (formId: string) => {
    setCustomAlert({
      isOpen: true,
      title: 'Delete Form',
      message: 'Are you sure you want to delete this form? This action cannot be undone.',
      type: 'warning',
      onConfirm: () => performDelete(formId)
    })
  }

  const performDelete = async (formId: string) => {
    setCustomAlert(prev => ({ ...prev, isOpen: false }))

    try {
      const response = await fetch(`${API_BASE}/forms/${formId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete form: ${response.statusText}`)
      }

      // Remove form from local state
      setForms(prev => prev.filter(form => form._id !== formId))
      
      // Close details modal if the deleted form was selected
      if (selectedForm?._id === formId) {
        setSelectedForm(null)
        setShowFormDetails(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form')
    }
  }

  // View form details
  const viewFormDetails = (form: FormDefinitionWithId) => {
    setSelectedForm(form)
    setShowFormDetails(true)
  }

  // Close form details modal
  const closeFormDetails = () => {
    setShowFormDetails(false)
    setSelectedForm(null)
  }

  // Get form statistics
  const getFormStats = () => {
    const totalForms = forms.length
    const formsWithConditionalLogic = forms.filter(form => 
      form.fields.some(field => field.conditionalLogic.rules.length > 0)
    ).length
    const totalFields = forms.reduce((sum, form) => sum + form.fields.length, 0)

    return { totalForms, formsWithConditionalLogic, totalFields }
  }

  const stats = getFormStats()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-lg text-gray-600">Manage and view all your saved forms</p>
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* User ID Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            User ID (to load your forms)
          </label>
          <div className="flex flex-col sm:flex-row space-x-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your user ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchForms}
              disabled={!userId || loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Load Forms'}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {forms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-2xl font-bold text-blue-600">{stats.totalForms}</h3>
              <p className="text-gray-600">Total Forms</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-2xl font-bold text-green-600">{stats.formsWithConditionalLogic}</h3>
              <p className="text-gray-600">Forms with Conditional Logic</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-2xl font-bold text-purple-600">{stats.totalFields}</h3>
              <p className="text-gray-600">Total Fields</p>
            </div>
          </div>
        )}

        {/* Forms List */}
        {forms.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Forms</h2>
            
            <div className="space-y-4">
              {forms.map((form) => (
                <div key={form._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{form.name}</h3>
                      <p className="text-sm text-gray-600">
                        {form.fields.length} fields • Created {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 font-mono">
                          Form URL: https://bustbrain-formbuilder.vercel.app/form/{form._id}
                        </p>
                      </div>
                      {form.fields.some(field => field.conditionalLogic.rules.length > 0) && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Conditional Logic
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onViewForm(form._id)}
                        className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        View Form
                      </button>
                      <button
                        onClick={() => viewFormDetails(form)}
                        className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteForm(form._id)}
                        className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : hasAttemptedFetch && !loading && forms.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Forms Found</h3>
              <p className="text-gray-600 mb-4">
                You haven't created any forms yet. Start building your first form!
              </p>
              <button
                onClick={onCreateForm}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Create Your First Form
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading forms...</p>
          </div>
        )}

        {/* Form Details Modal */}
        {showFormDetails && selectedForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedForm.name}</h2>
                  <button
                    onClick={closeFormDetails}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Form Information</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Form ID:</span> {selectedForm._id}</p>
                      <p><span className="font-medium">Created:</span> {new Date(selectedForm.createdAt).toLocaleString()}</p>
                      <p><span className="font-medium">Updated:</span> {new Date(selectedForm.updatedAt).toLocaleString()}</p>
                      <p><span className="font-medium">Total Fields:</span> {selectedForm.fields.length}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Airtable Details</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Base ID:</span> {selectedForm.airtableBaseId}</p>
                      <p><span className="font-medium">Table ID:</span> {selectedForm.airtableTableId}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Form Fields</h3>
                  <div className="space-y-3">
                    {selectedForm.fields.map((field, index) => (
                      <div key={field.fieldId} className="border border-gray-200 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {index + 1}. {field.label}
                          </h4>
                          <div className="flex space-x-2">
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {field.type}
                            </span>
                            {field.required && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {field.conditionalLogic.rules.length > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                            <span className="font-medium">Conditional Logic:</span> Show when {
                              field.conditionalLogic.rules.map((rule, ruleIndex) => (
                                <span key={ruleIndex}>
                                  {ruleIndex > 0 && ' OR '}
                                  {selectedForm.fields.find(f => f.fieldId === rule.fieldId)?.label || 'Unknown field'} equals "{rule.value}"
                                </span>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Alert */}
        <CustomAlert
          isOpen={customAlert.isOpen}
          onClose={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
          title={customAlert.title}
          message={customAlert.message}
          type={customAlert.type}
          onConfirm={customAlert.onConfirm}
        />
      </div>
    </div>
  )
}
