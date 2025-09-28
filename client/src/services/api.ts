import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_BASE || 'http://localhost:3001').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 35000,
});

// --- Attach Authorization token if available (optional, harmless if missing)
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

// --- Normalize error messages
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    err.normalizedMessage =
      data?.error ||
      data?.message ||
      err?.message ||
      (status ? `Request failed with status ${status}` : 'Network error');
    return Promise.reject(err);
  }
);

export default api;
