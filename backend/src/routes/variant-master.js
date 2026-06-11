const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

// Get all variants
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query; // Filter by type: location, area, status, category
    const connection = await pool.getConnection();

    try {
      let query = 'SELECT * FROM variant_master';
      const params = [];

      if (type) {
        query += ' WHERE variant_type = ?';
        params.push(type);
      }

      query += ' ORDER BY variant_type, variant_name ASC';

      const [variants] = await connection.query(query, params);
      sendSuccess(res, variants, 'Variants retrieved successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching variants:', error);
    sendError(res, error.message, 500);
  }
});

// Get single variant
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      const [variants] = await connection.query(
        'SELECT * FROM variant_master WHERE id = ?',
        [id]
      );

      if (variants.length === 0) {
        return sendError(res, 'Variant not found', 404);
      }

      sendSuccess(res, variants[0], 'Variant retrieved successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching variant:', error);
    sendError(res, error.message, 500);
  }
});

// Create variant (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { variant_type, variant_name, variant_code, description } = req.body;

    if (!variant_type || !variant_name) {
      return sendError(res, 'Variant type and name are required', 400);
    }

    const connection = await pool.getConnection();

    try {
      const [result] = await connection.query(
        'INSERT INTO variant_master (variant_type, variant_name, variant_code, description) VALUES (?, ?, ?, ?)',
        [variant_type, variant_name, variant_code || null, description || null]
      );

      sendSuccess(
        res,
        { id: result.insertId },
        'Variant created successfully',
        201
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating variant:', error);
    sendError(res, error.message, 500);
  }
});

// Update variant (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { variant_type, variant_name, variant_code, description } = req.body;

    const connection = await pool.getConnection();

    try {
      const updates = [];
      const values = [];

      if (variant_type) {
        updates.push('variant_type = ?');
        values.push(variant_type);
      }
      if (variant_name) {
        updates.push('variant_name = ?');
        values.push(variant_name);
      }
      if (variant_code !== undefined) {
        updates.push('variant_code = ?');
        values.push(variant_code);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (updates.length === 0) {
        return sendError(res, 'No fields to update', 400);
      }

      values.push(id);
      const updateQuery = `UPDATE variant_master SET ${updates.join(', ')} WHERE id = ?`;

      const [result] = await connection.query(updateQuery, values);

      if (result.affectedRows === 0) {
        return sendError(res, 'Variant not found', 404);
      }

      sendSuccess(res, null, 'Variant updated successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating variant:', error);
    sendError(res, error.message, 500);
  }
});

// Delete variant (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      const [result] = await connection.query(
        'DELETE FROM variant_master WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return sendError(res, 'Variant not found', 404);
      }

      sendSuccess(res, null, 'Variant deleted successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting variant:', error);
    sendError(res, error.message, 500);
  }
});

module.exports = router;
