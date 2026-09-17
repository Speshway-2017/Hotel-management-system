import { apiClient } from './apiClient';

const PUBLIC_PREFIX = '/v1/public';

export const publicService = {
  getBranding: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/branding`);
  },
  getHome: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/home`);
  },
  getAbout: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/about`);
  },
  getFeatures: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/features`);
  },
  getBlogs: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/blogs`);
  },
  getContact: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/contact`);
  },
  getSettings: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/settings`);
  },
  getFaqs: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/faqs`);
  },
  getMedia: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/media`);
  },
  getProperties: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/properties`);
  },
  getProperty: async (id) => {
    return await apiClient.get(`${PUBLIC_PREFIX}/properties/${id}`);
  },
  getPropertyRooms: async (id) => {
    return await apiClient.get(`${PUBLIC_PREFIX}/properties/${id}/rooms`);
  },
  createBooking: async (bookingData) => {
    return await apiClient.post(`${PUBLIC_PREFIX}/bookings`, bookingData);
  },
  submitContact: async (contactData) => {
    return await apiClient.post(`${PUBLIC_PREFIX}/contact`, contactData);
  },
  getSubscriptionPlans: async () => {
    return await apiClient.get(`${PUBLIC_PREFIX}/plans`);
  },
  getCoupons: async (propertyId = '', extraParams = {}) => {
    const params = typeof propertyId === 'object' && propertyId !== null
      ? propertyId
      : { ...(propertyId ? { propertyId } : {}), ...extraParams };
    return await apiClient.get(`${PUBLIC_PREFIX}/coupons`, { params });
  },
  validateCoupon: async (payload) => {
    return await apiClient.post(`${PUBLIC_PREFIX}/coupons/validate`, payload);
  }
};

export default publicService;
