import api from './api';

const photoService = {
  /**
   * Upload a new photo
   * @param {File} file - The image file to upload
   * @param {string} caption - Optional caption for the photo
   * @returns {Promise} Photo data
   */
  async uploadPhoto(file, caption = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await api.post('/api/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get photos for a specific user
   * @param {number} userId - User ID
   * @param {number} page - Page number (default 1)
   * @param {number} pageSize - Items per page (default 50)
   * @returns {Promise} Paginated photo list
   */
  async getUserPhotos(userId, page = 1, pageSize = 50) {
    const response = await api.get(`/api/photos/user/${userId}`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  /**
   * Get a specific photo by ID
   * @param {number} photoId - Photo ID
   * @returns {Promise} Photo data
   */
  async getPhoto(photoId) {
    const response = await api.get(`/api/photos/${photoId}`);
    return response.data;
  },

  /**
   * Update photo caption
   * @param {number} photoId - Photo ID
   * @param {string} caption - New caption
   * @returns {Promise} Updated photo data
   */
  async updatePhoto(photoId, caption) {
    const response = await api.put(`/api/photos/${photoId}`, { caption });
    return response.data;
  },

  /**
   * Delete a photo
   * @param {number} photoId - Photo ID
   * @returns {Promise} void
   */
  async deletePhoto(photoId) {
    await api.delete(`/api/photos/${photoId}`);
  },

  /**
   * Get photo count for a user
   * @param {number} userId - User ID
   * @returns {Promise} Photo count data
   */
  async getUserPhotoCount(userId) {
    const response = await api.get(`/api/photos/user/${userId}/count`);
    return response.data;
  },
};

export default photoService;
