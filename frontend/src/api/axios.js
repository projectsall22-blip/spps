import axios from 'axios';

const API = axios.create({
  // Ensure this matches your Node.js server URL
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', 
});

// REQUEST INTERCEPTOR: Automatically attach the token if it exists
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE INTERCEPTOR: Handle expired tokens (401 errors)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If the backend says the token is invalid/expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; // Kick back to landing page
    }
    return Promise.reject(error);
  }
);

export default API;