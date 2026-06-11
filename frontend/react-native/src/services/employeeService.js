import api from './api';

export const getEmployees = async () => {
  try {
    const response = await api.get('/employee-master');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getEmployeeDetail = async (id) => {
  try {
    const response = await api.get(`/employee-master/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const addEmployee = async (employeeData) => {
  try {
    const response = await api.post('/employee-master', employeeData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateEmployee = async (id, employeeData) => {
  try {
    const response = await api.put(`/employee-master/${id}`, employeeData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteEmployee = async (id) => {
  try {
    const response = await api.delete(`/employee-master/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};