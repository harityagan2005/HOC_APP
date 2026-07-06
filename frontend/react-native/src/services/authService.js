import api from './api';

const getAuthErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.code === 'ECONNABORTED') {
    return 'Server request timed out. Check that the backend is running and reachable.';
  }

  if (error.message === 'Network Error') {
    return 'Cannot reach backend server. Make sure your phone and PC are on the same Wi-Fi, then restart Expo.';
  }

  return error.message || 'Login failed';
};

export const requestOTP = async (employee_id, password) => {
  try {
    const response = await api.post('/auth/request-otp', {
      employee_id,
      password,
    });
    return response.data;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
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
    throw new Error(getAuthErrorMessage(error));
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
    throw new Error(getAuthErrorMessage(error));
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
};
