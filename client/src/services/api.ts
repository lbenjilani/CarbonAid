import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_BASE || 'http://localhost:5000').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true, // enable if you switch to cookie auth
});

export default api;
