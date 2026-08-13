import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import AuditLog from '../models/auditLog.model.js';
import CMS from '../models/cms.model.js';
import Announcement from '../models/announcement.model.js';

const router = express.Router();

router.use(protect);
router.use(authorize('super-admin'));

const logAction = async (user, action, entity, req) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    await AuditLog.create({
      user: user.email || 'superadmin@hourstay.in',
      action,
      entity,
      ip
    });
  } catch (err) {
    console.error('Audit log failed', err);
  }
};

// ==========================================
// 1. DASHBOARD OVERVIEW & STATS
// ==========================================
router.get('/dashboard-stats', async (req, res) => {
  try {
    const properties = await Property.find({});
    const bookings = await Booking.find({});
    
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.status === 'Active').length;
    
    const totalOccupancy = properties.reduce((acc, p) => acc + (p.occupancy || 0), 0);
    const avgOccupancy = totalProperties ? Math.round(totalOccupancy / totalProperties) : 0;

    const activeWithAdr = properties.filter(p => p.adr > 0);
    const avgAdr = activeWithAdr.length ? Math.round(activeWithAdr.reduce((acc, p) => acc + p.adr, 0) / activeWithAdr.length) : 0;
    
    const totalRevenue = bookings.reduce((acc, b) => acc + (b.amount || 0), 0);

    return sendSuccess(res, 200, {
      stats: [
        { label: "Portfolio occupancy", value: `${avgOccupancy}%`, delta: 6, hint: "vs last month" },
        { label: "Consolidated Revenue", value: `₹${(totalRevenue / 100000).toFixed(2)} Lakh`, delta: 11, hint: "Total bookings value" },
        { label: "Group ADR", value: `₹${avgAdr.toLocaleString('en-IN')}`, delta: 4 },
        { label: "Active properties", value: String(activeProperties), hint: `${totalProperties - activeProperties} onboarding/inactive` }
      ]
    }, 'Dashboard stats compiled');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to fetch dashboard stats');
  }
});

// ==========================================
// 2. PROPERTY MANAGEMENT (CRUD)
// ==========================================
router.get('/properties', async (req, res) => {
  try {
    const properties = await Property.find({});
    return sendSuccess(res, 200, properties, 'Properties list retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve properties');
  }
});

router.post('/properties', async (req, res) => {
  try {
    const { name, city, rooms, occupancy, adr, status, gm, subscriptionTier } = req.body;
    if (!name || !city) {
      return sendError(res, 400, 'Property name and city are required');
    }
    
    const calculatedRevpar = Math.round((Number(occupancy || 0) * Number(adr || 0)) / 100);

    const property = await Property.create({
      name,
      city,
      rooms: Number(rooms) || 0,
      occupancy: Number(occupancy) || 0,
      adr: Number(adr) || 0,
      revpar: calculatedRevpar,
      status: status || 'Onboarding',
      gm: gm || '—',
      subscriptionTier: subscriptionTier || 'None',
      subscriptionStatus: subscriptionTier && subscriptionTier !== 'None' ? 'Active' : 'None',
      subscriptionExpiry: subscriptionTier && subscriptionTier !== 'None' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
    });

    await logAction(req.user, 'Created Property', `${name} (${city})`, req);
    return sendSuccess(res, 201, property, 'Property created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create property');
  }
});

router.put('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.occupancy !== undefined || updateData.adr !== undefined) {
      const current = await Property.findById(id);
      const newOccupancy = updateData.occupancy !== undefined ? Number(updateData.occupancy) : current.occupancy;
      const newAdr = updateData.adr !== undefined ? Number(updateData.adr) : current.adr;
      updateData.revpar = Math.round((newOccupancy * newAdr) / 100);
    }

    const updated = await Property.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return sendError(res, 404, 'Property not found');

    await logAction(req.user, 'Updated Property', `${updated.name}`, req);
    return sendSuccess(res, 200, updated, 'Property updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update property');
  }
});

