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
  }
};
