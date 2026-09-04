import { apiClient } from './apiClient';

export const notificationsService = {
  getNotifications: async () => {
    return await apiClient.get('/notifications');
  },
  getUnreadCount: async () => {
    return await apiClient.get('/notifications/unread-count');
  },
  markNotificationRead: async (id) => {
    return await apiClient.post(`/notifications/${id}/read`);
  },
  markAllNotificationsRead: async () => {
    return await apiClient.post('/notifications/read-all');
  },
  deleteNotification: async (id) => {
    return await apiClient.delete(`/notifications/${id}`);
  }
};

export default notificationsService;
