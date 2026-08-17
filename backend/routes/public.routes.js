import express from 'express';
import CMS from '../models/cms.model.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = express.Router();

// GET /api/v1/public/branding
router.get('/branding', async (req, res) => {
  try {
    const config = await CMS.findOne({ type: 'branding' });
    return sendSuccess(res, 200, config || {}, 'Public branding retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// GET /api/v1/public/home
router.get('/home', async (req, res) => {
  try {
    const config = await CMS.findOne({ type: 'home' });
    return sendSuccess(res, 200, config || {}, 'Public home config retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// GET /api/v1/public/about
router.get('/about', async (req, res) => {
  try {
    const config = await CMS.findOne({ type: 'about' });
    return sendSuccess(res, 200, config || {}, 'Public about config retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// GET /api/v1/public/features
router.get('/features', async (req, res) => {
  try {
    const features = await CMS.find({ type: 'feature', status: { $ne: 'Inactive' } });
    return sendSuccess(res, 200, features, 'Public active features retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// GET /api/v1/public/blogs
router.get('/blogs', async (req, res) => {
  try {
    const blogs = await CMS.find({ type: 'blog', status: { $ne: 'Draft' } });
    return sendSuccess(res, 200, blogs, 'Public active blogs retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// GET /api/v1/public/contact
router.get('/contact', async (req, res) => {
  try {
    const contact = await CMS.findOne({ type: 'contact' });
    return sendSuccess(res, 200, contact || {}, 'Public contact details retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// GET /api/v1/public/settings
router.get('/settings', async (req, res) => {
  try {
    const config = await CMS.findOne({ type: 'settings' });
    return sendSuccess(res, 200, config || {}, 'Public settings retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// GET /api/v1/public/faqs
router.get('/faqs', async (req, res) => {
  try {
    const faqs = await CMS.find({ type: 'faq' });
    return sendSuccess(res, 200, faqs, 'Public FAQs retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// GET /api/v1/public/media
router.get('/media', async (req, res) => {
  try {
    const doc = await CMS.findOne({ type: 'media_assets' });
    return sendSuccess(res, 200, doc ? JSON.parse(doc.content) : {}, 'Media mapping retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

export default router;
