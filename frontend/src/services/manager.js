import { apiClient } from './apiClient';

export const managerService = {
  getProperty: async () => {
    return await apiClient.get('/manager/property');
  },
  getReservations: async () => {
    return await apiClient.get('/manager/reservations');
  },
  getReservationById: async (id) => {
    return await apiClient.get(`/manager/reservations/${id}`);
  },
  createReservation: async (data) => {
    return await apiClient.post('/manager/reservations', data);
  },
  updateReservation: async (id, data) => {
    return await apiClient.put(`/manager/reservations/${id}`, data);
  },
  verifyIdProof: async (id, idData) => {
    return await apiClient.post(`/manager/reservations/${id}/verify-id`, idData);
  },
  assignRoom: async (id, roomNumber, roomType) => {
    return await apiClient.post(`/manager/reservations/${id}/assign-room`, { roomNumber, roomType });
  },
  deleteReservation: async (id) => {
    return await apiClient.delete(`/manager/reservations/${id}`);
  },
  getRooms: async () => {
    return await apiClient.get('/manager/rooms');
  },
  updateRoomStatus: async (roomNumber, status) => {
    return await apiClient.put(`/manager/rooms/${roomNumber}/status`, { status });
  },
  getGuests: async () => {
    return await apiClient.get('/manager/guests');
  },
  getApprovals: async () => {
    return await apiClient.get('/manager/approvals');
  },
  updateApproval: async (id, action, decisionReason) => {
    return await apiClient.post(`/manager/approvals/${id}`, { action, decisionReason });
  },
  getStaff: async () => {
    return await apiClient.get('/manager/staff');
  },
  getStaffMember: async (id) => {
    try {
      return await apiClient.get(`/manager/staff/${id}`);
    } catch (err) {
      try {
        return await apiClient.get(`/admin/staff/${id}`);
      } catch {}
      throw err;
    }
  },
  addStaff: async (data) => {
    return await apiClient.post('/manager/staff', data);
  },
  updateStaff: async (id, data) => {
    try {
      return await apiClient.put(`/manager/staff/${id}`, data);
    } catch (err) {
      const altId = data?._id || data?.id || id;
      try {
        return await apiClient.put(`/admin/staff/${altId}`, data);
      } catch {}
      try {
        return await apiClient.put(`/super-admin/staff/${altId}`, data);
      } catch {}
      throw err;
    }
  },
  deleteStaff: async (id) => {
    return await apiClient.delete(`/manager/staff/${id}`);
  },
  getShifts: async () => {
    return await apiClient.get('/manager/shifts');
  },
  assignShift: async (userId, username, shiftType) => {
    return await apiClient.post('/manager/shifts/assign', { userId, username, shiftType });
  },
  getAttendance: async () => {
    return await apiClient.get('/manager/attendance');
  },
  getFeedback: async (params = {}) => {
    return await apiClient.get('/manager/feedback', { params });
  },
  createFeedback: async (data) => {
    return await apiClient.post('/manager/feedback', data);
  },
  respondFeedback: async (id, response, status) => {
    return await apiClient.post(`/manager/feedback/${id}/respond`, { response, status });
  },
  updateFeedbackStatus: async (id, status) => {
    return await apiClient.put(`/manager/feedback/${id}/status`, { status });
  },
  deleteFeedback: async (id) => {
    return await apiClient.delete(`/manager/feedback/${id}`);
  },
  getBilling: async () => {
    return await apiClient.get('/manager/billing');
  },
  getPayments: async () => {
    return await apiClient.get('/manager/payments');
  },
  createPayment: async (data) => {
    return await apiClient.post('/manager/payments', data);
  },
  updatePayment: async (id, data) => {
    return await apiClient.put(`/manager/payments/${id}`, data);
  },
  deletePayment: async (id) => {
    return await apiClient.delete(`/manager/payments/${id}`);
  },
  recordPayment: async (id, amountPaid) => {
    return await apiClient.post(`/manager/billing/${id}/payment`, { amountPaid });
  },
  getNotifications: async () => {
    return await apiClient.get('/manager/notifications');
  },
  markNotificationRead: async (id) => {
    return await apiClient.post(`/manager/notifications/${id}/read`);
  },
  extendReservation: async (id, data) => {
    return await apiClient.put(`/manager/reservations/${id}/extend`, data);
  },
  extendStay: async (id, data) => {
    return await apiClient.put(`/manager/reservations/${id}/extend`, data);
  }
};

export default managerService;
