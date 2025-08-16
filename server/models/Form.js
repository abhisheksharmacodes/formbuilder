/**
 * Form model
 *
 * Represents a form definition bound to a specific Airtable base and table,
 * authored by a particular user. Stores the fields and any conditional logic
 * required to render and validate the form on the client.
 */

const mongoose = require('mongoose');

// A single conditional rule that can toggle visibility or requirements
const ConditionalRuleSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true }, // The field this condition refers to
    operator: { type: String, required: true }, // e.g. 'equals', 'notEquals', 'contains', 'gt', etc.
    value: { type: mongoose.Schema.Types.Mixed, required: true }, // The value to compare against
  },
  { _id: false }
);

// Definition of an individual form field
const FormFieldSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true }, // Stable identifier for the field (e.g. slug or Airtable field id)
    label: { type: String, required: true },
    type: { type: String, required: true }, // e.g. text, number, select, date, etc.
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    helpText: { type: String },
    options: [{
      id: { type: String, required: true },
      name: { type: String, required: true }
    }], // For select-like fields

    // Conditional logic for this field
    conditionalLogic: {
      match: { type: String, enum: ['all', 'any'], default: 'all' },
      rules: { type: [ConditionalRuleSchema], default: [] },
    },
  },
  { _id: false }
);

const FormSchema = new mongoose.Schema(
  {
    // Author/owner of the form
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Airtable binding
    airtableBaseId: { type: String, required: true },
    airtableTableId: { type: String, required: true },

    // A human-friendly name for the form
    name: { type: String, required: true },

    // The list of fields that define this form's shape and behavior
    fields: { type: [FormFieldSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Form', FormSchema);


