// ============================================================
// BroadcastService.js - Frontend API Service
// Handles all broadcast-related API calls from Frontend
// ============================================================

import axiosInstance from '../Axios';

const BroadcastService = {
  
  // ─── SEND MESSAGE (SAVE TO DB) ──────────────────────────
  /**
   * Send and save a broadcast message to database
   * @param {Object} messageData
   * @returns {Promise<Object>}
   */
  sendMessage: async (messageData) => {
    try {
      const response = await axiosInstance.post(
        '/messages/save',
        messageData
      );
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // ─── GET ALL MESSAGES ───────────────────────────────────
  /**
   * Get all messages from database
   * @returns {Promise<Object>}
   */
  getMessages: async () => {
    try {
      const response = await axiosInstance.get(
        '/messages'
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // ─── GET MESSAGE BY ID ──────────────────────────────────
  /**
   * Get a specific message by ID
   * @param {String} messageId
   * @returns {Promise<Object>}
   */
  getMessageById: async (messageId) => {
    try {
      const response = await axiosInstance.get(
        `/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching message:', error);
      throw error;
    }
  },

  // ─── GET MESSAGES BY RECIPIENT FILTER ──────────────────
  /**
   * Get messages filtered by role, year, division
   * @param {Object} filters - { recipientRole, academicYear, division }
   * @returns {Promise<Object>}
   */
  getMessagesByRecipient: async (filters) => {
    try {
      const response = await axiosInstance.get('/messages/filter/by-recipient', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching filtered messages:', error);
      throw error;
    }
  },

  // ─── GET MESSAGES BY SENDER ID ──────────────────────────
  /**
   * Get all messages sent by a specific sender
   * @param {String} senderId
   * @returns {Promise<Object>}
   */
  getMessagesBySender: async (senderId) => {
    try {
      const response = await axiosInstance.get(
        `/messages/sender/${senderId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sender messages:', error);
      throw error;
    }
  },

  // ─── UPDATE MESSAGE STATUS ─────────────────────────────
  /**
   * Update message delivery status
   * @param {String} messageId
   * @param {Object} statusData - { status, deliveredCount, readCount, failedCount }
   * @returns {Promise<Object>}
   */
  updateMessageStatus: async (messageId, statusData) => {
    try {
      const response = await axiosInstance.put(
        `/messages/status/${messageId}`,
        statusData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  },

  // ─── DELETE MESSAGE ────────────────────────────────────
  /**
   * Delete a message (soft delete)
   * @param {String} messageId
   * @returns {Promise<Object>}
   */
  deleteMessage: async (messageId) => {
    try {
      const response = await axiosInstance.delete(
        `/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
};

export default BroadcastService;
