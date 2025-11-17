import api from './api';

const notificationService = {
  /**
   * Get user's notifications
   * @param {number} skip - Number of notifications to skip (pagination)
   * @param {number} limit - Maximum number of notifications to return
   * @param {boolean} unreadOnly - If true, only return unread notifications
   * @returns {Promise} Notification list response
   */
  getNotifications: async (skip = 0, limit = 20, unreadOnly = false) => {
    try {
      const response = await api.get('/api/notifications', {
        params: { skip, limit, unread_only: unreadOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  },

  /**
   * Get count of unread notifications
   * @returns {Promise<number>} Unread count
   */
  getUnreadCount: async () => {
    try {
      const response = await api.get('/api/notifications/unread-count');
      return response.data.count;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      throw error;
    }
  },

  /**
   * Mark a single notification as read
   * @param {number} notificationId - Notification ID
   * @returns {Promise} Updated notification
   */
  markAsRead: async (notificationId) => {
    try {
      const response = await api.post(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  },

  /**
   * Mark multiple notifications as read
   * @param {number[]} notificationIds - Array of notification IDs
   * @returns {Promise} Response with count
   */
  markMultipleAsRead: async (notificationIds) => {
    try {
      const response = await api.post('/api/notifications/mark-as-read', {
        notification_ids: notificationIds
      });
      return response.data;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise} Response with count
   */
  markAllAsRead: async () => {
    try {
      const response = await api.post('/api/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Delete a notification
   * @param {number} notificationId - Notification ID
   * @returns {Promise} Empty response
   */
  deleteNotification: async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }
};

export default notificationService;
