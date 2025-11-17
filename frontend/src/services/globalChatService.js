import api from './api';

const globalChatService = {
  // Global Chat (users only, no bots)
  async getGlobalMessages(limit = 50) {
    try {
      const response = await api.get(`/api/global-chat/messages?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching global messages:', error);
      throw error;
    }
  },

  async sendGlobalMessage(content) {
    try {
      const response = await api.post('/api/global-chat/messages', { content });
      return response.data;
    } catch (error) {
      console.error('Error sending global message:', error);
      throw error;
    }
  },

  // Bot Chat (users + bots)
  async getBotMessages(limit = 50) {
    try {
      const response = await api.get(`/api/global-chat/bot-messages?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching bot messages:', error);
      throw error;
    }
  },

  async sendBotMessage(content) {
    try {
      const response = await api.post('/api/global-chat/bot-messages', { content });
      return response.data;
    } catch (error) {
      console.error('Error sending bot message:', error);
      throw error;
    }
  }
};

export default globalChatService;
