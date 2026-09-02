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

export const managerService = {
  getProperty: async () => {
    return await request('/manager/property');
  },
  getReservations: async () => {
    return await request(`/manager/reservations?t=${Date.now()}`);
  },
  getReservationById: async (id) => {
    return await request(`/manager/reservations/${id}`);
  },
  createReservation: async (data) => {
    return await request('/manager/reservations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateReservation: async (id, data) => {
    return await request(`/manager/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  assignRoom: async (id, roomNumber, roomType) => {
    return await request(`/manager/reservations/${id}/assign-room`, {
      method: 'POST',
      body: JSON.stringify({ roomNumber, roomType })
    });
  },
  deleteReservation: async (id) => {
    return await request(`/manager/reservations/${id}`, {
      method: 'DELETE'
    });
  },
  getRooms: async () => {
    return await request(`/manager/rooms?t=${Date.now()}`);
  },
  updateRoomStatus: async (roomNumber, status) => {
    return await request(`/manager/rooms/${roomNumber}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },
  getGuests: async () => {
    return await request(`/manager/guests?t=${Date.now()}`);
  },
  getApprovals: async () => {
    return await request(`/manager/approvals?t=${Date.now()}`);
  },
  updateApproval: async (id, action, decisionReason) => {
    return await request(`/manager/approvals/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action, decisionReason })
    });
  },
  getStaff: async () => {
    return await request(`/manager/staff?t=${Date.now()}`);
  },
  addStaff: async (data) => {
    return await request('/manager/staff', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateStaff: async (id, data) => {
    return await request(`/manager/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  getShifts: async () => {
    return await request(`/manager/shifts?t=${Date.now()}`);
  },
  assignShift: async (userId, username, shiftType) => {
    return await request('/manager/shifts/assign', {
      method: 'POST',
      body: JSON.stringify({ userId, username, shiftType })
    });
  },
  getAttendance: async () => {
    return await request(`/manager/attendance?t=${Date.now()}`);
  },
  getFeedback: async () => {
    return await request(`/manager/feedback?t=${Date.now()}`);
  },
  respondFeedback: async (id, response) => {
    return await request(`/manager/feedback/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response })
    });
  },
  getBilling: async () => {
    return await request(`/manager/billing?t=${Date.now()}`);
  },
  recordPayment: async (id, amountPaid) => {
    return await request(`/manager/billing/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amountPaid })
    });
  },
  getNotifications: async () => {
    return await request(`/manager/notifications?t=${Date.now()}`);
  },
  markNotificationRead: async (id) => {
    return await request(`/manager/notifications/${id}/read`, {
      method: 'POST'
    });
  },
  extendReservation: async (id, data) => {
    return await request(`/manager/reservations/${id}/extend`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};
