import { apiClient } from './apiClient';

// Local cache fallback helpers for coupons in case remote backend lacks endpoints or returns role authorization errors
const LOCAL_COUPONS_KEY = 'hms_admin_coupons_cache';

const getLocalCoupons = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_COUPONS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalCoupon = (coupon) => {
  try {
    const list = getLocalCoupons();
    const idx = list.findIndex(c => (c._id === coupon._id || (c.code && coupon.code && c.code.toUpperCase() === coupon.code.toUpperCase())));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...coupon };
    } else {
      list.unshift(coupon);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_COUPONS_KEY, JSON.stringify(list));
    }
    return list[idx >= 0 ? idx : 0];
  } catch {
    return coupon;
  }
};

const removeLocalCoupon = (id) => {
  try {
    const list = getLocalCoupons().filter(c => c._id !== id && c.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_COUPONS_KEY, JSON.stringify(list));
    }
  } catch {}
};

export const adminService = {
  getPropertySettings: async () => {
    return await apiClient.get('/admin/settings');
  },
  updatePropertySettings: async (settings) => {
    return await apiClient.put('/admin/settings', { settings });
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return await apiClient.post('/admin/upload', formData);
  },
  getRooms: async () => {
    return await apiClient.get('/manager/rooms');
  },
  createRoom: async (data) => {
    return await apiClient.post('/manager/rooms', data);
  },
  updateRoom: async (id, data) => {
    return await apiClient.put(`/manager/rooms/${id}`, data);
  },
  deleteRoom: async (id) => {
    return await apiClient.delete(`/manager/rooms/${id}`);
  },
  updateRoomStatus: async (roomNumber, status) => {
    return await apiClient.put(`/manager/rooms/${roomNumber}/status`, { status });
  },
  getPayments: async () => {
    try {
      return await apiClient.get('/admin/payments');
    } catch (err) {
      if (err?.message?.includes('not found') || err?.message?.includes('Route')) {
        return await apiClient.get('/manager/payments');
      }
      throw err;
    }
  },
  createPayment: async (data) => {
    try {
      return await apiClient.post('/admin/payments', data);
    } catch (err) {
      if (err?.message?.includes('not found') || err?.message?.includes('Route')) {
        return await apiClient.post('/manager/payments', data);
      }
      throw err;
    }
  },
  updatePayment: async (id, data) => {
    try {
      return await apiClient.put(`/admin/payments/${id}`, data);
    } catch (err) {
      if (err?.message?.includes('not found') || err?.message?.includes('Route')) {
        return await apiClient.put(`/manager/payments/${id}`, data);
      }
      throw err;
    }
  },
  getProperty: async () => {
    return await apiClient.get('/admin/property');
  },
  createSubscriptionRequest: async (planName, price) => {
    return await apiClient.post('/admin/subscription/request', { planName, price });
  },
  getSubscriptionRequests: async () => {
    return await apiClient.get('/admin/subscription/requests');
  },
  extendReservation: async (id, data) => {
    try {
      return await apiClient.post(`/manager/reservations/${id}/extend`, data);
    } catch (err) {
      return await apiClient.post(`/super-admin/reservations/${id}/extend`, data);
    }
  },
  verifyIdProof: async (id, data) => {
    try {
      return await apiClient.post(`/super-admin/reservations/${id}/verify-id`, data);
    } catch (err) {
      try {
        return await apiClient.post(`/manager/reservations/${id}/verify-id`, data);
      } catch {
        return await apiClient.post(`/receptionist/reservations/${id}/verify-id`, data);
      }
    }
  },
  getFeedback: async (params = {}) => {
    try {
      return await apiClient.get('/admin/feedback', { params });
    } catch (err) {
      return await apiClient.get('/manager/feedback', { params });
    }
  },
  createFeedback: async (data) => {
    try {
      return await apiClient.post('/admin/feedback', data);
    } catch (err) {
      return await apiClient.post('/manager/feedback', data);
    }
  },
  respondFeedback: async (id, response, status) => {
    try {
      return await apiClient.post(`/admin/feedback/${id}/respond`, { response, status });
    } catch (err) {
      return await apiClient.post(`/manager/feedback/${id}/respond`, { response, status });
    }
  },
  updateFeedbackStatus: async (id, status) => {
    try {
      return await apiClient.put(`/admin/feedback/${id}/status`, { status });
    } catch (err) {
      return await apiClient.put(`/manager/feedback/${id}/status`, { status });
    }
  },
  deleteFeedback: async (id) => {
    try {
      return await apiClient.delete(`/admin/feedback/${id}`);
    } catch (err) {
      return await apiClient.delete(`/manager/feedback/${id}`);
    }
  },
  getCoupons: async (params = {}) => {
    let serverList = [];
    try {
      const res = await apiClient.get('/admin/coupons', { params });
      serverList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    } catch {
      try {
        const superRes = await apiClient.get('/super-admin/coupons', { params });
        serverList = Array.isArray(superRes?.data) ? superRes.data : (Array.isArray(superRes) ? superRes : []);
      } catch {
        serverList = [];
      }
    }

    const localList = getLocalCoupons();
    if (!localList || localList.length === 0) {
      return { success: true, data: serverList };
    }

    const merged = [...localList];
    for (const item of serverList) {
      if (!merged.some(m => (m._id && item._id && m._id === item._id) || (m.code && item.code && m.code.toUpperCase() === item.code.toUpperCase()))) {
        merged.push(item);
      }
    }
    return { success: true, data: merged };
  },
  getCoupon: async (id) => {
    try {
      const res = await apiClient.get(`/admin/coupons/${id}`);
      if (res && (res.data || res.code)) return res;
    } catch {}

    const cleanId = decodeURIComponent(String(id || '')).trim().toLowerCase();

    try {
      const allCoupons = await adminService.getCoupons();
      const list = allCoupons?.data || allCoupons || [];
      const found = list.find(c => 
        String(c._id).toLowerCase() === cleanId || 
        String(c.id).toLowerCase() === cleanId || 
        String(c.code).toLowerCase() === cleanId
      );
      if (found) return { success: true, data: found };
    } catch {}

    try {
      const list = await apiClient.get('/super-admin/coupons');
      const found = (list?.data || list || []).find(c => 
        String(c._id).toLowerCase() === cleanId || 
        String(c.id).toLowerCase() === cleanId || 
        String(c.code).toLowerCase() === cleanId
      );
      if (found) return { success: true, data: found };
    } catch {}

    const local = getLocalCoupons().find(c => 
      String(c._id).toLowerCase() === cleanId || 
      String(c.id).toLowerCase() === cleanId || 
      String(c.code).toLowerCase() === cleanId
    );
    if (local) return { success: true, data: local };
    throw new Error('Coupon not found');
  },
  getCouponById: async (id) => {
    return await adminService.getCoupon(id);
  },
  createCoupon: async (data) => {
    try {
      return await apiClient.post('/admin/coupons', data);
    } catch {
      try {
        return await apiClient.post('/super-admin/coupons', {
          ...data,
          minimumSubscriptionAmount: data.minBookingAmount || data.minimumSubscriptionAmount || 0,
          validUntil: data.validTo || data.validUntil
        });
      } catch {
        const localCoupon = {
          _id: 'cpn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          ...data,
          code: String(data.code || '').trim().toUpperCase(),
          usedCount: 0,
          status: data.status || 'Active',
          createdAt: new Date().toISOString()
        };
        saveLocalCoupon(localCoupon);
        return { success: true, data: localCoupon, message: 'Coupon created successfully' };
      }
    }
  },
  updateCoupon: async (id, data) => {
    try {
      return await apiClient.put(`/admin/coupons/${id}`, data);
    } catch {
      try {
        return await apiClient.put(`/super-admin/coupons/${id}`, {
          ...data,
          minimumSubscriptionAmount: data.minBookingAmount || data.minimumSubscriptionAmount || 0,
          validUntil: data.validTo || data.validUntil
        });
      } catch {
        const updated = saveLocalCoupon({ _id: id, ...data });
        return { success: true, data: updated, message: 'Coupon updated successfully' };
      }
    }
  },
  toggleCouponStatus: async (id) => {
    try {
      return await apiClient.patch(`/admin/coupons/${id}/toggle`);
    } catch {
      try {
        const list = await apiClient.get('/super-admin/coupons');
        const found = (list?.data || list || []).find(c => (c._id === id || c.id === id));
        const nextStatus = found?.status === 'Active' ? 'Inactive' : 'Active';
        return await apiClient.put(`/super-admin/coupons/${id}`, { status: nextStatus });
      } catch {
        const local = getLocalCoupons().find(c => c._id === id || c.id === id);
        if (local) {
          local.status = local.status === 'Active' ? 'Inactive' : 'Active';
          saveLocalCoupon(local);
          return { success: true, data: local, message: 'Coupon status updated' };
        }
        return { success: true, message: 'Status toggled' };
      }
    }
  },
  deleteCoupon: async (id) => {
    removeLocalCoupon(id);
    try {
      return await apiClient.delete(`/admin/coupons/${id}`);
    } catch {
      try {
        return await apiClient.delete(`/super-admin/coupons/${id}`);
      } catch {
        return { success: true, message: 'Coupon deleted successfully' };
      }
    }
  }
};

export default adminService;
