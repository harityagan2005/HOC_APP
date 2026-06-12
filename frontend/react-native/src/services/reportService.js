import api from './api';

export const getUserDashboard = async () => {
  try {
    const response = await api.get('/dashboard/user');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getReports = async (page = 1, limit = 10) => {
  try {
    const response = await api.get('/hoc-input', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getReportDetail = async (id) => {
  try {
    const response = await api.get(`/hoc-input/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createReport = async (reportData) => {
  try {
    const response = await api.post('/hoc-input', reportData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateReport = async (id, reportData) => {
  try {
    const response = await api.put(`/hoc-input/${id}`, reportData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteReport = async (id) => {
  try {
    const response = await api.delete(`/hoc-input/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};