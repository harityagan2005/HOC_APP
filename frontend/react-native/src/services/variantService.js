import api from './api';

export const getVariants = async (type = null) => {
  try {
    const params = type ? { type } : {};
    const response = await api.get('/variant-master', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createVariant = async (variantData) => {
  try {
    const response = await api.post('/variant-master', variantData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateVariant = async (id, variantData) => {
  try {
    const response = await api.put(`/variant-master/${id}`, variantData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteVariant = async (id) => {
  try {
    const response = await api.delete(`/variant-master/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};