import api from './api';

/**
 * Friend service for managing friendships
 */
const friendService = {
  /**
   * Send a friend request to another user
   * @param {number} friendId - ID of the user to send request to
   * @returns {Promise<Object>} - Friendship data
   */
  async sendFriendRequest(friendId) {
    try {
      const response = await api.post('/api/friends/request', {
        friend_id: friendId
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to send friend request' };
    }
  },

  /**
   * Accept a friend request
   * @param {number} friendshipId - ID of the friendship to accept
   * @returns {Promise<Object>} - Updated friendship data
   */
  async acceptFriendRequest(friendshipId) {
    try {
      const response = await api.post(`/api/friends/${friendshipId}/accept`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to accept friend request' };
    }
  },

  /**
   * Reject a friend request
   * @param {number} friendshipId - ID of the friendship to reject
   * @returns {Promise<void>}
   */
  async rejectFriendRequest(friendshipId) {
    try {
      await api.post(`/api/friends/${friendshipId}/reject`);
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to reject friend request' };
    }
  },

  /**
   * Unfriend a user (remove accepted friendship)
   * @param {number} friendshipId - ID of the friendship to remove
   * @returns {Promise<void>}
   */
  async unfriend(friendshipId) {
    try {
      await api.delete(`/api/friends/${friendshipId}`);
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to unfriend user' };
    }
  },

  /**
   * Get list of friends
   * @param {number} page - Page number
   * @param {number} pageSize - Number of friends per page
   * @returns {Promise<Object>} - Friends list with pagination
   */
  async getFriends(page = 1, pageSize = 20) {
    try {
      const response = await api.get('/api/friends', {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch friends' };
    }
  },

  /**
   * Get list of friends for a specific user
   * @param {number} userId - ID of the user to get friends for
   * @param {number} page - Page number
   * @param {number} pageSize - Number of friends per page
   * @returns {Promise<Object>} - Friends list with pagination
   */
  async getUserFriends(userId, page = 1, pageSize = 20) {
    try {
      const response = await api.get(`/api/friends/user/${userId}`, {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch user friends' };
    }
  },

  /**
   * Get pending friend requests
   * @returns {Promise<Object>} - Pending requests list
   */
  async getPendingRequests() {
    try {
      const response = await api.get('/api/friends/requests');
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch pending requests' };
    }
  },

  /**
   * Get friendship status with a specific user
   * @param {number} userId - ID of the user to check status with
   * @returns {Promise<Object>} - Friendship status (status, friendship_id, is_requester)
   */
  async getFriendshipStatus(userId) {
    try {
      const response = await api.get(`/api/friends/status/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch friendship status' };
    }
  },
};

export default friendService;
