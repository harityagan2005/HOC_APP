// Generate random OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Calculate OTP expiry time
const getOTPExpiry = (minutes = 5) => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
};

// Validate OTP
const validateOTP = (storedOTP, providedOTP, expiryTime) => {
  if (!storedOTP || !providedOTP) {
    return { valid: false, message: 'OTP not found' };
  }

  if (new Date() > new Date(expiryTime)) {
    return { valid: false, message: 'OTP expired' };
  }

  if (storedOTP !== providedOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }

  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  getOTPExpiry,
  validateOTP
};
