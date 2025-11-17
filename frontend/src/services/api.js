import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('[API] Request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.config?.headers
    });

    const originalRequest = error.config;

    // If token expired and we have a refresh token, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          // Try to refresh the token
          const response = await axios.post(`${apiUrl}/auth/refresh`, {
            refresh_token: refreshToken
          });

          const newAccessToken = response.data.access_token;
          
          // Save new access token
          localStorage.setItem('access_token', newAccessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('[API] Token refresh failed:', refreshError);
          // Refresh failed, clear everything and dispatch logout event
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          // Dispatch custom event to notify UserContext
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      } else {
        // No refresh token, clear everything and dispatch logout event
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Dispatch custom event to notify UserContext
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