router.delete('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Property.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, 'Property not found');

    await logAction(req.user, 'Deleted Property', `${deleted.name}`, req);
    return sendSuccess(res, 200, deleted, 'Property deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete property');
  }
});

// ==========================================
// 3. USER & STAFF MANAGEMENT (CRUD)
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    const sanitized = users.map(u => ({
      id: u.id || u._id,
      _id: u.id || u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      mobile: u.mobile || '—',
      status: u.status || 'Active'
    }));
    return sendSuccess(res, 200, sanitized, 'Users list retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve users');
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, mobile } = req.body;
    if (!name || !email || !password || !role) {
      return sendError(res, 400, 'All fields (name, email, password, role) are required');
    }

    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 400, 'User with this email already exists');

    const newUser = await User.create({
      name,
      email,
      password,
      role,
      mobile: mobile || ''
    });

    await logAction(req.user, 'Created User', `${name} (${role})`, req);
    return sendSuccess(res, 201, {
      id: newUser.id || newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      mobile: newUser.mobile
    }, 'User created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create user');
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, mobile, status } = req.body;

    const updated = await User.findByIdAndUpdate(id, { name, role, mobile, status }, { new: true });
    if (!updated) return sendError(res, 404, 'User not found');

    await logAction(req.user, 'Updated User', `${updated.name}`, req);
    return sendSuccess(res, 200, {
      id: updated.id || updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      mobile: updated.mobile,
      status: updated.status
    }, 'User updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update user');
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, 'User not found');

    await logAction(req.user, 'Deleted User', `${deleted.name}`, req);
    return sendSuccess(res, 200, deleted, 'User deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete user');
  }
});

// ==========================================
// 4. RESERVATIONS
// ==========================================
router.get('/reservations', async (req, res) => {
  try {
    const bookings = await Booking.find({});
    return sendSuccess(res, 200, bookings, 'Reservations retrieved successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve bookings');
  }
});

// ==========================================
// 5. AUDIT LOGS
// ==========================================
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find({});
    return sendSuccess(res, 200, logs, 'Audit logs retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch audit logs');
  }
});

// ==========================================
// 6. CMS PAGES & FAQ
// ==========================================
router.get('/cms', async (req, res) => {
  try {
    const cmsItems = await CMS.find({});
    return sendSuccess(res, 200, cmsItems, 'CMS items retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve CMS items');
  }
});

router.post('/cms', async (req, res) => {
  try {
    const cmsItem = await CMS.create(req.body);
    await logAction(req.user, 'Created CMS item', `${cmsItem.title || cmsItem.question}`, req);
    return sendSuccess(res, 201, cmsItem, 'CMS item created');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create CMS item');
  }
});

router.put('/cms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await CMS.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return sendError(res, 404, 'CMS item not found');
    await logAction(req.user, 'Updated CMS item', `${updated.title || updated.question}`, req);
    return sendSuccess(res, 200, updated, 'CMS item updated');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update CMS item');
  }
});

router.delete('/cms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CMS.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, 'CMS item not found');
    await logAction(req.user, 'Deleted CMS item', `${deleted.title || deleted.question}`, req);
    return sendSuccess(res, 200, deleted, 'CMS item deleted');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete CMS item');
  }
});

// ==========================================
// 7. NOTIFICATIONS / ANNOUNCEMENTS
// ==========================================
router.get('/notifications', async (req, res) => {
  try {
    const list = await Announcement.find({});
    return sendSuccess(res, 200, list, 'Announcements retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve announcements');
  }
});

router.post('/notifications', async (req, res) => {
  try {
    const { title, body, tone } = req.body;
    if (!title || !body) return sendError(res, 400, 'Title and body are required');
    const newAnn = await Announcement.create({ title, body, tone: tone || 'info' });
    await logAction(req.user, 'Published Announcement', title, req);
    return sendSuccess(res, 201, newAnn, 'Announcement published');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to publish announcement');
  }
});

export default router;
