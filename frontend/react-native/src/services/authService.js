import api from './api';

export const requestOTP = async (employee_id, password) => {
  try {
    const response = await api.post('/auth/request-otp', {
      employee_id,
      password,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const login = async (employee_id, password) => {
  try {
    const response = await api.post('/auth/login', {
      employee_id,
      password,
    });
    return response.data;
  } catch (error) {
    const apiError = error.response?.data;
    const message = apiError?.message || error.message || String(apiError) || 'Login failed';
    throw new Error(message);
  }
};

export const verifyOTP = async (user_id, otp) => {
  try {
    const response = await api.post('/auth/verify-otp', {
      user_id,
      otp,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    throw error.response?.data || error.message;
  }
};