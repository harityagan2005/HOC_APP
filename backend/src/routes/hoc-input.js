const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { validateReportInput } = require('../utils/validation');
const { sendReportAssignmentEmail } = require('../utils/emailService');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const LIST_SELECT = `
  SELECT h.*,
    loc.variant_name  AS location_name,
    area.variant_name AS area_name,
    stat.variant_name AS status_name,
    cat.variant_name  AS category_name,
    dept.variant_name AS department_name,
    u.name            AS reporter_name,
    u.employee_id     AS reporter_emp_id
  FROM hoc_input h
  LEFT JOIN variant_master loc  ON h.location_id          = loc.id
  LEFT JOIN variant_master area ON h.area_id               = area.id
  LEFT JOIN variant_master stat ON h.status_id             = stat.id
  LEFT JOIN variant_master cat  ON h.category_id           = cat.id
  LEFT JOIN variant_master dept ON h.action_department_id  = dept.id
  LEFT JOIN users u             ON h.reported_by            = u.id
`;

// Upload image
router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return sendError(res, 'No image file provided', 400);
  const host = req.protocol + '://' + req.get('host');
  const url = `${host}/uploads/${req.file.filename}`;
  sendSuccess(res, { url, filename: req.file.filename }, 'Image uploaded successfully', 201);
});

// Get all reports (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page     = parseInt(req.query.page)     || 1;
    const limit    = parseInt(req.query.limit)    || 20;
    const severity = req.query.severity || null;
    const search   = req.query.search   || null;
    const status   = req.query.status   || null;
    const dateFrom = req.query.dateFrom || null;
    const dateTo   = req.query.dateTo   || null;
    const offset   = (page - 1) * limit;

    const connection = await pool.getConnection();
    try {
      const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';

      const conditions = [];
      const params     = [];

      if (severity) {
        conditions.push('h.severity = ?');
        params.push(severity);
      }
      if (search) {
        conditions.push('(h.job_req_for LIKE ? OR h.observations LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      if (status) {
        conditions.push('h.status_id IN (SELECT id FROM variant_master WHERE LOWER(variant_name) = LOWER(?))');
        params.push(status);
      }
      if (dateFrom) {
        conditions.push('CAST(h.created_date AS DATE) >= ?');
        params.push(dateFrom);
      }
      if (dateTo) {
        conditions.push('CAST(h.created_date AS DATE) <= ?');
        params.push(dateTo);
      }

      const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';

      const countBase  = `SELECT COUNT(*) as total FROM hoc_input h${where}`;
      const [countRes] = await connection.query(countBase, params);
      const total      = countRes[0].total;

      const listQuery = LIST_SELECT + where + ' ORDER BY h.created_date DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY';
      const [reports] = await connection.query(listQuery, [...params, offset, limit]);

      sendSuccess(res, {
        reports,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }, 'Reports retrieved successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching reports:', error);
    sendError(res, error.message, 500);
  }
});

// Get single report
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [reports] = await connection.query(
        LIST_SELECT + ' WHERE h.job_id = ?',
        [id]
      );

      if (reports.length === 0) return sendError(res, 'Report not found', 404);

      const report = reports[0];
      sendSuccess(res, report, 'Report retrieved successfully', 200);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    sendError(res, error.message, 500);
  }
});

// Create report
router.post('/', authMiddleware, async (req, res) => {
  try {
    const validation = validateReportInput(req.body);
    if (!validation.isValid) return sendError(res, 'Validation failed', 400, validation.errors);

    const connection = await pool.getConnection();
    try {
      const {
        job_req_for, company, observer_name, observation_date,
        location_id, area_id, status_id, category_id, action_department_id,
        oper_act, observations, corrective_actions,
        accountable_person, accountable_person_email, responsible_person, hod,
        image_url, stop_job, end_date, remarks, severity, fy_year
      } = req.body;

      const [result] = await connection.query(
        `INSERT INTO hoc_input (
          job_req_for, company, observer_name, observation_date,
          location_id, area_id, status_id, category_id, action_department_id,
          oper_act, observations, corrective_actions,
          accountable_person, accountable_person_email, responsible_person, hod,
          image_url, stop_job, end_date, remarks, severity, fy_year, reported_by
        ) OUTPUT INSERTED.job_id VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          job_req_for, company, observer_name,
          observation_date || new Date().toISOString().split('T')[0],
          location_id, area_id, status_id, category_id, action_department_id,
          oper_act, observations, corrective_actions,
          accountable_person, accountable_person_email || null, responsible_person, hod,
          image_url, stop_job || 'No', end_date, remarks, severity || 'Low', fy_year, req.user.id
        ]
      );

      const reportId = result.insertId;
      sendSuccess(res, { job_id: reportId }, 'Report created successfully', 201);

      // Send email non-blocking — after response is already sent
      if (accountable_person_email) {
        sendReportAssignmentEmail({
          reportId,
          report: {
            job_req_for, company, observer_name, observation_date,
            observations, corrective_actions, accountable_person,
            accountable_person_email, responsible_person, severity,
            stop_job: stop_job || 'No', end_date, remarks, fy_year,
          },
        }).catch(err => console.error('Email send error:', err.message));
      }
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
      const [existing] = await connection.query(
        'SELECT reported_by FROM hoc_input WHERE job_id = ?', [id]
      );
      if (existing.length === 0) return sendError(res, 'Report not found', 404);

      const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';
      if (!isAdmin && existing[0].reported_by !== req.user.id) {
        return sendError(res, 'Unauthorized to update this report', 403);
      }

      const allowed = [
        'job_req_for', 'company', 'observer_name', 'location_id', 'area_id',
        'status_id', 'category_id', 'action_department_id', 'oper_act',
        'observations', 'corrective_actions', 'accountable_person',
        'accountable_person_email', 'responsible_person', 'hod', 'image_url',
        'stop_job', 'end_date', 'remarks', 'severity', 'fy_year'
      ];
      const updates = [];
      const values  = [];
      allowed.forEach(f => {
        if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
      });

      if (updates.length === 0) return sendError(res, 'No valid fields to update', 400);

      values.push(id);
      await connection.query(
        `UPDATE hoc_input SET modified_date = GETDATE(), ${updates.join(', ')} WHERE job_id = ?`,
        values
      );

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
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'admin';
    if (!isAdmin) return sendError(res, 'Admin access required', 403);

    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query('DELETE FROM hoc_input WHERE job_id = ?', [id]);
      if (result.affectedRows === 0) return sendError(res, 'Report not found', 404);
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
