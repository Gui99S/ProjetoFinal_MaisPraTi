import api from './api';

/**
 * User service for managing user profiles
 */
const userService = {
  /**
   * Get current user's profile
   * @returns {Promise<Object>} - User profile data
   */
  async getCurrentProfile() {
    try {
      const response = await api.get('/api/users/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch profile' };
    }
  },

  /**
   * Update current user's profile
   * @param {Object} profileData - Profile fields to update
   * @returns {Promise<Object>} - Updated user profile
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/api/users/me', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to update profile' };
    }
  },

  /**
   * Get another user's profile by slug or ID
   * @param {string|number} slugOrId - User slug (e.g., "john-doe" or "john-doe-2") or numeric ID for backwards compatibility
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile(slugOrId) {
    try {
      const response = await api.get(`/api/users/${slugOrId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch user profile' };
    }
  },

  /**
   * Alias for getUserProfile
   * @param {string|number} slugOrId - User slug or ID
   * @returns {Promise<Object>} - User profile data
   */
  async getUser(slugOrId) {
    return this.getUserProfile(slugOrId);
  },

  /**
   * Get all users with optional filters
   * @param {Object} params - Query parameters
   * @param {boolean} params.bots_only - Only return bot users
   * @param {number} params.limit - Maximum number of users to return
   * @returns {Promise<Array>} - List of users
   */
  async getUsers(params = {}) {
    try {
      const response = await api.get('/api/users/', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch users' };
    }
  },

  /**
   * Get bot users only
   * @param {number} limit - Maximum number of bots to return
   * @returns {Promise<Array>} - List of bot users
   */
  async getBots(limit = 50) {
    try {
      const response = await api.get('/api/users/', {
        params: { bots_only: true, limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch bots' };
    }
  },

  /**
   * Search users by name
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} - Matching users
   */
  async searchUsers(query, limit = 20) {
    try {
      const response = await api.get('/api/users/search', {
        params: { q: query, limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to search users' };
    }
  },

  /**
   * Get a user's posts by slug or ID
   * @param {string|number} slugOrId - User slug or ID
   * @param {number} page - Page number (default 1)
   * @param {number} pageSize - Posts per page (default 10)
   * @returns {Promise<Object>} - Posts feed with pagination info
   */
  async getUserPosts(slugOrId, page = 1, pageSize = 10) {
    try {
      const response = await api.get(`/api/users/${slugOrId}/posts`, {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch user posts' };
    }
  },

  /**
   * Get communities that a user has joined
   * @param {string|number} slugOrId - User slug or ID
   * @returns {Promise<Array>} - List of communities
   */
  async getUserCommunities(slugOrId) {
    try {
      console.log('[USER_SERVICE] Calling API:', `/api/users/${slugOrId}/communities`);
      const response = await api.get(`/api/users/${slugOrId}/communities`);
      console.log('[USER_SERVICE] API Response:', response);
      console.log('[USER_SERVICE] Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('[USER_SERVICE] API Error:', error);
      console.error('[USER_SERVICE] Error response:', error.response);
      console.error('[USER_SERVICE] Error data:', error.response?.data);
      throw error.response?.data || { detail: 'Failed to fetch user communities' };
    }
  },

  /**
   * Get a user's friends by slug or ID
   * @param {string|number} slugOrId - User slug or ID
   * @param {number} page - Page number (default 1)
   * @param {number} pageSize - Friends per page (default 50)
   * @returns {Promise<Object>} - Friends list with pagination info
   */
  async getUserFriends(slugOrId, page = 1, pageSize = 50) {
    try {
      const response = await api.get(`/api/users/${slugOrId}/friends`, {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch user friends' };
    }
  }
};

export default userService;
