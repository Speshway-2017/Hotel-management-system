const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

export const adminService = {
  getPropertySettings: async () => {
    return await request('/admin/settings');
  },
  updatePropertySettings: async (settings) => {
    return await request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings })
    });
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('hms_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}/admin/upload`, {
      method: 'POST',
      body: formData,
      headers
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Image upload failed');
    }
    return data;
  },
  getRooms: async () => {
    return await request('/manager/rooms');
  },
  createRoom: async (data) => {
    return await request('/manager/rooms', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateRoom: async (id, data) => {
    return await request(`/manager/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteRoom: async (id) => {
    return await request(`/manager/rooms/${id}`, {
      method: 'DELETE'
    });
  },
  updateRoomStatus: async (roomNumber, status) => {
    return await request(`/manager/rooms/${roomNumber}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },
  getPayments: async () => {
    try {
      return await request('/admin/payments');
    } catch (err) {
      if (err?.message?.includes('not found') || err?.message?.includes('Route')) {
        return await request('/manager/payments');
      }
      throw err;
    }
  },
  createPayment: async (data) => {
    try {
      return await request('/admin/payments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (err) {
      if (err?.message?.includes('not found') || err?.message?.includes('Route')) {
        return await request('/manager/payments', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
      throw err;
    }
  },
  updatePayment: async (id, data) => {
    try {
      return await request(`/admin/payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (err) {
      if (err?.message?.includes('not found') || err?.message?.includes('Route')) {
        return await request(`/manager/payments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      }
      throw err;
    }
  },
  getProperty: async () => {
    return await request('/admin/property');
  },
  createSubscriptionRequest: async (planName, price) => {
    return await request('/admin/subscription/request', {
      method: 'POST',
      body: JSON.stringify({ planName, price })
    });
  },
  getSubscriptionRequests: async () => {
    return await request('/admin/subscription/requests');
  }
};
