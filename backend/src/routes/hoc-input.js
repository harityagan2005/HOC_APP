const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { validateReportInput } = require('../utils/validation');

// Get all reports (with pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    try {
      let query = 'SELECT * FROM hoc_input';
      let countQuery = 'SELECT COUNT(*) as total FROM hoc_input';
      const params = [];

      // If user is not admin, show only their reports
      if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
        query += ' WHERE reported_by = ?';
        countQuery += ' WHERE reported_by = ?';
        params.push(req.user.id);
      }

      query += ' ORDER BY created_date DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [reports] = await connection.query(query, params);
      const [countResult] = await connection.query(countQuery, params.slice(0, -2));

      sendSuccess(
        res,
        {
          reports,
          pagination: {
            page,
            limit,
            total: countResult[0].total,
            pages: Math.ceil(countResult[0].total / limit)
          }
        },
        'Reports retrieved successfully',
        200
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching reports:', error);
    sendError(res, error.message, 500);
  }
});

// Get single report by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      const [reports] = await connection.query(
        'SELECT * FROM hoc_input WHERE job_id = ?',
        [id]
      );

      if (reports.length === 0) {
        return sendError(res, 'Report not found', 404);
      }

      const report = reports[0];

      // Check if user has permission to view
      if (req.user.role !== 'Admin' && req.user.role !== 'admin' && report.reported_by !== req.user.id) {
        return sendError(res, 'Unauthorized', 403);
      }

      sendSuccess(res, report, 'Report retrieved successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    sendError(res, error.message, 500);
  }
});

// Create new report
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Validate input
    const validation = validateReportInput(req.body);
    if (!validation.isValid) {
      return sendError(res, 'Validation failed', 400, validation.errors);
    }

    const connection = await pool.getConnection();

    try {
      const {
        job_req_for,
        company,
        observer_name,
        observation_date,
        location_id,
        area_id,
        status_id,
        category_id,
        action_department_id,
        oper_act,
        observations,
        corrective_actions,
        accountable_person,
        responsible_person,
        hod,
        image_url,
        stop_job,
        end_date,
        remarks,
        severity,
        fy_year
      } = req.body;

      const [result] = await connection.query(
        `INSERT INTO hoc_input (
          job_req_for, company, observer_name, observation_date, 
          location_id, area_id, status_id, category_id, action_department_id,
          oper_act, observations, corrective_actions,
          accountable_person, responsible_person, hod,
          image_url, stop_job, end_date, remarks, severity, fy_year, reported_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          job_req_for, company, observer_name, observation_date || new Date().toISOString().split('T')[0],
          location_id, area_id, status_id, category_id, action_department_id,
          oper_act, observations, corrective_actions,
          accountable_person, responsible_person, hod,
          image_url, stop_job || 'No', end_date, remarks, severity || 'Low', fy_year, req.user.id
        ]
      );

      sendSuccess(
        res,
        { job_id: result.insertId },
        'Report created successfully',
        201
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating report:', error);
    sendError(res, error.message, 500);
  }
});

// Update report
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      // Check if report exists and user has permission
      const [reports] = await connection.query(
        'SELECT reported_by FROM hoc_input WHERE job_id = ?',
        [id]
      );

      if (reports.length === 0) {
        return sendError(res, 'Report not found', 404);
      }

      if (req.user.role !== 'Admin' && req.user.role !== 'admin' && reports[0].reported_by !== req.user.id) {
        return sendError(res, 'Unauthorized to update this report', 403);
      }

      // Build update query dynamically
      const allowedFields = [
        'job_req_for', 'company', 'observer_name', 'location_id', 'area_id',
        'status_id', 'category_id', 'action_department_id', 'oper_act',
        'observations', 'corrective_actions', 'accountable_person',
        'responsible_person', 'hod', 'image_url', 'stop_job', 'end_date',
        'remarks', 'severity', 'fy_year'
      ];

      const updates = [];
      const values = [];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      });

      if (updates.length === 0) {
        return sendError(res, 'No valid fields to update', 400);
      }

      values.push(id);
      const updateQuery = `UPDATE hoc_input SET modified_date = NOW(), ${updates.join(', ')} WHERE job_id = ?`;

      await connection.query(updateQuery, values);

      sendSuccess(res, null, 'Report updated successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating report:', error);
    sendError(res, error.message, 500);
  }
});

// Delete report (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
      return sendError(res, 'Admin access required', 403);
    }

    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      const [result] = await connection.query(
        'DELETE FROM hoc_input WHERE job_id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return sendError(res, 'Report not found', 404);
      }

      sendSuccess(res, null, 'Report deleted successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting report:', error);
    sendError(res, error.message, 500);
  }
});

module.exports = router;
