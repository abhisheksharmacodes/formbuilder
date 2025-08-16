// Shared TypeScript interfaces for the form builder application

export interface AirtableBase {
  id: string
  name: string
}

export interface AirtableTable {
  id: string
  name: string
}

export interface AirtableField {
  id: string
  name: string
  type: string
  options?: Array<{ id: string; name: string }>
}

export interface ConditionalRule {
  fieldId: string
  operator: string
  value: string | number | boolean | undefined
}

export interface ConditionalLogic {
  rules: ConditionalRule[]
}

export interface FormField {
  fieldId: string
  label: string
  type: string
  placeholder?: string
  helpText?: string
  required: boolean
  options?: Array<{ id: string; name: string }>
  conditionalLogic: ConditionalLogic
}

export interface FormDefinition {
  name: string
  airtableBaseId: string
  airtableTableId: string
  fields: FormField[]
}

export interface FormDefinitionWithId extends FormDefinition {
  _id: string
  createdAt: string
  updatedAt: string
}

export type FormResponse = Record<string, string | string[] | number | boolean | File[]>
