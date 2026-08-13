const API_URL = 'http://localhost:5000/api';

// Helper to make API requests
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

export const authService = {
  // Login
  login: async (email, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.success && res.data.token) {
      localStorage.setItem('hms_token', res.data.token);
      localStorage.setItem('hms_user', JSON.stringify(res.data.user));
    }
    return res;
  },

  // Register
  register: async (name, email, password, mobile, role) => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, mobile, role })
    });
    if (res.success && res.data.token) {
      localStorage.setItem('hms_token', res.data.token);
      localStorage.setItem('hms_user', JSON.stringify(res.data.user));
    }
    return res;
  },

  // Forgot password OTP request
  forgotPassword: async (email) => {
    return await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Verify OTP code
  verifyOtp: async (email, otp) => {
    return await request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  },

  // Reset password
  resetPassword: async (email, otp, password) => {
    return await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, password })
    });
  },

  // Get profile details
  getProfile: async () => {
    const res = await request('/auth/profile');
    if (res.success && res.data) {
      localStorage.setItem('hms_user', JSON.stringify(res.data));
    }
    return res;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
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

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('hms_token');
  }
};
