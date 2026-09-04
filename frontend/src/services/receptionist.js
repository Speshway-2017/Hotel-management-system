import { apiClient } from './apiClient';

export const receptionistService = {
  getProperty: async () => {
    return await apiClient.get('/receptionist/property');
  },
  getDashboard: async () => {
    return await apiClient.get('/receptionist/dashboard');
  },
  getGuests: async () => {
    return await apiClient.get('/receptionist/guests');
  },
  postGuestCharge: async (id, amount, description) => {
    return await apiClient.post(`/receptionist/guests/${id}/charge`, { amount, description });
  },
  extendGuestStay: async (id, days) => {
    return await apiClient.post(`/receptionist/guests/${id}/extend`, typeof days === 'object' ? days : { days });
  },
  extendReservation: async (id, data) => {
    try {
      return await apiClient.post(`/receptionist/reservations/${id}/extend`, data);
    } catch (err) {
      return await apiClient.post(`/manager/reservations/${id}/extend`, data);
    }
  },
  getRooms: async () => {
    return await apiClient.get('/receptionist/rooms');
  },
  updateRoomStatus: async (roomNumber, status, housekeeping) => {
    return await apiClient.put(`/receptionist/rooms/${roomNumber}/status`, { status, housekeeping });
  },
  getReservations: async () => {
    return await apiClient.get('/receptionist/reservations');
  },
  createReservation: async (data) => {
    return await apiClient.post('/receptionist/reservations', data);
  },
  updateReservationStatus: async (id, status, room, extraData = {}) => {
    return await apiClient.put(`/receptionist/reservations/${id}/status`, { status, room, ...extraData });
  },
  verifyIdProof: async (id, idData) => {
    return await apiClient.post(`/receptionist/reservations/${id}/verify-id`, idData);
  },
  getFolios: async () => {
    return await apiClient.get('/receptionist/folios');
  },
  getFolioDetails: async (id) => {
    return await apiClient.get(`/receptionist/folios/${id}`);
  },
  postFolioCharge: async (id, amount, description, category) => {
    return await apiClient.post(`/receptionist/folios/${id}/charges`, { amount, description, category });
  },
  postFolioPayment: async (id, amount, method) => {
    return await apiClient.post(`/receptionist/folios/${id}/payments`, { amount, method });
  },
  getPayments: async () => {
    return await apiClient.get('/receptionist/payments');
  },
  logPayment: async (data) => {
    return await apiClient.post('/receptionist/payments', data);
  },
  createPayment: async (data) => {
    return await apiClient.post('/receptionist/payments', data);
  },
  updatePayment: async (id, data) => {
    return await apiClient.put(`/receptionist/payments/${id}`, data);
  },
  getNotifications: async () => {
    return await apiClient.get('/receptionist/notifications');
  },
  markNotificationRead: async (id) => {
    return await apiClient.post(`/receptionist/notifications/${id}/read`);
  },
  markAllNotificationsRead: async () => {
    return await apiClient.post('/receptionist/notifications/read-all');
  },
  changePassword: async (currentPassword, newPassword) => {
    return await apiClient.post('/receptionist/change-password', { currentPassword, newPassword });
  },
  getFeedback: async () => {
    try {
      return await apiClient.get('/receptionist/feedback');
    } catch (err) {
      return await apiClient.get('/manager/feedback');
    }
  },
  createFeedback: async (data) => {
    try {
      return await apiClient.post('/receptionist/feedback', data);
    } catch (err) {
      return await apiClient.post('/manager/feedback', data);
    }
  },
  respondFeedback: async (id, response, status) => {
    try {
      return await apiClient.post(`/receptionist/feedback/${id}/respond`, { response, status });
    } catch (err) {
      return await apiClient.post(`/manager/feedback/${id}/respond`, { response, status });
    }
  },
  updateFeedbackStatus: async (id, status) => {
    try {
      return await apiClient.put(`/receptionist/feedback/${id}/status`, { status });
    } catch (err) {
      return await apiClient.put(`/manager/feedback/${id}/status`, { status });
    }
  }
};

export default receptionistService;
