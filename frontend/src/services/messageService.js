import api from './api';

/**
 * Message service for managing conversations and messages
 */
const messageService = {
  /**
   * Get all conversations for the current user
   * @param {number} page - Page number (default: 1)
   * @param {number} pageSize - Number of items per page (default: 20)
   * @returns {Promise<Object>} - Conversations list with pagination
   */
  async getConversations(page = 1, pageSize = 20) {
    try {
      const response = await api.get('/api/messages/conversations', {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch conversations' };
    }
  },

  /**
   * Get a specific conversation by ID
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<Object>} - Conversation details
   */
  async getConversation(conversationId) {
    try {
      const response = await api.get(`/api/messages/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch conversation' };
    }
  },

  /**
   * Create a new conversation (direct or group)
   * @param {Object} conversationData - Conversation data
   * @param {string} conversationData.type - 'direct' or 'group'
   * @param {string} conversationData.name - Group name (required for group)
   * @param {Array<number>} conversationData.participant_ids - Array of user IDs
   * @returns {Promise<Object>} - Created conversation
   */
  async createConversation(conversationData) {
    try {
      const response = await api.post('/api/messages/conversations', conversationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to create conversation' };
    }
  },

  /**
   * Update a conversation (name, avatar - group only)
   * @param {number} conversationId - Conversation ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.name - New group name
   * @param {string} updateData.avatar - New group avatar URL
   * @returns {Promise<Object>} - Updated conversation
   */
  async updateConversation(conversationId, updateData) {
    try {
      const response = await api.patch(`/api/messages/conversations/${conversationId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to update conversation' };
    }
  },

  /**
   * Get messages from a conversation
   * @param {number} conversationId - Conversation ID
   * @param {number} page - Page number (default: 1)
   * @param {number} pageSize - Number of items per page (default: 50)
   * @returns {Promise<Object>} - Messages list with pagination
   */
  async getMessages(conversationId, page = 1, pageSize = 50) {
    try {
      const response = await api.get(`/api/messages/conversations/${conversationId}/messages`, {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch messages' };
    }
  },

  /**
   * Send a message to a conversation
   * @param {number} conversationId - Conversation ID
   * @param {string} content - Message content
   * @returns {Promise<Object>} - Sent message
   */
  async sendMessage(conversationId, content) {
    try {
      const response = await api.post(`/api/messages/conversations/${conversationId}/messages`, {
        content
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to send message' };
    }
  },

  /**
   * Add participants to a group conversation
   * @param {number} conversationId - Conversation ID
   * @param {Array<number>} userIds - Array of user IDs to add
   * @returns {Promise<Object>} - Success response
   */
  async addParticipants(conversationId, userIds) {
    try {
      const response = await api.post(`/api/messages/conversations/${conversationId}/participants`, {
        user_ids: userIds
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to add participants' };
    }
  },

  /**
   * Leave a conversation
   * @param {number} conversationId - Conversation ID
   * @param {number} userId - User ID (current user)
   * @returns {Promise<Object>} - Success response
   */
  async leaveConversation(conversationId, userId) {
    try {
      const response = await api.delete(`/api/messages/conversations/${conversationId}/participants/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to leave conversation' };
    }
  },

  /**
   * Mark all messages in a conversation as read
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<Object>} - Success response
   */
  async markAsRead(conversationId) {
    try {
      const response = await api.post(`/api/messages/conversations/${conversationId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to mark as read' };
    }
  }
};

export default messageService;
