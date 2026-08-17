const API_URL = 'http://localhost:5000/api/v1/public';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

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

export const publicService = {
  getBranding: async () => {
    return await request('/branding');
  },
  getHome: async () => {
    return await request('/home');
  },
  getAbout: async () => {
    return await request('/about');
  },
  getFeatures: async () => {
    return await request('/features');
  },
  getBlogs: async () => {
    return await request('/blogs');
  },
  getContact: async () => {
    return await request('/contact');
  },
  getSettings: async () => {
    return await request('/settings');
  },
  getFaqs: async () => {
    return await request('/faqs');
  },
  getMedia: async () => {
    return await request('/media');
  }
};
