/**
 * Airtable integration endpoints for fetching bases, tables, and fields.
 *
 * All endpoints require a `userId` path parameter so the backend can look up
 * the stored Airtable access token from MongoDB and make authenticated
 * requests to Airtable's REST API on behalf of the user.
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

const User = require('../models/User');
const Form = require('../models/Form');
const { ensureConnection } = require('../db/connectDB');

/**
 * Helper: fetch the user's Airtable access token by MongoDB user id.
 * Throws an Error with statusCode if not found or not configured.
 */
async function getUserAccessTokenById(userId) {
	if (!userId) {
		const err = new Error('User id is required');
		err.statusCode = 400;
		throw err;
	}

	// Ensure database connection is active
	await ensureConnection();

	const user = await User.findById(userId).select('+airtableAccessToken');
	if (!user || !user.airtableAccessToken) {
		const err = new Error('Airtable access token not found for user');
		err.statusCode = 404;
		throw err;
	}

	return user.airtableAccessToken;
}

/**
 * GET /api/bases/:userId
 *
 * Returns the list of bases the authenticated user has access to.
 */
router.get('/bases/:userId', async (req, res) => {
	const { userId } = req.params;

	try {
		const token = await getUserAccessTokenById(userId);

		const response = await axios.get('https://api.airtable.com/v0/meta/bases', {
			headers: { Authorization: `Bearer ${token}` },
			timeout: 15_000,
		});

		if (!response || response.status < 200 || response.status >= 300) {
			throw new Error(`Failed to fetch bases with status ${response && response.status}`);
		}

		// Shape the response to a compact list
		const bases = Array.isArray(response.data?.bases)
			? response.data.bases.map((b) => ({ id: b.id, name: b.name }))
			: [];

		return res.status(200).json({ bases });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error fetching Airtable bases:', error.response?.data || error.message || error);
		const status = error.statusCode || error.response?.status || 500;
		return res.status(status).json({ message: 'Unable to fetch bases', error: error.message });
	}
});

/**
 * GET /api/tables/:userId/:baseId
 *
 * Returns the list of tables for the specified base.
 */
router.get('/tables/:userId/:baseId', async (req, res) => {
	const { userId, baseId } = req.params;

	if (!baseId) {
		return res.status(400).json({ message: 'Base id is required' });
	}

	try {
		const token = await getUserAccessTokenById(userId);

		const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables`;
		const response = await axios.get(url, {
			headers: { Authorization: `Bearer ${token}` },
			timeout: 15_000,
		});

		if (!response || response.status < 200 || response.status >= 300) {
			throw new Error(`Failed to fetch tables with status ${response && response.status}`);
		}

		const tables = Array.isArray(response.data?.tables)
			? response.data.tables.map((t) => ({ id: t.id, name: t.name }))
			: [];

		return res.status(200).json({ tables });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error fetching Airtable tables:', error.response?.data || error.message || error);
		const status = error.statusCode || error.response?.status || 500;
		return res.status(status).json({ message: 'Unable to fetch tables', error: error.message });
	}
});

/**
 * GET /api/fields/:userId/:baseId/:tableId
 *
 * Returns filtered fields for the specified table. Only includes types allowed
 * by the assignment: "shortText", "longText", "singleSelect", "multipleSelect",
 * and "attachment".
 */
router.get('/fields/:userId/:baseId/:tableId', async (req, res) => {
	const { userId, baseId, tableId } = req.params;

	if (!baseId || !tableId) {
		return res.status(400).json({ message: 'Base id and table id are required' });
	}

	// Map Airtable field types to assignment-specific types; return null to exclude
	function mapFieldType(airtableType) {
		switch (airtableType) {
			case 'singleLineText':
				return 'shortText';
			case 'multilineText':
				return 'longText';
			case 'singleSelect':
				return 'singleSelect';
			case 'multipleSelects':
				return 'multipleSelect';
			case 'multipleAttachments':
				return 'attachment';
			default:
				return null;
		}
	}

	try {
		const token = await getUserAccessTokenById(userId);
		const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables`;
		const response = await axios.get(url, {
			headers: { Authorization: `Bearer ${token}` },
			timeout: 15_000,
		});

		if (!response || response.status < 200 || response.status >= 300) {
			throw new Error(`Failed to fetch tables metadata with status ${response && response.status}`);
		}

		const tables = Array.isArray(response.data?.tables) ? response.data.tables : [];
		const table = tables.find((t) => t.id === tableId);
		if (!table) {
			return res.status(404).json({ message: 'Table not found in the specified base' });
		}

		const filteredFields = Array.isArray(table.fields)
			? table.fields
					.map((f) => {
						const mappedType = mapFieldType(f.type);
						if (!mappedType) return null;

						// Extract choices for select fields if present
						let options = undefined;
						if (mappedType === 'singleSelect' || mappedType === 'multipleSelect') {
							const choices = f.options?.choices || f.typeOptions?.choices || [];
							options = choices.map((c) => ({ id: c.id || c.value || c.name, name: c.name || c.label || String(c) }));
						}

						return {
							id: f.id,
							name: f.name,
							type: mappedType,
							options,
						};
					})
					.filter(Boolean)
			: [];

		return res.status(200).json({ fields: filteredFields });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error fetching Airtable fields:', error.response?.data || error.message || error);
		const status = error.statusCode || error.response?.status || 500;
		return res.status(status).json({ message: 'Unable to fetch fields', error: error.message });
	}
});

