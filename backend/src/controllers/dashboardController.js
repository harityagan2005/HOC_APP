const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

// Get user dashboard data
const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query(
        'SELECT id, name, employee_id, role FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return sendError(res, 'User not found', 404);
      }

      const [reports] = await connection.query(
        `SELECT h.job_id, h.job_req_for, h.observations, h.severity, h.created_date,
          u.name AS reporter_name
         FROM hoc_input h
         LEFT JOIN users u ON h.reported_by = u.id
         ORDER BY h.created_date DESC
         LIMIT 5`
      );

      const [stats] = await connection.query(
        `SELECT
          COUNT(*) as total_reports,
          SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN severity = 'High'     THEN 1 ELSE 0 END) as high_count,
          SUM(CASE WHEN severity = 'Medium'   THEN 1 ELSE 0 END) as medium_count,
          SUM(CASE WHEN severity = 'Low'      THEN 1 ELSE 0 END) as low_count,
          SUM(CASE WHEN stop_job = 'Yes'      THEN 1 ELSE 0 END) as stop_job_count
         FROM hoc_input`
      );

      sendSuccess(
        res,
        { user: users[0], recent_reports: reports, statistics: stats[0] },
        'Dashboard data retrieved successfully',
        200
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    sendError(res, error.message, 500);
  }
};

// Admin dashboard — all reports across all users
const getAdminDashboard = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    try {
      // Overall stats
      const [stats] = await connection.query(
        `SELECT
          COUNT(*) as total_reports,
          SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN severity = 'High'     THEN 1 ELSE 0 END) as high_count,
          SUM(CASE WHEN severity = 'Medium'   THEN 1 ELSE 0 END) as medium_count,
          SUM(CASE WHEN severity = 'Low'      THEN 1 ELSE 0 END) as low_count,
          SUM(CASE WHEN stop_job = 'Yes'      THEN 1 ELSE 0 END) as stop_job_count,
          SUM(CASE WHEN MONTH(created_date) = MONTH(NOW()) AND YEAR(created_date) = YEAR(NOW()) THEN 1 ELSE 0 END) as this_month,
          SUM(CASE WHEN MONTH(created_date) = MONTH(NOW() - INTERVAL 1 MONTH) AND YEAR(created_date) = YEAR(NOW() - INTERVAL 1 MONTH) THEN 1 ELSE 0 END) as last_month
         FROM hoc_input`
      );

      // Top reporters
      const [topReporters] = await connection.query(
        `SELECT u.name, u.employee_id,
          COUNT(h.job_id) as report_count,
          SUM(CASE WHEN h.severity = 'Critical' THEN 1 ELSE 0 END) as critical_count
         FROM hoc_input h
         JOIN users u ON h.reported_by = u.id
         GROUP BY h.reported_by, u.name, u.employee_id
         ORDER BY report_count DESC
         LIMIT 5`
      );

      // Recent 10 reports across all users (with reporter name)
      const [recentReports] = await connection.query(
        `SELECT h.job_id, h.job_req_for, h.severity, h.observations, h.created_date,
          u.name as reporter_name, u.employee_id as reporter_emp_id
         FROM hoc_input h
         JOIN users u ON h.reported_by = u.id
         ORDER BY h.created_date DESC
         LIMIT 10`
      );

      // Status breakdown
      const [statusBreakdown] = await connection.query(
        `SELECT v.variant_name as status_name, COUNT(h.job_id) as count
         FROM hoc_input h
         JOIN variant_master v ON h.status_id = v.id
         GROUP BY h.status_id, v.variant_name
         ORDER BY count DESC`
      );

      sendSuccess(
        res,
        { statistics: stats[0], top_reporters: topReporters, recent_reports: recentReports, status_breakdown: statusBreakdown },
        'Admin dashboard data retrieved successfully',
        200
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    sendError(res, error.message, 500);
  }
};

module.exports = { getUserDashboard, getAdminDashboard };
