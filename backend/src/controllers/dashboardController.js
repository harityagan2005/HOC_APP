const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

// Get user dashboard data
const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await pool.getConnection();

    try {
      // Get user info
      const [users] = await connection.query(
        'SELECT id, name, employee_id, role FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return sendError(res, 'User not found', 404);
      }

      const user = users[0];

      // Get recent reports
      const [reports] = await connection.query(
        `SELECT job_id, job_req_for, observations, severity, created_date 
         FROM hoc_input 
         WHERE reported_by = ? 
         ORDER BY created_date DESC 
         LIMIT 5`,
        [userId]
      );

      // Get statistics
      const [stats] = await connection.query(
        `SELECT 
          COUNT(*) as total_reports,
          SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END) as high_count,
          SUM(CASE WHEN severity = 'Medium' THEN 1 ELSE 0 END) as medium_count,
          SUM(CASE WHEN severity = 'Low' THEN 1 ELSE 0 END) as low_count
         FROM hoc_input 
         WHERE reported_by = ?`,
        [userId]
      );

      sendSuccess(
        res,
        {
          user,
          recent_reports: reports,
          statistics: stats[0]
        },
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

module.exports = {
  getUserDashboard
};
