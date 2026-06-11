const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../utils/response');

// Get all employees
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    try {
      const [employees] = await connection.query(
        'SELECT id, employee_id, name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC'
      );

      sendSuccess(res, employees, 'Employees retrieved successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    sendError(res, error.message, 500);
  }
});

// Get single employee
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      const [employees] = await connection.query(
        'SELECT id, employee_id, name, email, phone, role, is_active, created_at FROM users WHERE id = ?',
        [id]
      );

      if (employees.length === 0) {
        return sendError(res, 'Employee not found', 404);
      }

      sendSuccess(res, employees[0], 'Employee retrieved successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching employee:', error);
    sendError(res, error.message, 500);
  }
});

// Add new employee
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { employee_id, name, email, phone, password, role } = req.body;

    // Validate required fields
    if (!employee_id || !name || !email || !phone || !password) {
      return sendError(res, 'All fields are required', 400);
    }

    const connection = await pool.getConnection();

    try {
      // Check if employee already exists
      const [existing] = await connection.query(
        'SELECT id FROM users WHERE employee_id = ? OR email = ?',
        [employee_id, email]
      );

      if (existing.length > 0) {
        return sendError(res, 'Employee ID or email already exists', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await connection.query(
        `INSERT INTO users (employee_id, name, email, phone, password, role, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [employee_id, name, email, phone, hashedPassword, role || 'User']
      );

      sendSuccess(
        res,
        { id: result.insertId },
        'Employee added successfully',
        201
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding employee:', error);
    sendError(res, error.message, 500);
  }
});

// Update employee
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, is_active } = req.body;

    const connection = await pool.getConnection();

    try {
      const updates = [];
      const values = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (email) {
        updates.push('email = ?');
        values.push(email);
      }
      if (phone) {
        updates.push('phone = ?');
        values.push(phone);
      }
      if (role) {
        updates.push('role = ?');
        values.push(role);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active);
      }

      if (updates.length === 0) {
        return sendError(res, 'No fields to update', 400);
      }

      values.push(id);
      const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

      const [result] = await connection.query(updateQuery, values);

      if (result.affectedRows === 0) {
        return sendError(res, 'Employee not found', 404);
      }

      sendSuccess(res, null, 'Employee updated successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating employee:', error);
    sendError(res, error.message, 500);
  }
});

// Delete employee
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      const [result] = await connection.query(
        'DELETE FROM users WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return sendError(res, 'Employee not found', 404);
      }

      sendSuccess(res, null, 'Employee deleted successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    sendError(res, error.message, 500);
  }
});

module.exports = router;
