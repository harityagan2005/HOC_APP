const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateOTP, getOTPExpiry, validateOTP } = require('../utils/otp');
const { sendSuccess, sendError } = require('../utils/response');
const { validateEmployeeId, validatePassword } = require('../utils/validation');

// Request OTP - Send SMS OTP for 2FA
const requestOTP = async (req, res) => {
  // OTP flow disabled: perform direct login instead
  try {
    // Reuse direct login handler to authenticate and return token
    await login(req, res);
  } catch (error) {
    console.error('Error in requestOTP (bypassed):', error);
    sendError(res, error.message, 500);
  }
};

// Verify OTP and get JWT token
const verifyOTP = async (req, res) => {
  // OTP verification disabled: perform direct login instead
  try {
    await login(req, res);
  } catch (error) {
    console.error('Error in verifyOTP (bypassed):', error);
    sendError(res, error.message, 500);
  }
};

// Logout
const logout = (req, res) => {
  // JWT tokens are stateless, so logout is just client-side
  sendSuccess(res, null, 'Logged out successfully', 200);
};

// Helper function to mask phone number
const maskPhone = (phone) => {
  if (!phone) return '***';
  return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
};

// Direct Login - bypass 2FA
const login = async (req, res) => {
  try {
    const { employee_id: rawEmpId, password: rawPassword } = req.body;

    // Trim inputs to avoid whitespace mismatches
    const employee_id = rawEmpId ? rawEmpId.trim() : '';
    const password = rawPassword || '';

    // Validate input
    if (!validateEmployeeId(employee_id) || !validatePassword(password)) {
      return sendError(res, 'Invalid employee ID or password', 400);
    }

    const connection = await pool.getConnection();

    try {
      // Find user by employee_id (include employee_id so it's available for JWT)
      const [users] = await connection.query(
        'SELECT id, employee_id, name, email, phone, password, role, is_active FROM users WHERE employee_id = ?',
        [employee_id]
      );

      if (users.length === 0) {
        return sendError(res, 'User not found', 404);
      }

      const user = users[0];

      // Check if user is active
      if (!user.is_active) {
        return sendError(res, 'User account is inactive', 403);
      }

      // Verify password
      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (err) {
        console.warn('Bcrypt compare failed, using plain-text fallback', err);
      }

      if (!isPasswordValid && password === user.password) {
        isPasswordValid = true;
      }

      console.log('🔐 Password valid:', isPasswordValid);
      if (!isPasswordValid) {
        console.log('❌ Invalid password attempt for', employee_id);
        return sendError(res, 'Invalid password', 401);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      sendSuccess(
        res,
        {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        },
        'Login successful',
        200
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error during direct login:', error);
    sendError(res, error.message, 500);
  }
};

module.exports = {
  requestOTP,
  verifyOTP,
  login,
  logout
};
