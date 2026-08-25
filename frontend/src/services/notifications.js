const API_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('hms_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

export const notificationsService = {
  getNotifications: async () => {
    return await request('/notifications');
  },
  getUnreadCount: async () => {
    return await request('/notifications/unread-count');
  },
  markNotificationRead: async (id) => {
    return await request(`/notifications/${id}/read`, {
      method: 'POST'
    });
  },
  markAllNotificationsRead: async () => {
    return await request('/notifications/read-all', {
      method: 'POST'
    });
  },
  deleteNotification: async (id) => {
    return await request(`/notifications/${id}`, {
      method: 'DELETE'
    });
  }
};
