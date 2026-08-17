import { superAdminService } from './superAdmin';

export const brandingService = {
  getCmsItems: async () => {
    return await superAdminService.getCmsItems();
  },
  createCmsItem: async (data) => {
    return await superAdminService.createCmsItem(data);
  },
  getBranding: async () => {
    const res = await superAdminService.getCmsItems();
    return res.data ? res.data.find(item => item.type === 'branding') : null;
  },
  updateBranding: async (id, data) => {
    return await superAdminService.updateCmsItem(id, { type: 'branding', ...data });
  },
  getHome: async () => {
    const res = await superAdminService.getCmsItems();
    return res.data ? res.data.find(item => item.type === 'home') : null;
  },
  updateHome: async (id, data) => {
    return await superAdminService.updateCmsItem(id, { type: 'home', ...data });
  },
  getAbout: async () => {
    const res = await superAdminService.getCmsItems();
    return res.data ? res.data.find(item => item.type === 'about') : null;
  },
  updateAbout: async (id, data) => {
    return await superAdminService.updateCmsItem(id, { type: 'about', ...data });
  },
  getFeatures: async () => {
    const res = await superAdminService.getCmsItems();
    return res.data ? res.data.filter(item => item.type === 'feature') : [];
  },
  createFeature: async (data) => {
    return await superAdminService.createCmsItem({ type: 'feature', ...data });
  },
  updateFeature: async (id, data) => {
    return await superAdminService.updateCmsItem(id, { type: 'feature', ...data });
  },
  deleteFeature: async (id) => {
    return await superAdminService.deleteCmsItem(id);
  },
  getBlogs: async () => {
    const res = await superAdminService.getCmsItems();
    return res.data ? res.data.filter(item => item.type === 'blog') : [];
  },
  createBlog: async (data) => {
    return await superAdminService.createCmsItem({ type: 'blog', ...data });
  },
  updateBlog: async (id, data) => {
    return await superAdminService.updateCmsItem(id, { type: 'blog', ...data });
  },
  deleteBlog: async (id) => {
    return await superAdminService.deleteCmsItem(id);
  },
  getContact: async () => {
    const res = await superAdminService.getCmsItems();
    return res.data ? res.data.find(item => item.type === 'contact') : null;
  },
  updateContact: async (id, data) => {
    return await superAdminService.updateCmsItem(id, { type: 'contact', ...data });
  }
};
