import api from './api';

/**
 * Authentication service for handling user registration, login, and logout
 */
const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email address
   * @param {string} userData.password - User's password
   * @returns {Promise<Object>} - User data and tokens
   */
  async register(userData) {
    try {
      const response = await api.post('/api/auth/register', userData);
      
      // Store tokens
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
      }
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Registration failed' };
    }
  },

  /**
   * Login existing user
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User's email address
   * @param {string} credentials.password - User's password
   * @returns {Promise<Object>} - User data and tokens
   */
  async login(credentials) {
    try {
      const response = await api.post('/api/auth/login', credentials);
      
      // Store tokens
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
      }
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Login failed' };
    }
  },

  /**
   * Logout current user
   */
  async logout() {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // Even if API call fails, still clear local data
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },
};

export default authService;
