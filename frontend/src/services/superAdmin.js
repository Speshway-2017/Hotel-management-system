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

export const superAdminService = {
  getDashboardStats: async () => {
    return await request('/super-admin/dashboard-stats');
  },
  getProperties: async () => {
    return await request(`/super-admin/properties?t=${Date.now()}`);
  },
  getProperty: async (id) => {
    return await request(`/super-admin/properties/${id}`);
  },
  createProperty: async (data) => {
    return await request('/super-admin/properties', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateProperty: async (id, data) => {
    return await request(`/super-admin/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteProperty: async (id) => {
    return await request(`/super-admin/properties/${id}`, {
      method: 'DELETE'
    });
  },
  
  getUsers: async () => {
    return await request(`/super-admin/users?t=${Date.now()}`);
  },
  createUser: async (data) => {
    return await request('/super-admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateUser: async (id, data) => {
    return await request(`/super-admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteUser: async (id) => {
    return await request(`/super-admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  getReservations: async () => {
    return await request(`/super-admin/reservations?t=${Date.now()}`);
  },
  createReservation: async (data) => {
    return await request('/super-admin/reservations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateReservation: async (id, data) => {
    return await request(`/super-admin/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteReservation: async (id) => {
    return await request(`/super-admin/reservations/${id}`, {
      method: 'DELETE'
    });
  },

  getAuditLogs: async () => {
    return await request('/super-admin/audit-logs');
  },
  getCommissionReports: async () => {
    return await request('/super-admin/commission-reports');
  },

  getCmsItems: async () => {
    return await request('/super-admin/cms');
  },
  createCmsItem: async (data) => {
    return await request('/super-admin/cms', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateCmsItem: async (id, data) => {
    return await request(`/super-admin/cms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteCmsItem: async (id) => {
    return await request(`/super-admin/cms/${id}`, {
      method: 'DELETE'
    });
  },

  getAnnouncements: async () => {
    return await request('/super-admin/notifications');
  },
  publishAnnouncement: async (data) => {
    return await request('/super-admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getSubscriptionPlans: async () => {
    return await request('/super-admin/plans');
  },
  createSubscriptionPlan: async (data) => {
    return await request('/super-admin/plans', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateSubscriptionPlan: async (id, data) => {
    return await request(`/super-admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteSubscriptionPlan: async (id) => {
    return await request(`/super-admin/plans/${id}`, {
      method: 'DELETE'
    });
  },

  getPromoCoupons: async () => {
    return await request('/super-admin/coupons');
  },
  createPromoCoupon: async (data) => {
    return await request('/super-admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updatePromoCoupon: async (id, data) => {
    return await request(`/super-admin/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deletePromoCoupon: async (id) => {
    return await request(`/super-admin/coupons/${id}`, {
      method: 'DELETE'
    });
  }
};
