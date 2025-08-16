import React, { useState, useEffect, useCallback } from 'react'
import type { 
  AirtableBase, 
  AirtableTable, 
  AirtableField, 
  FormField, 
  FormDefinition,
  ConditionalRule
} from '../types'
import CustomAlert from './CustomAlert'

// Form Builder Component
export default function FormBuilder() {
  const [userId, setUserId] = useState<string>('')
  const [bases, setBases] = useState<AirtableBase[]>([])
  const [tables, setTables] = useState<AirtableTable[]>([])
  const [fields, setFields] = useState<AirtableField[]>([])
  const [selectedBase, setSelectedBase] = useState<string>('')
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [formDefinition, setFormDefinition] = useState<FormDefinition>({
    name: '',
    airtableBaseId: '',
    airtableTableId: '',
    fields: []
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [showPreview, setShowPreview] = useState<boolean>(false)
  const [previewResponses, setPreviewResponses] = useState<Record<string, string | string[] | number | boolean | File[]>>({})
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    showCopyButton?: boolean
    copyText?: string
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const API_BASE = 'https://formbuilder-back.vercel.app/api/forms'

  // Stepwise flags for streamlined UI
  const canSelectBase = !!userId && bases.length > 0
  const canSelectTable = !!selectedBase
  const canConfigureFormDetails = !!selectedTable

  // Fetch bases function
  const fetchBases = async () => {
    console.log('fetch bases called with userId:', userId)
    if (!userId) return
    console.log('fetch bases working')
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE}/bases/${userId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch bases: ${response.statusText}`)
      }
      
      const data = await response.json()
      setBases(data.bases || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bases')
    } finally {
      setLoading(false)
    }
  }

  // Fetch tables when base is selected
  const fetchTables = async (baseId: string) => {
    if (!userId || !baseId) return

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE}/tables/${userId}/${baseId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch tables: ${response.statusText}`)
      }
      
      const data = await response.json()
      setTables(data.tables || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables')
    } finally {
      setLoading(false)
    }
  }

  // Fetch fields when table is selected
  const fetchFields = async (tableId: string) => {
    if (!userId || !selectedBase || !tableId) return

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE}/fields/${userId}/${selectedBase}/${tableId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch fields: ${response.statusText}`)
      }
      
      const data = await response.json()
      setFields(data.fields || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fields')
    } finally {
      setLoading(false)
    }
  }

  // Handle base selection
  const handleBaseSelect = (baseId: string) => {
    setSelectedBase(baseId)
    setSelectedTable('')
    setTables([])
    setFields([])
    setFormDefinition(prev => ({ ...prev, airtableBaseId: baseId, airtableTableId: '' }))
    
    if (baseId) {
      fetchTables(baseId)
    }
  }

  // Handle table selection
  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId)
    setFields([])
    setFormDefinition(prev => ({ ...prev, airtableTableId: tableId }))
    
    if (tableId) {
      fetchFields(tableId)
    }
  }

  // Add field to form
  const addField = (field: AirtableField) => {
    const newFormField: FormField = {
      fieldId: field.id,
      label: field.name,
      type: field.type,
      placeholder: '',
      helpText: '',
      required: false,
      options: field.options,
      conditionalLogic: { rules: [] }
    }

    setFormDefinition(prev => ({
      ...prev,
      fields: [...prev.fields, newFormField]
    }))
  }

  // Update field properties
  const updateField = (index: number, updates: Partial<FormField>) => {
    setFormDefinition(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    }))
  }

  // Remove field from form
  const removeField = (index: number) => {
    setFormDefinition(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }))
  }

  // Add conditional logic rule
  const addConditionalRule = (fieldIndex: number) => {
    const newRule: ConditionalRule = {
      fieldId: '',
      operator: 'equals',
      value: ''
    }

    setFormDefinition(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === fieldIndex 
          ? { ...field, conditionalLogic: { rules: [...field.conditionalLogic.rules, newRule] } }
          : field
      )
    }))
  }

  // Update conditional logic rule
  const updateConditionalRule = (fieldIndex: number, ruleIndex: number, updates: Partial<ConditionalRule>) => {
    setFormDefinition(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === fieldIndex 
          ? { 
              ...field, 
              conditionalLogic: { 
                rules: field.conditionalLogic.rules.map((rule, j) => 
                  j === ruleIndex ? { ...rule, ...updates } : rule
                ) 
              } 
            }
          : field
      )
    }))
  }

  // Remove conditional logic rule
  const removeConditionalRule = (fieldIndex: number, ruleIndex: number) => {
    setFormDefinition(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === fieldIndex 
          ? { 
              ...field, 
              conditionalLogic: { 
                rules: field.conditionalLogic.rules.filter((_, j) => j !== ruleIndex) 
              } 
            }
          : field
      )
    }))
  }

  // Save form
  const saveForm = async () => {
    if (!userId || !formDefinition.name.trim()) {
      setError('Please enter a form name')
      return
    }

    if (formDefinition.fields.length === 0) {
      setError('Please add at least one field to your form')
      return
    }

    // Validate conditional logic
    const validationErrors: string[] = []
    formDefinition.fields.forEach((field, index) => {
      field.conditionalLogic.rules.forEach((rule, ruleIndex) => {
        if (rule.fieldId && rule.value !== '') {
          if (!rule.fieldId.trim()) {
            validationErrors.push(`Field ${index + 1}: Conditional logic rule ${ruleIndex + 1} is missing a trigger field`)
          }
          if (rule.value === '') {
            validationErrors.push(`Field ${index + 1}: Conditional logic rule ${ruleIndex + 1} is missing a value`)
          }
        }
      })
    })

    if (validationErrors.length > 0) {
      setError('Please fix the following validation errors:\n' + validationErrors.join('\n'))
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formDefinition)
      })

      if (!response.ok) {
        throw new Error(`Failed to save form: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Show success message with form URL
      const formUrl = `https://bustbrain-formbuilder.vercel.app/form/${result.form._id}`
      setCustomAlert({
        isOpen: true,
        title: 'Form Saved Successfully!',
        message: `Your form has been saved and is ready to use.\n\nForm URL: ${formUrl}\n\nYou can share this URL with others to fill out your form.`,
        type: 'success',
        showCopyButton: true,
        copyText: formUrl
      })
      
      console.log('Form saved:', result)
      
      // Reset form
      setFormDefinition({
        name: '',
        airtableBaseId: '',
        airtableTableId: '',
        fields: []
      })
      setSelectedBase('')
      setSelectedTable('')
      setFields([])
      setTables([])
      setShowPreview(false)
      setPreviewResponses({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  // Preview functionality
  const togglePreview = () => {
    setShowPreview(!showPreview)
    if (!showPreview) {
      setPreviewResponses({})
    }
  }

  const handlePreviewInputChange = (fieldId: string, value: string | string[] | number | boolean | File[]) => {
    setPreviewResponses(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const closeAlert = () => {
    setCustomAlert(prev => ({ ...prev, isOpen: false }))
  }

  const isFieldVisibleInPreview = (field: FormField) => {
    if (field.conditionalLogic.rules.length === 0) return true
    
    return field.conditionalLogic.rules.some(rule => {
      if (!rule.fieldId || rule.value === '') return true
      
      const triggerValue = previewResponses[rule.fieldId]
      return triggerValue === rule.value
    })
  }

  const renderPreviewField = (field: FormField) => {
    const value = previewResponses[field.fieldId] || ''
    
    switch (field.type) {
      case 'shortText':
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handlePreviewInputChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )
      
      case 'longText':
        return (
          <textarea
            value={value as string}
            onChange={(e) => handlePreviewInputChange(field.fieldId, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )
      
      case 'singleSelect':
        return (
          <select
            value={value as string}
            onChange={(e) => handlePreviewInputChange(field.fieldId, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an option...</option>
            {field.options?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        )
      
      case 'multipleSelect':
        return (
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
                    handlePreviewInputChange(field.fieldId, newValues)
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{option.name}</span>
              </label>
            ))}
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
                // Store the actual File objects for preview
                handlePreviewInputChange(field.fieldId, files)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: Images, PDFs, documents. Max file size: 10MB per file.
            </p>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Form Builder</h1>
            <p className="text-lg text-gray-600">Create dynamic forms connected to your Airtable data</p>
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* User ID Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            User ID (to access your Airtable bases)
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your user ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchBases}
              disabled={!userId || loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Load Bases'}
            </button>
          </div>
        </div>

        {/* Form Configuration - appears after bases are loaded */}
        {canSelectBase && (
          <div className={`grid grid-cols-1 ${canConfigureFormDetails ? 'lg:grid-cols-2' : ''} gap-6 mb-6`}>
          {/* Base and Table Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Airtable Base & Table</h2>
            
            {/* Base Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">Base</label>
              <select
                value={selectedBase}
                onChange={(e) => handleBaseSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a base...</option>
                {bases.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Table Selection */}
            {canSelectTable && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Table</label>
                <select
                  value={selectedTable}
                  onChange={(e) => handleTableSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a table...</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Available Fields */}
            {fields.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Available Fields</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {fields.map((field) => (
                    <button
                      key={field.id}
                      onClick={() => addField(field)}
                      className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <span className="font-medium">{field.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({field.type})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Details */}
          {canConfigureFormDetails && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Details</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Form Name</label>
                <input
                  type="text"
                  value={formDefinition.name}
                  onChange={(e) => setFormDefinition(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter form name"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !formDefinition.name.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {!formDefinition.name.trim() && (
                  <p className="text-xs text-red-600 mt-1">Form name is required</p>
                )}
              </div>

              {/* Form Fields Count */}
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Fields added: <span className="font-medium">{formDefinition.fields.length}</span>
                </p>
              </div>

              {/* Preview Button */}
              {formDefinition.fields.length > 0 && (
                <button
                  onClick={togglePreview}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  {showPreview ? 'Hide Preview' : 'Preview Form'}
                </button>
              )}
            </div>
          )}
        </div>
        )}

        {/* Form Fields */}
        {formDefinition.fields.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Fields</h2>
            
            <div className="space-y-6">
              {formDefinition.fields.map((field, index) => (
                <div key={field.fieldId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Field {index + 1}</h3>
                    <button
                      onClick={() => removeField(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Field Properties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Question Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="Enter question label"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          !field.label.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {!field.label.trim() && (
                        <p className="text-xs text-red-600 mt-1">Question label is required</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Field Type</label>
                      <input
                        type="text"
                        value={field.type}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Placeholder Text</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                        placeholder="Enter placeholder text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Help Text</label>
                      <input
                        type="text"
                        value={field.helpText || ''}
                        onChange={(e) => updateField(index, { helpText: e.target.value })}
                        placeholder="Enter help text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">Required field</span>
                      </label>
                    </div>
                  </div>

                  {/* Conditional Logic */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-900">Conditional Logic</h4>
                      <button
                        onClick={() => addConditionalRule(index)}
                        className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                      >
                        + Add Rule
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-3">
                      <p>ℹ️ Conditional logic controls when this question is <strong>visible</strong> based on answers to other questions.</p>
                      <p>Example: "Show this question only when 'Department' equals 'Engineering'"</p>
                    </div>

                    {field.conditionalLogic.rules.length > 0 && (
                      <div className="space-y-3">
                        {field.conditionalLogic.rules.map((rule, ruleIndex) => (
                          <div key={ruleIndex} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                            <span className="text-sm text-gray-600">Show when</span>
                            
                            <select
                              value={rule.fieldId}
                              onChange={(e) => updateConditionalRule(index, ruleIndex, { fieldId: e.target.value })}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select field...</option>
                              {formDefinition.fields.map((f, i) => (
                                <option key={f.fieldId} value={f.fieldId} disabled={i === index}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                            
                            <span className="text-sm text-gray-600">equals</span>
                            
                            <input
                              type="text"
                              value={String(rule.value ?? '')}
                              onChange={(e) => updateConditionalRule(index, ruleIndex, { value: e.target.value })}
                              placeholder="Enter value"
                              className={`px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                rule.fieldId && rule.value === '' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                            
                            <button
                              onClick={() => removeConditionalRule(index, ruleIndex)}
                              className="text-red-600 hover:text-red-800 text-sm transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Preview */}
        {selectedTable && showPreview && formDefinition.fields.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Preview</h2>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Interactive Preview</h3>
              <p className="text-sm text-blue-700">
                This preview shows how your form will look to users. Try filling out some fields to see how conditional logic works!
              </p>
            </div>

            <div className="space-y-4">
              {formDefinition.fields.map((field) => (
                <div key={field.fieldId} className={`p-4 border rounded-md ${
                  isFieldVisibleInPreview(field) ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                }`}>
                  {isFieldVisibleInPreview(field) ? (
                    <>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.helpText && (
                        <p className="text-sm text-gray-600 mb-3">{field.helpText}</p>
                      )}

                      {renderPreviewField(field)}
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      This question is hidden based on conditional logic
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        {selectedTable && formDefinition.fields.length > 0 && (
          <div className="text-center">
            <button
              onClick={saveForm}
              disabled={saving || !formDefinition.name.trim()}
              className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {saving ? 'Saving...' : 'Save Form'}
            </button>
          </div>
        )}

        {/* Custom Alert */}
        <CustomAlert
          isOpen={customAlert.isOpen}
          onClose={closeAlert}
          title={customAlert.title}
          message={customAlert.message}
          type={customAlert.type}
          showCopyButton={customAlert.showCopyButton}
          copyText={customAlert.copyText}
        />
      </div>
    </div>
  )
}
