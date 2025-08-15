import { useState, useEffect, useCallback } from 'react'
import './App.css'

// Types for our form builder and viewer
interface AirtableBase {
  id: string
  name: string
}

interface AirtableTable {
  id: string
  name: string
}

interface AirtableField {
  id: string
  name: string
  type: 'shortText' | 'longText' | 'singleSelect' | 'multipleSelect' | 'attachment'
  options?: Array<{ id: string; name: string }>
}

interface ConditionalRule {
  fieldId: string
  operator: 'equals' | 'notEquals' | 'contains' | 'gt' | 'lt'
  value: string | number | boolean
}

interface FormField {
  fieldId: string
  label: string
  type: 'shortText' | 'longText' | 'singleSelect' | 'multipleSelect' | 'attachment'
  required: boolean
  placeholder?: string
  helpText?: string
  options?: Array<{ id: string; name: string }>
  conditionalLogic: {
    match: 'all' | 'any'
    rules: ConditionalRule[]
  }
}

interface FormDefinition {
  _id: string
  name: string
  airtableBaseId: string
  airtableTableId: string
  fields: FormField[]
}

interface FormResponse {
  [fieldId: string]: string | string[] | number | boolean
}

// Form Builder Component
function FormBuilder({ onSwitchToViewer, onSwitchToDashboard }: { onSwitchToViewer: () => void; onSwitchToDashboard: () => void }) {
  // State management
  const [userId, setUserId] = useState<string>('')
  const [bases, setBases] = useState<AirtableBase[]>([])
  const [tables, setTables] = useState<AirtableTable[]>([])
  const [availableFields, setAvailableFields] = useState<AirtableField[]>([])
  
  const [selectedBase, setSelectedBase] = useState<string>('')
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [formName, setFormName] = useState<string>('')
  const [formFields, setFormFields] = useState<FormField[]>([])
  
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showPreview, setShowPreview] = useState<boolean>(false)
  const [previewResponses, setPreviewResponses] = useState<FormResponse>({})

  // Backend API base URL
  const API_BASE = 'https://formbuilder-back.vercel.app/api'



  // Fetch bases when userId changes
  const fetchBases = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE}/forms/bases/${userId}`)
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
  }, [userId])

    // Fetch user's Airtable bases on component mount
    useEffect(() => {
      if (userId) {
        fetchBases()
      }
    }, [userId, fetchBases])

  // Fetch tables when base is selected
  const fetchTables = async (baseId: string) => {
    if (!userId || !baseId) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE}/forms/tables/${userId}/${baseId}`)
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
  const fetchFields = async (baseId: string, tableId: string) => {
    if (!userId || !baseId || !tableId) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE}/forms/fields/${userId}/${baseId}/${tableId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch fields: ${response.statusText}`)
      }
      
      const data = await response.json()
      setAvailableFields(data.fields || [])
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
    setAvailableFields([])
    setFormFields([])
    
    if (baseId) {
      fetchTables(baseId)
    }
  }

  // Handle table selection
  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId)
    setAvailableFields([])
    setFormFields([])
    
    if (tableId && selectedBase) {
      fetchFields(selectedBase, tableId)
    }
  }

  // Add field to form
  const addFieldToForm = (field: AirtableField) => {
    const newFormField: FormField = {
      fieldId: field.id,
      label: field.name,
      type: field.type,
      required: false,
      placeholder: '',
      helpText: '',
      options: field.options || [],
      conditionalLogic: {
        match: 'all',
        rules: []
      }
    }
    
    setFormFields([...formFields, newFormField])
  }

  // Remove field from form
  const removeFieldFromForm = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index))
  }

  // Update form field properties
  const updateFormField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...formFields]
    updatedFields[index] = { ...updatedFields[index], ...updates }
    setFormFields(updatedFields)
  }

  // Add conditional rule to a field
  const addConditionalRule = (fieldIndex: number) => {
    const updatedFields = [...formFields]
    const newRule: ConditionalRule = {
      fieldId: '',
      operator: 'equals',
      value: ''
    }
    
    updatedFields[fieldIndex].conditionalLogic.rules.push(newRule)
    setFormFields(updatedFields)
  }

  // Remove conditional rule from a field
  const removeConditionalRule = (fieldIndex: number, ruleIndex: number) => {
    const updatedFields = [...formFields]
    updatedFields[fieldIndex].conditionalLogic.rules.splice(ruleIndex, 1)
    setFormFields(updatedFields)
  }

  // Update conditional rule
  const updateConditionalRule = (fieldIndex: number, ruleIndex: number, updates: Partial<ConditionalRule>) => {
    const updatedFields = [...formFields]
    updatedFields[fieldIndex].conditionalLogic.rules[ruleIndex] = {
      ...updatedFields[fieldIndex].conditionalLogic.rules[ruleIndex],
      ...updates
    }
    setFormFields(updatedFields)
  }

  // Check if a field should be visible in preview based on conditional logic
  const isFieldVisibleInPreview = (field: FormField): boolean => {
    if (!field.conditionalLogic.rules.length) return true

    const results = field.conditionalLogic.rules.map(rule => {
      const triggerValue = previewResponses[rule.fieldId]
      
      switch (rule.operator) {
        case 'equals':
          return triggerValue === rule.value
        case 'notEquals':
          return triggerValue !== rule.value
        case 'contains':
          return typeof triggerValue === 'string' && triggerValue.includes(String(rule.value))
        case 'gt':
          return typeof triggerValue === 'number' && typeof rule.value === 'number' && triggerValue > rule.value
        case 'lt':
          return typeof triggerValue === 'number' && typeof rule.value === 'number' && triggerValue < rule.value
        default:
          return false
      }
    })

    return field.conditionalLogic.match === 'all' 
      ? results.every(Boolean)
      : results.some(Boolean)
  }

  // Handle preview input changes
  const handlePreviewInputChange = (fieldId: string, value: string | string[] | number | boolean) => {
    setPreviewResponses(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  // Toggle preview mode
  const togglePreview = () => {
    if (!showPreview) {
      setPreviewResponses({})
    }
    setShowPreview(!showPreview)
  }

  // Render preview field based on type
  const renderPreviewField = (field: FormField) => {
    if (!isFieldVisibleInPreview(field)) {
      return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-500 italic">
            This question is hidden based on conditional logic. 
            Answer other questions to make it visible.
          </p>
        </div>
      )
    }

    const value = previewResponses[field.fieldId] || ''

    switch (field.type) {
      case 'shortText':
        return (
          <div>
            <input
              type="text"
              value={value as string}
              onChange={(e) => handlePreviewInputChange(field.fieldId, e.target.value)}
              placeholder={field.placeholder || 'Enter your answer'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )

      case 'longText':
        return (
          <div>
            <textarea
              value={value as string}
              onChange={(e) => handlePreviewInputChange(field.fieldId, e.target.value)}
              placeholder={field.placeholder || 'Enter your answer'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )

      case 'singleSelect':
        return (
          <div>
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
                      handlePreviewInputChange(field.fieldId, newValues)
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{option.name}</span>
                </label>
              ))}
            </div>
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
                const fileNames = files.map(file => file.name)
                handlePreviewInputChange(field.fieldId, fileNames)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )

      default:
        return <div className="text-gray-500">Unsupported field type: {field.type}</div>
    }
  }

  // Save form to backend
  const saveForm = async () => {
    if (!userId || !selectedBase || !selectedTable || !formName || formFields.length === 0) {
      setError('Please fill in all required fields and add at least one field to the form')
      return
    }

    // Validate form fields
    const validationErrors: string[] = []
    
    // Check if form name is provided
    if (!formName.trim()) {
      validationErrors.push('Form name is required')
    }
    
    // Check if all form fields have required properties
    formFields.forEach((field, index) => {
      if (!field.label.trim()) {
        validationErrors.push(`Field ${index + 1}: Question label is required`)
      }
      
      // Check conditional logic rules
      field.conditionalLogic.rules.forEach((rule, ruleIndex) => {
        if (!rule.fieldId) {
          validationErrors.push(`Field ${index + 1}: Rule ${ruleIndex + 1} - Please select a question to watch`)
        }
        if (!rule.value && rule.value !== 0) {
          validationErrors.push(`Field ${index + 1}: Rule ${ruleIndex + 1} - Please enter a value`)
        }
      })
    })
    
    if (validationErrors.length > 0) {
      setError('Please fix the following validation errors:\n' + validationErrors.join('\n'))
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const formData: Omit<FormDefinition, '_id'> = {
      name: formName,
      airtableBaseId: selectedBase,
      airtableTableId: selectedTable,
      fields: formFields
    }

    try {
      const response = await fetch(`${API_BASE}/forms/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(`Failed to save form: ${response.statusText}`)
      }

      const result = await response.json()
      setSuccess(`Form "${formName}" saved successfully! Form ID: ${result.form._id}`)
      
      // Reset form
      setFormName('')
      setFormFields([])
      
      console.log('Form saved:', result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-left flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Form Builder</h1>
            <p className="text-lg text-gray-600">Create dynamic forms connected to your Airtable data</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onSwitchToViewer}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Switch to Form Viewer
            </button>
            <button
              onClick={onSwitchToDashboard}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* User ID Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
            User ID (for testing)
          </label>
          <input
            type="text"
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter your user ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
            {success}
          </div>
        )}

        {/* Base Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Select Airtable Base</h2>
          <select
            value={selectedBase}
            onChange={(e) => handleBaseSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || !userId}
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
        {selectedBase && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Select Table</h2>
            <select
              value={selectedTable}
              onChange={(e) => handleTableSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || tables.length === 0}
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
        {selectedTable && availableFields.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Available Fields</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableFields.map((field) => (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{field.name}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {field.type}
                    </span>
                  </div>
                  <button
                    onClick={() => addFieldToForm(field)}
                    className="w-full cursor-pointer bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Add to Form
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Builder */}
        {formFields.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 4: Build Your Form</h2>
            
            {/* Form Name */}
            <div className="mb-6">
              <label htmlFor="formName" className="block text-sm font-medium text-gray-700 mb-2">
                Form Name *
              </label>
              <input
                type="text"
                id="formName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter form name"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formName.trim() === '' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {formName.trim() === '' && (
                <p className="text-xs text-red-600 mt-1">Form name is required</p>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {formFields.map((field, fieldIndex) => (
                <div key={fieldIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Field {fieldIndex + 1}</h3>
                    <button
                      onClick={() => removeFieldFromForm(fieldIndex)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Field Properties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Label *
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateFormField(fieldIndex, { label: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          field.label.trim() === '' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter question label"
                      />
                      {field.label.trim() === '' && (
                        <p className="text-xs text-red-600 mt-1">Question label is required</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Type
                      </label>
                      <input
                        type="text"
                        value={field.type}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Placeholder Text
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateFormField(fieldIndex, { placeholder: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Help Text
                      </label>
                      <input
                        type="text"
                        value={field.helpText || ''}
                        onChange={(e) => updateFormField(fieldIndex, { helpText: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateFormField(fieldIndex, { required: e.target.checked })}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Required field</span>
                      </label>
                    </div>
                  </div>

                  {/* Conditional Logic */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-4">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Conditional Logic</h4>
                      <p className="text-sm text-gray-600">
                        Control when this question appears based on answers to other questions. 
                        This question will only be shown when the specified conditions are met.
                      </p>
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs text-blue-800 font-medium mb-1">Example:</p>
                        <p className="text-xs text-blue-700">
                          "Show this question when: Question 1 equals 'Yes' AND Question 2 equals 'Employee'"
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Visibility Rules:</span>
                      <button
                        onClick={() => addConditionalRule(fieldIndex)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        + Add Rule
                      </button>
                    </div>

                    {field.conditionalLogic.rules.length > 0 && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Show this question when:
                        </label>
                        <select
                          value={field.conditionalLogic.match}
                          onChange={(e) => updateFormField(fieldIndex, {
                            conditionalLogic: {
                              ...field.conditionalLogic,
                              match: e.target.value as 'all' | 'any'
                            }
                          })}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="all">ALL rules are true</option>
                          <option value="any">ANY rule is true</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-3">
                      {field.conditionalLogic.rules.map((rule, ruleIndex) => (
                        <div key={ruleIndex} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Watch this question:</label>
                            <select
                              value={rule.fieldId}
                              onChange={(e) => updateConditionalRule(fieldIndex, ruleIndex, { fieldId: e.target.value })}
                              className={`w-full px-2 py-1 border rounded-md text-sm ${
                                !rule.fieldId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                            >
                              <option value="">Select question to watch...</option>
                              {formFields.map((f, i) => (
                                <option key={i} value={f.fieldId} disabled={i === fieldIndex}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                            {!rule.fieldId && (
                              <p className="text-xs text-red-600 mt-1">Please select a question</p>
                            )}
                          </div>

                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Has this answer:</label>
                            <select
                              value={rule.operator}
                              onChange={(e) => updateConditionalRule(fieldIndex, ruleIndex, { operator: e.target.value as 'equals' | 'notEquals' | 'contains' | 'gt' | 'lt' })}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="equals">equals</option>
                              <option value="notEquals">not equals</option>
                              <option value="contains">contains</option>
                              <option value="gt">greater than</option>
                              <option value="lt">less than</option>
                            </select>
                          </div>

                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Value:</label>
                            <input
                              type="text"
                              value={String(rule.value)}
                              onChange={(e) => updateConditionalRule(fieldIndex, ruleIndex, { value: e.target.value })}
                              placeholder="Enter value"
                              className={`w-full px-2 py-1 border rounded-md text-sm ${
                                (!rule.value && rule.value !== 0) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                            {(!rule.value && rule.value !== 0) && (
                              <p className="text-xs text-red-600 mt-1">Please enter a value</p>
                            )}
                          </div>

                          <button
                            onClick={() => removeConditionalRule(fieldIndex, ruleIndex)}
                            className="text-red-600 hover:text-red-800 text-sm p-1"
                            title="Remove rule"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {field.conditionalLogic.rules.length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        No conditions set. This question will always be visible.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Save Form Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex space-x-4">
                <button
                  onClick={togglePreview}
                  disabled={!formName || formFields.length === 0}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {showPreview ? 'Hide Preview' : 'Preview Form'}
                </button>
                <button
                  onClick={saveForm}
                  disabled={loading || !formName || formFields.length === 0}
                  className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {loading ? 'Saving...' : 'Save Form'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Preview */}
        {showPreview && formFields.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Form Preview</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Preview Mode</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Live Preview
                </span>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Preview Information</h3>
              <p className="text-sm text-blue-700 mb-2">
                This is exactly how your form will appear to users. Test the conditional logic by filling out questions.
              </p>
              <p className="text-xs text-blue-600">
                Form: {formName || 'Untitled Form'} • Fields: {formFields.length}
              </p>
            </div>

            <div className="space-y-6">
              {formFields.map((field, index) => (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.helpText && (
                    <p className="text-sm text-gray-600 mb-3">{field.helpText}</p>
                  )}

                  {renderPreviewField(field)}

                  {/* Preview Field Info */}
                  <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                    <span>Type: {field.type}</span>
                    {field.required && <span className="text-red-600">• Required</span>}
                    {field.conditionalLogic.rules.length > 0 && (
                      <span className="text-purple-600">• Conditional Logic ({field.conditionalLogic.rules.length} rules)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Preview Complete</p>
                <p className="text-xs text-gray-500">
                  This is how your form will look to users. Conditional logic is working in real-time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        )}

        {/* Instructions */}
        {!userId && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-center">
            <p>Please enter a User ID to start building your form.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Form Viewer Component
function FormViewer({ onSwitchToBuilder, onSwitchToDashboard }: { onSwitchToBuilder: () => void; onSwitchToDashboard: () => void }) {
  const [formId, setFormId] = useState<string>('')
  const [form, setForm] = useState<FormDefinition | null>(null)
  const [formResponses, setFormResponses] = useState<FormResponse>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const API_BASE = 'https://formbuilder-back.vercel.app/api'

  // Check if a field should be visible based on conditional logic
  const isFieldVisible = (field: FormField): boolean => {
    if (!field.conditionalLogic.rules.length) return true

    const results = field.conditionalLogic.rules.map(rule => {
      const triggerValue = formResponses[rule.fieldId]
      
      switch (rule.operator) {
        case 'equals':
          return triggerValue === rule.value
        case 'notEquals':
          return triggerValue !== rule.value
        case 'contains':
          return typeof triggerValue === 'string' && triggerValue.includes(String(rule.value))
        case 'gt':
          return typeof triggerValue === 'number' && typeof rule.value === 'number' && triggerValue > rule.value
        case 'lt':
          return typeof triggerValue === 'number' && typeof rule.value === 'number' && triggerValue < rule.value
        default:
          return false
      }
    })

    return field.conditionalLogic.match === 'all' 
      ? results.every(Boolean)
      : results.some(Boolean)
  }

  // Count visible fields for better UX
  const visibleFields = form?.fields.filter(field => isFieldVisible(field)) || []
  const totalFields = form?.fields.length || 0

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
  const handleInputChange = (fieldId: string, value: string | string[] | number | boolean) => {
    setFormResponses(prev => ({
      ...prev,
      [fieldId]: value
    }))
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
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE}/forms/submit/${formId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: formResponses })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.statusText}`)
      }

      const result = await response.json()
      setSuccess('Form submitted successfully!')
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
    if (!isFieldVisible(field)) {
      return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-500 italic">
            This question is hidden based on conditional logic. 
            Answer other questions to make it visible.
          </p>
        </div>
      )
    }

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

      case 'attachment':
        return (
          <div>
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                const fileUrls = files.map(file => URL.createObjectURL(file))
                handleInputChange(field.fieldId, fileUrls)
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
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
          <div className="text-left flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Form Viewer</h1>
            <p className="text-lg text-gray-600">Fill out and submit forms</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onSwitchToBuilder}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Switch to Form Builder
            </button>
            <button
              onClick={onSwitchToDashboard}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Form ID Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="formId" className="block text-sm font-medium text-gray-700 mb-2">
            Form ID
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="formId"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              placeholder="Enter form ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchForm}
              disabled={!formId || loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Load Form'}
            </button>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
            {success}
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
                Showing {visibleFields.length} of {totalFields} questions
              </p>
            </div>
            
            {/* Validation Summary */}
            {(() => {
              const requiredFields = visibleFields.filter(field => field.required)
              const filledRequiredFields = requiredFields.filter(field => {
                const value = formResponses[field.fieldId]
                return value && (Array.isArray(value) ? value.length > 0 : (typeof value === 'string' ? value.trim() !== '' : true))
              })
              
              if (requiredFields.length > 0) {
                return (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="text-sm font-medium text-green-800 mb-2">📋 Form Progress</h3>
                    <p className="text-sm text-green-700 mb-2">
                      Required fields: {filledRequiredFields.length} of {requiredFields.length} completed
                    </p>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${requiredFields.length > 0 ? (filledRequiredFields.length / requiredFields.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )
              }
              return null
            })()}

            <form className="space-y-6">
              {form.fields.map((field) => (
                <div key={field.fieldId} className="border-b border-gray-200 pb-6 last:border-b-0">
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

        {/* Instructions */}
        {!form && !loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-center">
            <p>Enter a Form ID and click "Load Form" to start filling out a form.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Dashboard Component
function Dashboard({ onSwitchToBuilder, onSwitchToViewer }: { onSwitchToBuilder: () => void; onSwitchToViewer: () => void }) {
  const [userId, setUserId] = useState<string>('')
  const [forms, setForms] = useState<FormDefinition[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [selectedForm, setSelectedForm] = useState<FormDefinition | null>(null)
  const [showFormDetails, setShowFormDetails] = useState<boolean>(false)

  const API_BASE = 'https://formbuilder-back.vercel.app/api'

  // Fetch user's forms
  const fetchForms = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    setError('')
    
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
  }, [userId])

  // Fetch forms when userId changes
  useEffect(() => {
    if (userId) {
      fetchForms()
    }
  }, [userId, fetchForms])

  // Delete form
  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/forms/${formId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete form: ${response.statusText}`)
      }

      // Remove form from local state
      setForms(forms.filter(form => form._id !== formId))
      setSelectedForm(null)
      setShowFormDetails(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form')
    }
  }

  // View form details
  const viewFormDetails = (form: FormDefinition) => {
    setSelectedForm(form)
    setShowFormDetails(true)
  }

  // Close form details
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
          <div className="text-left flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Forms Dashboard</h1>
            <p className="text-lg text-gray-600">Manage and view all your saved forms</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onSwitchToBuilder}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Create New Form
            </button>
            <button
              onClick={onSwitchToViewer}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              View Forms
            </button>
          </div>
        </div>

        {/* User ID Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="dashboardUserId" className="block text-sm font-medium text-gray-700 mb-2">
            User ID (to load your forms)
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="dashboardUserId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your user ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchForms}
              disabled={!userId || loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Load Forms'}
            </button>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        {forms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalForms}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Fields</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFields}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">With Conditional Logic</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.formsWithConditionalLogic}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forms List */}
        {forms.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Your Forms</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {forms.map((form) => (
                <div key={form._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{form.name}</h3>
                        {form.fields.some(field => field.conditionalLogic.rules.length > 0) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Conditional Logic
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} • 
                        Base: {form.airtableBaseId} • 
                        Table: {form.airtableTableId}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Form ID: {form._id}
                      </p>
                    </div>
                    <div className="flex space-x-2">
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
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading forms...</p>
          </div>
        )}

        {/* No Forms State */}
        {!loading && forms.length === 0 && userId && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No forms found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first form.</p>
            <div className="mt-6">
              <button
                onClick={onSwitchToBuilder}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Create Form
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!userId && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-center">
            <p>Please enter a User ID to view your saved forms.</p>
          </div>
        )}

        {/* Form Details Modal */}
        {showFormDetails && selectedForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Form Details: {selectedForm.name}</h3>
                <button
                  onClick={closeFormDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Form Information</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600"><span className="font-medium">Name:</span> {selectedForm.name}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Base ID:</span> {selectedForm.airtableBaseId}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Table ID:</span> {selectedForm.airtableTableId}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Fields:</span> {selectedForm.fields.length}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Fields</h4>
                  <div className="space-y-2">
                    {selectedForm.fields.map((field, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{field.label}</p>
                            <p className="text-xs text-gray-600">Type: {field.type}</p>
                            {field.required && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                          </div>
                          {field.conditionalLogic.rules.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Conditional
                            </span>
                          )}
                        </div>
                        {field.conditionalLogic.rules.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <p>Rules: {field.conditionalLogic.rules.length} • Match: {field.conditionalLogic.match}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeFormDetails}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Main App Component
function App() {
  const [viewMode, setViewMode] = useState<'builder' | 'viewer' | 'dashboard'>('builder')

  const switchToBuilder = () => setViewMode('builder')
  const switchToViewer = () => setViewMode('viewer')
  const switchToDashboard = () => setViewMode('dashboard')

  return (
    <>
      {viewMode === 'builder' ? (
        <FormBuilder onSwitchToViewer={switchToViewer} onSwitchToDashboard={switchToDashboard} />
      ) : viewMode === 'viewer' ? (
        <FormViewer onSwitchToBuilder={switchToBuilder} onSwitchToDashboard={switchToDashboard} />
      ) : (
        <Dashboard onSwitchToBuilder={switchToBuilder} onSwitchToViewer={switchToViewer} />
      )}
    </>
  )
}

export default App