/**
 * POST /api/forms/:userId
 *
 * Create and save a new form definition for the specified user. The payload is
 * expected to match the `Form` model shape.
 * {
 *   name: string,
 *   airtableBaseId: string,
 *   airtableTableId: string,
 *   fields: Array<{ fieldId: string, label: string, type: string, required?: boolean, placeholder?: string, helpText?: string, options?: string[], conditionalLogic?: { match?: 'all'|'any', rules?: Array<{ fieldId: string, operator: string, value: any }> } }>
 * }
 */
router.post('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, airtableBaseId, airtableTableId, fields } = req.body || {};

    try {
        // Basic validation
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }
        if (!name || !airtableBaseId || !airtableTableId) {
            return res.status(400).json({ message: 'name, airtableBaseId and airtableTableId are required' });
        }
        if (!Array.isArray(fields)) {
            return res.status(400).json({ message: 'fields must be an array' });
        }

        // Ensure database connection is active
        await ensureConnection();

        // Optionally ensure user exists for clearer error messages
        const userExists = await User.exists({ _id: userId });
        if (!userExists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const form = new Form({
            user: userId,
            airtableBaseId,
            airtableTableId,
            name,
            fields,
        });

        const saved = await form.save();
        return res.status(201).json({ form: saved });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error creating form:', error);
        const status = error.statusCode || 500;
        return res.status(status).json({ message: 'Unable to create form', error: error.message });
    }
});

/**
 * GET /api/forms/user/:userId
 *
 * Retrieve all forms created by a specific user.
 */
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        // Ensure database connection is active
        await ensureConnection();

        const forms = await Form.find({ user: userId }).sort({ createdAt: -1 });
        return res.status(200).json({ forms });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching user forms:', error);
        const status = error.statusCode || 500;
        return res.status(status).json({ message: 'Unable to fetch user forms', error: error.message });
    }
});

/**
 * GET /api/forms/:formId
 *
 * Retrieve a single form by its identifier. Intended for the Form Viewer.
 */
router.get('/:formId', async (req, res) => {
    const { formId } = req.params;

    try {
        if (!formId) {
            return res.status(400).json({ message: 'formId is required' });
        }

        // Ensure database connection is active
        await ensureConnection();

        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({ message: 'Form not found' });
        }

        return res.status(200).json({ form });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching form by id:', error);
        const status = error.statusCode || 500;
        return res.status(status).json({ message: 'Unable to fetch form', error: error.message });
    }
});

/**
 * POST /api/forms/submit/:formId
 *
 * Handle form submissions by creating a new record in the Airtable table that
 * the form is bound to. The request body should include `data`, an object that
 * maps Airtable field names (or compatible identifiers) to submitted values.
 *
 * Example payload:
 * { data: { "Name": "Alice", "Notes": "Hello", "Photos": [{ url: "https://..." }], "Status": "New" } }
 */
router.post('/submit/:formId', async (req, res) => {
    const { formId } = req.params;
    const { data } = req.body || {};

    try {
        if (!formId) {
            return res.status(400).json({ message: 'formId is required' });
        }
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ message: 'submission payload `data` is required and must be an object' });
        }

        // Ensure database connection is active
        await ensureConnection();

        // 1) Find the saved form in our DB to get baseId, tableId, and creator user
        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({ message: 'Form not found' });
        }

        const baseId = form.airtableBaseId;
        const tableId = form.airtableTableId;
        const creatorUserId = String(form.user);

        if (!baseId || !tableId || !creatorUserId) {
            return res.status(500).json({ message: 'Form is missing Airtable binding or creator reference' });
        }

        // 2) Retrieve the creator's access token
        const accessToken = await getUserAccessTokenById(creatorUserId);

        // 3) Prepare the Airtable records payload.
        // We assume `data` keys correspond to Airtable field names. If your app
        // stores Airtable field IDs instead, translate here using `form.fields`.
        const fieldsPayload = { ...data };

        // Process attachments: skip attachment fields for now as Airtable requires public URLs
        const skippedAttachments = [];
        for (const [fieldName, fieldValue] of Object.entries(fieldsPayload)) {
            if (Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0].base64) {
                // Skip attachment fields as Airtable requires public URLs
                skippedAttachments.push(fieldName);
                delete fieldsPayload[fieldName];
            }
        }

        const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`;
        const response = await axios.post(
            url,
            { fields: fieldsPayload, typecast: true },
            { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20_000 }
        );

        if (!response || response.status < 200 || response.status >= 300) {
            throw new Error(`Failed to create Airtable record with status ${response && response.status}`);
        }

        const responseData = { record: response.data };
        if (skippedAttachments.length > 0) {
            responseData.warning = `Attachment fields (${skippedAttachments.join(', ')}) were skipped. Airtable requires public URLs for attachments.`;
        }

        return res.status(201).json(responseData);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error submitting form to Airtable:', error.response?.data || error.message || error);
        const status = error.statusCode || error.response?.status || 500;
        return res.status(status).json({ message: 'Unable to submit form', error: error.message });
    }
});

/**
 * DELETE /api/forms/:formId
 *
 * Delete a form by its ID. This will remove the form from the database.
 */
router.delete('/:formId', async (req, res) => {
    const { formId } = req.params;

    try {
        if (!formId) {
            return res.status(400).json({ message: 'formId is required' });
        }

        // Ensure database connection is active
        await ensureConnection();

        const form = await Form.findByIdAndDelete(formId);
        if (!form) {
            return res.status(404).json({ message: 'Form not found' });
        }

        return res.status(200).json({ message: 'Form deleted successfully' });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error deleting form:', error);
        const status = error.statusCode || 500;
        return res.status(status).json({ message: 'Unable to delete form', error: error.message });
    }
});

module.exports = router;


