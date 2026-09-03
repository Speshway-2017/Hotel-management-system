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

export const receptionistService = {
  getProperty: async () => {
    return await request(`/receptionist/property?t=${Date.now()}`);
  },
  getDashboard: async () => {
    return await request(`/receptionist/dashboard?t=${Date.now()}`);
  },
  getGuests: async () => {
    return await request(`/receptionist/guests?t=${Date.now()}`);
  },
  postGuestCharge: async (id, amount, description) => {
    return await request(`/receptionist/guests/${id}/charge`, {
      method: 'POST',
      body: JSON.stringify({ amount, description })
    });
  },
  extendGuestStay: async (id, days) => {
    return await request(`/receptionist/guests/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days })
    });
  },
  getRooms: async () => {
    return await request(`/receptionist/rooms?t=${Date.now()}`);
  },
  updateRoomStatus: async (roomNumber, status, housekeeping) => {
    return await request(`/receptionist/rooms/${roomNumber}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, housekeeping })
    });
  },
  getReservations: async () => {
    return await request(`/receptionist/reservations?t=${Date.now()}`);
  },
  createReservation: async (data) => {
    return await request('/receptionist/reservations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateReservationStatus: async (id, status, room) => {
    return await request(`/receptionist/reservations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, room })
    });
  },
  getFolios: async () => {
    return await request(`/receptionist/folios?t=${Date.now()}`);
  },
  getFolioDetails: async (id) => {
    return await request(`/receptionist/folios/${id}?t=${Date.now()}`);
  },
  postFolioCharge: async (id, amount, description, category) => {
    return await request(`/receptionist/folios/${id}/charges`, {
      method: 'POST',
      body: JSON.stringify({ amount, description, category })
    });
  },
  postFolioPayment: async (id, amount, method) => {
    return await request(`/receptionist/folios/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount, method })
    });
  },
  getPayments: async () => {
    return await request(`/receptionist/payments?t=${Date.now()}`);
  },
  logPayment: async (data) => {
    return await request('/receptionist/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getNotifications: async () => {
    return await request(`/receptionist/notifications?t=${Date.now()}`);
  },
  markNotificationRead: async (id) => {
    return await request(`/receptionist/notifications/${id}/read`, {
      method: 'POST'
    });
  },
  markAllNotificationsRead: async () => {
    return await request('/receptionist/notifications/read-all', {
      method: 'POST'
    });
  },
  changePassword: async (currentPassword, newPassword) => {
    return await request('/receptionist/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }
};
