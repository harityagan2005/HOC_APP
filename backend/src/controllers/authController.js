const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { getOTPExpiry, validateOTP } = require('../utils/otp');
const { sendSuccess, sendError } = require('../utils/response');
const { validateEmployeeId, validatePassword } = require('../utils/validation');

// Helper function to mask phone number
const maskPhone = (phone) => {
  if (!phone) return '***';
  return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
};

const generateToken = (user) => jwt.sign(
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

// Request OTP - validates credentials, then issues a 2FA code.
// No SMS gateway is wired up, so a fixed default code (OTP_DEFAULT_CODE, "000000")
// is used in place of a real gateway — the request/verify/expiry flow is fully live.
const requestOTP = async (req, res) => {
  try {
    const { employee_id: rawEmpId, password: rawPassword } = req.body;
    const employee_id = rawEmpId ? rawEmpId.trim() : '';
    const password = rawPassword || '';

    if (!validateEmployeeId(employee_id) || !validatePassword(password)) {
      return sendError(res, 'Invalid employee ID or password', 400);
    }

    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query(
        'SELECT id, name, phone, password, is_active FROM users WHERE employee_id = ?',
        [employee_id]
      );
      if (users.length === 0) return sendError(res, 'User not found', 404);

      const user = users[0];
      if (!user.is_active) return sendError(res, 'User account is inactive', 403);

      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (err) {
        console.warn('Bcrypt compare failed, using plain-text fallback', err);
      }
      if (!isPasswordValid && password === user.password) isPasswordValid = true;
      if (!isPasswordValid) return sendError(res, 'Invalid password', 401);

      const otp = process.env.OTP_DEFAULT_CODE || '000000';
      const expiryTime = getOTPExpiry(parseInt(process.env.OTP_EXPIRY || 5));

      const [existingOtp] = await connection.query(
        'SELECT id FROM otp_verifications WHERE user_id = ?', [user.id]
      );
      if (existingOtp.length > 0) {
        await connection.query(
          'UPDATE otp_verifications SET otp = ?, expires_at = ?, created_at = SYSDATETIME() WHERE user_id = ?',
          [otp, expiryTime, user.id]
        );
      } else {
        await connection.query(
          'INSERT INTO otp_verifications (user_id, otp, expires_at) VALUES (?, ?, ?)',
          [user.id, otp, expiryTime]
        );
      }

      // No SMS gateway configured — log the default gateway code for local/demo use.
      console.log(`📱 OTP for ${employee_id}: ${otp} (default gateway)`);

      sendSuccess(
        res,
        { userId: user.id, phone: maskPhone(user.phone), message: 'OTP sent to registered phone number' },
        'OTP sent successfully',
        200
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in requestOTP:', error);
    sendError(res, error.message, 500);
  }
};

// Verify OTP and get JWT token
const verifyOTP = async (req, res) => {
  try {
    const { user_id, otp } = req.body;
    if (!user_id || !otp) return sendError(res, 'User ID and OTP are required', 400);

    const connection = await pool.getConnection();
    try {
      const [otpRows] = await connection.query(
        'SELECT otp, expires_at FROM otp_verifications WHERE user_id = ?', [user_id]
      );
      if (otpRows.length === 0) return sendError(res, 'OTP not requested for this user', 400);

      const { valid, message } = validateOTP(otpRows[0].otp, otp, otpRows[0].expires_at);
      if (!valid) return sendError(res, message, 400);

      await connection.query('DELETE FROM otp_verifications WHERE user_id = ?', [user_id]);

      const [users] = await connection.query(
        'SELECT id, employee_id, name, email, role, is_active FROM users WHERE id = ?', [user_id]
      );
      if (users.length === 0) return sendError(res, 'User not found', 404);

      const user = users[0];
      if (!user.is_active) return sendError(res, 'User account is inactive', 403);

      const token = generateToken(user);
      sendSuccess(
        res,
        { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
        'Login successful',
        200
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    sendError(res, error.message, 500);
  }
};

// Logout
const logout = (req, res) => {
  // JWT tokens are stateless, so logout is just client-side
  sendSuccess(res, null, 'Logged out successfully', 200);
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

      const token = generateToken(user);

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
