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
    const response = await fetch('http://localhost:5000/api/admin/upload', {
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
  getPayments: async () => {
    return await request('/manager/payments');
  },
  createPayment: async (data) => {
    return await request('/manager/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
