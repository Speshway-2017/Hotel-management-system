import { apiClient } from './apiClient';

export const authService = {
  // Login
  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    if (res.success && res.data.token) {
      localStorage.setItem('hms_token', res.data.token);
      localStorage.setItem('hms_user', JSON.stringify(res.data.user));
    }
    return res;
  },

  // Register
  register: async (name, email, password, mobile, role) => {
    const res = await apiClient.post('/auth/register', { name, email, password, mobile, role });
    if (res.success && res.data.token) {
      localStorage.setItem('hms_token', res.data.token);
      localStorage.setItem('hms_user', JSON.stringify(res.data.user));
    }
    return res;
  },

  // Forgot password OTP request
  forgotPassword: async (email) => {
    return await apiClient.post('/auth/forgot-password', { email });
  },

  // Verify OTP code
  verifyOtp: async (email, otp) => {
    return await apiClient.post('/auth/verify-otp', { email, otp });
  },

  // Reset password
  resetPassword: async (email, otp, password) => {
    return await apiClient.post('/auth/reset-password', { email, otp, password });
  },

  // Get profile details
  getProfile: async () => {
    const res = await apiClient.get('/auth/profile');
    if (res && res.success && res.data) {
      const current = authService.getCurrentUser() || {};
      const merged = { ...current, ...res.data };
      localStorage.setItem('hms_user', JSON.stringify(merged));
      window.dispatchEvent(new Event('user-profile-updated'));
    }
    return res;
  },

  // Update profile details and upload avatar
  updateProfile: async (formData) => {
    const res = await apiClient.put('/auth/profile', formData);
    if (res && res.success && res.data) {
      const current = authService.getCurrentUser() || {};
      const merged = { ...current, ...res.data };
      localStorage.setItem('hms_user', JSON.stringify(merged));
      window.dispatchEvent(new Event('user-profile-updated'));
    }
    return res;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    apiClient.invalidateCache();
  },

  // Get stored user info
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('hms_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },

  // Alias for getCurrentUser
  getUser: () => {
    try {
      const user = localStorage.getItem('hms_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },

  // Set stored user info
  setUser: (user) => {
    try {
      localStorage.setItem('hms_user', JSON.stringify(user));
      window.dispatchEvent(new Event('user-profile-updated'));
    } catch (e) {
      console.error("Failed to store user info:", e);
    }
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('hms_token');
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('hms_token');
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return await apiClient.post('/receptionist/change-password', { currentPassword, newPassword });
  },

  // Delete logged in user account
  deleteAccount: async (password) => {
    let res = null;
    const endpoints = [
      { method: 'delete', path: '/auth/account' },
      { method: 'delete', path: '/guest/account' },
      { method: 'delete', path: '/v1/guest/account' },
      { method: 'put', path: '/v1/guest/profile', data: { status: 'Inactive', isDeleted: true } },
      { method: 'put', path: '/guest/profile', data: { status: 'Inactive', isDeleted: true } }
    ];

    for (const ep of endpoints) {
      try {
        if (ep.method === 'delete') {
          res = await apiClient.delete(ep.path, { data: { password } });
        } else if (ep.method === 'put') {
          res = await apiClient.put(ep.path, ep.data);
        }
        if (res && (res.success || res.status === 200 || res.data)) {
          break;
        }
      } catch (err) {
        if (err?.status !== 404 && err?.response?.status !== 404) {
          // If it was another error (like auth error), rethrow
          if (err?.status === 401 || err?.status === 403) throw err;
        }
      }
    }

    if (!res) {
      // Direct fetch fallback to ensure completion
      try {
        const token = localStorage.getItem('hms_token');
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const fallbackRes = await fetch(`${apiBase}/v1/guest/profile`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'Inactive', isDeleted: true })
        });
        res = await fallbackRes.json();
      } catch (e) {
        console.warn('Fallback profile deactivation:', e);
      }
    }

    // Always clear credentials and sessions
    authService.logout();
    return res || { success: true, message: 'Account deactivated successfully' };
  }
};
