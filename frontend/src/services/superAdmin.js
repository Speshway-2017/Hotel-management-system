import { apiClient } from './apiClient';

export const superAdminService = {
  getDashboardStats: async () => {
    return await apiClient.get('/super-admin/dashboard-stats');
  },
  getProperties: async () => {
    return await apiClient.get('/super-admin/properties');
  },
  getProperty: async (id) => {
    return await apiClient.get(`/super-admin/properties/${id}`);
  },
  createProperty: async (data) => {
    return await apiClient.post('/super-admin/properties', data);
  },
  updateProperty: async (id, data) => {
    return await apiClient.put(`/super-admin/properties/${id}`, data);
  },
  deleteProperty: async (id) => {
    return await apiClient.delete(`/super-admin/properties/${id}`);
  },
  
  getUsers: async () => {
    return await apiClient.get('/super-admin/users');
  },
  getUser: async (id) => {
    return await apiClient.get(`/super-admin/users/${id}`);
  },
  createUser: async (data) => {
    return await apiClient.post('/super-admin/users', data);
  },
  updateUser: async (id, data) => {
    return await apiClient.put(`/super-admin/users/${id}`, data);
  },
  deleteUser: async (id) => {
    return await apiClient.delete(`/super-admin/users/${id}`);
  },

  getReservations: async () => {
    return await apiClient.get('/super-admin/reservations');
  },
  createReservation: async (data) => {
    return await apiClient.post('/super-admin/reservations', data);
  },
  updateReservation: async (id, data) => {
    return await apiClient.put(`/super-admin/reservations/${id}`, data);
  },
  extendReservation: async (id, data) => {
    try {
      return await apiClient.post(`/super-admin/reservations/${id}/extend`, data);
    } catch (err) {
      return await apiClient.post(`/manager/reservations/${id}/extend`, data);
    }
  },
  verifyIdProof: async (id, data) => {
    return await apiClient.post(`/super-admin/reservations/${id}/verify-id`, data);
  },
  getGuestAadhaarStatus: async (id) => {
    return await apiClient.get(`/super-admin/reservations/${id}/guest-aadhaar-status`);
  },
  lookupGuestAadhaar: async (params) => {
    return await apiClient.get('/super-admin/guests/lookup-aadhaar', { params });
  },
  deleteReservation: async (id) => {
    return await apiClient.delete(`/super-admin/reservations/${id}`);
  },

  getAuditLogs: async () => {
    return await apiClient.get('/super-admin/audit-logs');
  },
  getApprovals: async () => {
    try {
      return await apiClient.get('/super-admin/approvals');
    } catch (e) {
      return await apiClient.get('/manager/approvals');
    }
  },
  updateApproval: async (id, action, decisionReason = '') => {
    try {
      return await apiClient.post(`/super-admin/approvals/${id}`, { action, decisionReason });
    } catch (e) {
      return await apiClient.post(`/manager/approvals/${id}`, { action, decisionReason });
    }
  },
  getCommissionReports: async () => {
    return await apiClient.get('/super-admin/commission-reports');
  },

  getCmsItems: async () => {
    return await apiClient.get('/super-admin/cms');
  },
  createCmsItem: async (data) => {
    return await apiClient.post('/super-admin/cms', data);
  },
  updateCmsItem: async (id, data) => {
    return await apiClient.put(`/super-admin/cms/${id}`, data);
  },
  deleteCmsItem: async (id) => {
    return await apiClient.delete(`/super-admin/cms/${id}`);
  },

  getAnnouncements: async () => {
    return await apiClient.get('/super-admin/notifications');
  },
  publishAnnouncement: async (data) => {
    return await apiClient.post('/super-admin/notifications', data);
  },

  getSubscriptionPlans: async () => {
    return await apiClient.get('/super-admin/plans');
  },
  getPlans: async () => {
    return await apiClient.get('/super-admin/plans');
  },
  createSubscriptionPlan: async (data) => {
    return await apiClient.post('/super-admin/plans', data);
  },
  updateSubscriptionPlan: async (id, data) => {
    return await apiClient.put(`/super-admin/plans/${id}`, data);
  },
  deleteSubscriptionPlan: async (id) => {
    return await apiClient.delete(`/super-admin/plans/${id}`);
  },

  getPromoCoupons: async () => {
    return await apiClient.get('/super-admin/coupons');
  },
  createPromoCoupon: async (data) => {
    return await apiClient.post('/super-admin/coupons', data);
  },
  updatePromoCoupon: async (id, data) => {
    return await apiClient.put(`/super-admin/coupons/${id}`, data);
  },
  deletePromoCoupon: async (id) => {
    return await apiClient.delete(`/super-admin/coupons/${id}`);
  },
  getSubscriptionRequests: async () => {
    return await apiClient.get('/super-admin/subscription/requests');
  },
  decideSubscriptionRequest: async (id, action, rejectionReason = '') => {
    return await apiClient.post(`/super-admin/subscription/requests/${id}/decide`, { action, rejectionReason });
  },

  getContactRequests: async () => {
    return await apiClient.get('/super-admin/contacts');
  },
  getContactRequest: async (id) => {
    return await apiClient.get(`/super-admin/contacts/${id}`);
  },
  updateContactRequestStatus: async (id, status) => {
    return await apiClient.patch(`/super-admin/contacts/${id}/status`, { status });
  },
  replyContactRequest: async (id, data) => {
    return await apiClient.post(`/super-admin/contacts/${id}/reply`, data);
  },
  deleteContactRequest: async (id) => {
    return await apiClient.delete(`/super-admin/contacts/${id}`);
  }
};

export default superAdminService;
