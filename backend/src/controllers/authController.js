const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateOTP, getOTPExpiry, validateOTP } = require('../utils/otp');
const { sendSuccess, sendError } = require('../utils/response');
const { validateEmployeeId, validatePassword } = require('../utils/validation');

// Request OTP - Send SMS OTP for 2FA
const requestOTP = async (req, res) => {
  try {
    const { employee_id, password } = req.body;

    // Validate input
    if (!validateEmployeeId(employee_id) || !validatePassword(password)) {
      return sendError(res, 'Invalid employee ID or password', 400);
    }

    // Get connection from pool
    const connection = await pool.getConnection();

    try {
      // Find user by employee_id
      const [users] = await connection.query(
        'SELECT id, name, email, phone, password, role, is_active FROM users WHERE employee_id = ?',
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
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return sendError(res, 'Invalid password', 401);
      }

      // Generate OTP
      const otp = generateOTP(parseInt(process.env.OTP_LENGTH || 6));
      const expiryTime = getOTPExpiry(parseInt(process.env.OTP_EXPIRY || 5));

      // Store OTP in database
      await connection.query(
        'INSERT INTO otp_verifications (user_id, otp, expires_at, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?, created_at = NOW()',
        [user.id, otp, expiryTime, otp, expiryTime]
      );

      // TODO: Send OTP via Twilio SMS
      // await sendSMS(user.phone, `Your HOC App OTP is: ${otp}`);

      // For development - log OTP to console
      console.log(`📱 OTP for ${employee_id}: ${otp}`);

      sendSuccess(
        res,
        {
          userId: user.id,
          phone: maskPhone(user.phone),
          message: 'OTP sent to registered phone number'
        },
        'OTP sent successfully',
        200
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error requesting OTP:', error);
    sendError(res, error.message, 500);
  }
};

// Verify OTP and get JWT token
const verifyOTP = async (req, res) => {
  try {
    const { user_id, otp } = req.body;

    if (!user_id || !otp) {
      return sendError(res, 'User ID and OTP are required', 400);
    }

    const connection = await pool.getConnection();

    try {
      // Get OTP from database
      const [otpRecords] = await connection.query(
        'SELECT otp, expires_at FROM otp_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [user_id]
      );

      if (otpRecords.length === 0) {
        return sendError(res, 'No OTP found for this user', 404);
      }

      const { otp: storedOTP, expires_at } = otpRecords[0];

      // Validate OTP
      const validation = validateOTP(storedOTP, otp, expires_at);
      if (!validation.valid) {
        return sendError(res, validation.message, 401);
      }

      // Get user details
      const [users] = await connection.query(
        'SELECT id, employee_id, name, email, role FROM users WHERE id = ?',
        [user_id]
      );

      if (users.length === 0) {
        return sendError(res, 'User not found', 404);
      }

      const user = users[0];

      // Clear used OTP
      await connection.query(
        'DELETE FROM otp_verifications WHERE user_id = ?',
        [user_id]
      );

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
    console.error('Error verifying OTP:', error);
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
    const { employee_id, password } = req.body;

    // Validate input
    if (!validateEmployeeId(employee_id) || !validatePassword(password)) {
      return sendError(res, 'Invalid employee ID or password', 400);
    }

    const connection = await pool.getConnection();

    try {
      // Find user by employee_id
      const [users] = await connection.query(
        'SELECT id, name, email, phone, password, role, is_active FROM users WHERE employee_id = ?',
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

      if (!isPasswordValid) {
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
