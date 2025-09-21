import axios from 'axios';

// Prefer env; fall back to localhost for dev
const API_BASE_URL =
  (process.env.REACT_APP_API_BASE || 'http://localhost:5001').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // If you later use cookie-based auth, uncomment:
  // withCredentials: true,
});

export default api;
