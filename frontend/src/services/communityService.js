/**
 * Community API Service
 * Handles all API calls related to communities
 */
import api from './api';

const communityService = {
  /**
   * Get list of communities with optional filters
   * @param {Object} params - Query parameters
   * @param {string} params.search - Search text
   * @param {string} params.category - Category filter
   * @param {number} params.page - Page number
   * @param {number} params.page_size - Items per page
   * @returns {Promise} Community list with pagination
   */
  getCommunities: async ({ search, category, page = 1, page_size = 20 } = {}) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      params.append('page', page);
      params.append('page_size', page_size);

      const response = await api.get(`/api/communities?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching communities:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get community details by ID
   * @param {number} communityId - Community ID
   * @returns {Promise} Community details with members
   */
  getCommunity: async (communityId) => {
    try {
      const response = await api.get(`/api/communities/${communityId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching community:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Create a new community
   * @param {Object} communityData - Community data
   * @param {string} communityData.name - Community name
   * @param {string} communityData.description - Community description
   * @param {string} communityData.category - Community category
   * @param {boolean} communityData.is_private - Privacy setting
   * @param {string} communityData.avatar - Avatar URL
   * @param {string} communityData.banner - Banner URL
   * @returns {Promise} Created community
   */
  createCommunity: async (communityData) => {
    try {
      const response = await api.post('/api/communities', communityData);
      return response.data;
    } catch (error) {
      console.error('Error creating community:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Update community details
   * @param {number} communityId - Community ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise} Updated community
   */
  updateCommunity: async (communityId, updateData) => {
    try {
      const response = await api.patch(`/api/communities/${communityId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating community:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Delete a community
   * @param {number} communityId - Community ID
   * @returns {Promise}
   */
  deleteCommunity: async (communityId) => {
    try {
      await api.delete(`/api/communities/${communityId}`);
    } catch (error) {
      console.error('Error deleting community:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Join a community
   * @param {number} communityId - Community ID
   * @returns {Promise} Success message
   */
  joinCommunity: async (communityId) => {
    try {
      const response = await api.post(`/api/communities/${communityId}/join`);
      return response.data;
    } catch (error) {
      console.error('Error joining community:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Leave a community
   * @param {number} communityId - Community ID
   * @returns {Promise} Success message
   */
  leaveCommunity: async (communityId) => {
    try {
      const response = await api.post(`/api/communities/${communityId}/leave`);
      return response.data;
    } catch (error) {
      console.error('Error leaving community:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get community members
   * @param {number} communityId - Community ID
   * @returns {Promise} List of members
   */
  getMembers: async (communityId) => {
    try {
      const response = await api.get(`/api/communities/${communityId}/members`);
      return response.data;
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Update member role
   * @param {number} communityId - Community ID
   * @param {number} userId - User ID
   * @param {string} role - New role (admin, moderator, member)
   * @returns {Promise} Updated member
   */
  updateMemberRole: async (communityId, userId, role) => {
    try {
      const response = await api.patch(`/api/communities/${communityId}/members/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get community posts
   * @param {number} communityId - Community ID
   * @param {number} page - Page number
   * @param {number} page_size - Items per page
   * @returns {Promise} Posts with pagination
   */
  getPosts: async (communityId, page = 1, page_size = 20) => {
    try {
      const response = await api.get(`/api/communities/${communityId}/posts?page=${page}&page_size=${page_size}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Create a post in a community
   * @param {number} communityId - Community ID
   * @param {Object} postData - Post data
   * @param {string} postData.content - Post content
   * @param {string} postData.image_url - Optional image URL
   * @returns {Promise} Created post
   */
  createPost: async (communityId, postData) => {
    try {
      const response = await api.post(`/api/communities/${communityId}/posts`, postData);
      return response.data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Update a post
   * @param {number} communityId - Community ID
   * @param {number} postId - Post ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise} Updated post
   */
  updatePost: async (communityId, postId, updateData) => {
    try {
      const response = await api.patch(`/api/communities/${communityId}/posts/${postId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Delete a post
   * @param {number} communityId - Community ID
   * @param {number} postId - Post ID
   * @returns {Promise}
   */
  deletePost: async (communityId, postId) => {
    try {
      await api.delete(`/api/communities/${communityId}/posts/${postId}`);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Like a post
   * @param {number} communityId - Community ID
   * @param {number} postId - Post ID
   * @returns {Promise} Success message
   */
  likePost: async (communityId, postId) => {
    try {
      const response = await api.post(`/api/communities/${communityId}/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error('Error liking post:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Unlike a post
   * @param {number} communityId - Community ID
   * @param {number} postId - Post ID
   * @returns {Promise} Success message
   */
  unlikePost: async (communityId, postId) => {
    try {
      const response = await api.delete(`/api/communities/${communityId}/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error('Error unliking post:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Add a comment to a post
   * @param {number} communityId - Community ID
   * @param {number} postId - Post ID
   * @param {Object} commentData - Comment data
   * @param {string} commentData.content - Comment content
   * @returns {Promise} Created comment
   */
  addComment: async (communityId, postId, commentData) => {
    try {
      const response = await api.post(`/api/communities/${communityId}/posts/${postId}/comments`, commentData);
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Delete a comment
   * @param {number} communityId - Community ID
   * @param {number} postId - Post ID
   * @param {number} commentId - Comment ID
   * @returns {Promise}
   */
  deleteComment: async (communityId, postId, commentId) => {
    try {
      await api.delete(`/api/communities/${communityId}/posts/${postId}/comments/${commentId}`);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error.response?.data || error;
    }
  },
};

export default communityService;
