const validator = require('validator');

const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
  return password && password.trim().length > 0;
};

const validateEmployeeId = (employeeId) => {
  // Basic validation - can be customized
  return employeeId && employeeId.trim().length > 0;
};

const validatePhone = (phone) => {
  // Remove spaces and special characters
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

const validateReportInput = (data) => {
  const errors = [];

  if (!data.job_req_for) errors.push('Job requirement field is required');
  if (!data.observer_name) errors.push('Observer name is required');
  if (!data.observations) errors.push('Observations are required');
  if (!data.location_id) errors.push('Location is required');
  if (!data.area_id) errors.push('Area is required');
  if (!data.status_id) errors.push('Status is required');
  if (!data.category_id) errors.push('Category is required');

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateEmployeeId,
  validatePhone,
  validateReportInput
};
