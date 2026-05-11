import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(config => {
  return config;
});

// Response interceptor
api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.detail || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

// Training API
export const trainingAPI = {
  startTraining: () => api.post('/training/start'),
  getStatus: () => api.get('/training/status'),
  getResults: () => api.get('/training/results'),
  getDatasetInfo: () => api.get('/training/dataset-info'),
};

// Prediction API
export const predictionAPI = {
  predict: (data) => api.post('/predict/single', data),
  predictBatch: (data) => api.post('/predict/batch', data),
  getModelInfo: () => api.get('/predict/model-info'),
};

// Analytics API
export const analyticsAPI = {
  getEDA: () => api.get('/analytics/eda'),
  getFeatureImportance: (model) => api.get(`/analytics/feature-importance${model ? `?model_name=${model}` : ''}`),
  getShapSummary: (model) => api.get(`/analytics/shap-summary${model ? `?model_name=${model}` : ''}`),
  getModelMetrics: () => api.get('/analytics/model-metrics'),
  getCorrelation: () => api.get('/analytics/correlation'),
};

// Reports API
export const reportsAPI = {
  downloadModelComparisonCSV: () => `${API_BASE}/reports/model-comparison/csv`,
  downloadModelComparisonJSON: () => `${API_BASE}/reports/model-comparison/json`,
  downloadEDASummaryCSV: () => `${API_BASE}/reports/eda-summary/csv`,
  downloadPredictionsCSV: () => `${API_BASE}/reports/predictions-sample/csv`,
};

// Health
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
