import api from './api';

export const getUserDashboard = async () => {
  try {
    const response = await api.get('/dashboard/user');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAdminDashboard = async () => {
  try {
    const response = await api.get('/dashboard/admin');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getReports = async (page = 1, limit = 20, severity = null, search = null, status = null, dateFrom = null, dateTo = null) => {
  try {
    const params = { page, limit };
    if (severity) params.severity = severity;
    if (search)   params.search   = search;
    if (status)   params.status   = status;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo)   params.dateTo   = dateTo;
    const response = await api.get('/hoc-input', { params });
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

export const uploadImage = async (uri) => {
  try {
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase()}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('image', { uri, name: filename, type });

    const response = await api.post('/hoc-input/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
