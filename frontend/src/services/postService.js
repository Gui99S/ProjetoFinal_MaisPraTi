import api from './api';

/**
 * Post service for managing posts, likes, and comments
 */
const postService = {
  /**
   * Create a new post
   * @param {string} content - Post content (max 141 characters)
   * @returns {Promise<Object>} - Created post
   */
  async createPost(content) {
    try {
      const response = await api.post('/api/posts/', { content });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to create post' };
    }
  },

  /**
   * Get paginated feed of posts
   * @param {number} page - Page number (default 1)
   * @param {number} pageSize - Posts per page (default 10)
   * @returns {Promise<Object>} - Posts feed with pagination info
   */
  async getFeed(page = 1, pageSize = 10) {
    try {
      const response = await api.get('/api/posts/', {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch posts' };
    }
  },

  /**
   * Get a specific post by ID
   * @param {number} postId - Post ID
   * @returns {Promise<Object>} - Post details
   */
  async getPost(postId) {
    try {
      const response = await api.get(`/api/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch post' };
    }
  },

  /**
   * Update a post
   * @param {number} postId - Post ID
   * @param {string} content - Updated content
   * @returns {Promise<Object>} - Updated post
   */
  async updatePost(postId, content) {
    try {
      const response = await api.put(`/api/posts/${postId}`, { content });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to update post' };
    }
  },

  /**
   * Delete a post
   * @param {number} postId - Post ID
   * @returns {Promise<void>}
   */
  async deletePost(postId) {
    try {
      await api.delete(`/api/posts/${postId}`);
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to delete post' };
    }
  },

  /**
   * Like a post (toggles if already liked)
   * @param {number} postId - Post ID
   * @returns {Promise<Object>} - Like response with updated counts
   */
  async likePost(postId) {
    try {
      const response = await api.post(`/api/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to like post' };
    }
  },

  /**
   * Dislike a post (toggles if already disliked)
   * @param {number} postId - Post ID
   * @returns {Promise<Object>} - Dislike response with updated counts
   */
  async dislikePost(postId) {
    try {
      const response = await api.post(`/api/posts/${postId}/dislike`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to dislike post' };
    }
  },

  /**
   * Add a comment to a post
   * @param {number} postId - Post ID
   * @param {string} content - Comment content
   * @returns {Promise<Object>} - Created comment
   */
  async addComment(postId, content) {
    try {
      const response = await api.post(`/api/posts/${postId}/comments`, { content });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to add comment' };
    }
  },

  /**
   * Get comments for a post
   * @param {number} postId - Post ID
   * @returns {Promise<Array>} - Array of comments
   */
  async getComments(postId) {
    try {
      const response = await api.get(`/api/posts/${postId}/comments`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch comments' };
    }
  },

  /**
   * Delete a comment
   * @param {number} commentId - Comment ID
   * @returns {Promise<void>}
   */
  async deleteComment(commentId) {
    try {
      await api.delete(`/api/posts/comments/${commentId}`);
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to delete comment' };
    }
  },
};

export default postService;
