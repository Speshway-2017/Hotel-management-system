import express from 'express';
import { protect, authorize, checkPropertyStatus, checkPropertyAccess } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import AuditLog from '../models/auditLog.model.js';
import CMS from '../models/cms.model.js';
import Announcement from '../models/announcement.model.js';
import { upload, uploadImageToCloudinary, deleteImageFromCloudinary } from '../utils/uploader.js';

const router = express.Router();

router.use(protect);

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
// IMAGE UPLOAD ROUTE
// ==========================================
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No image file uploaded');
    }
    const result = await uploadImageToCloudinary(req.file.path);
    return sendSuccess(res, 200, result, 'Image uploaded successfully');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// ==========================================
// 1. DASHBOARD OVERVIEW & STATS
// ==========================================
router.get('/dashboard-stats', checkPropertyStatus, async (req, res) => {
  try {
    let properties = [];
    let bookings = [];

    if (req.user.role === 'super-admin') {
      properties = await Property.find({});
      bookings = await Booking.find({});
    } else {
      const prop = await Property.findById(req.user.propertyId);
      properties = prop ? [prop] : [];
      bookings = await Booking.find({ propertyId: req.user.propertyId });
    }
    
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.status === 'Active').length;
    
    const totalOccupancy = properties.reduce((acc, p) => acc + (p.occupancy || 0), 0);
    const avgOccupancy = totalProperties ? Math.round(totalOccupancy / totalProperties) : 0;

    const activeWithAdr = properties.filter(p => p.adr > 0);
    const totalAdr = activeWithAdr.reduce((acc, p) => acc + (p.adr || 0), 0);
    const avgAdr = activeWithAdr.length ? Math.round(totalAdr / activeWithAdr.length) : 0;

    const totalRev = bookings.reduce((acc, b) => acc + (b.amount || 0), 0);
    const activeReservations = bookings.filter(b => b.status === 'confirmed' || b.status === 'Paid').length;

    return sendSuccess(res, 200, {
      totalProperties,
      activeProperties,
      avgOccupancy,
      avgAdr,
      totalRev,
      activeReservations
    }, 'Dashboard stats retrieved successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve dashboard stats');
  }
});

// ==========================================
// 2. PROPERTY MANAGEMENT (CRUD)
// ==========================================
router.get('/properties', checkPropertyStatus, checkPropertyAccess, async (req, res) => {
  try {
    let properties;
    if (req.user.role === 'super-admin') {
      properties = await Property.find({}).populate('assignedAdmin');
    } else {
      properties = await Property.find({ _id: req.user.propertyId }).populate('assignedAdmin');
    }
    return sendSuccess(res, 200, properties, 'Properties list retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve properties');
  }
});

router.get('/properties/:id', checkPropertyStatus, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role !== 'super-admin' && req.user.propertyId.toString() !== id.toString()) {
      return sendError(res, 403, 'Access denied: You are not authorized to view this property.');
    }

    const property = await Property.findById(id).populate('assignedAdmin');
    if (!property) return sendError(res, 404, 'Property not found');

    return sendSuccess(res, 200, property, 'Property details retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve property');
  }
});

router.post('/properties', authorize('super-admin'), async (req, res) => {
  try {
    const { name, city, rooms, occupancy, adr, status, gm, subscriptionTier, assignedAdmin } = req.body;
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
      assignedAdmin: assignedAdmin || null,
      subscriptionTier: subscriptionTier || 'None',
      subscriptionStatus: subscriptionTier && subscriptionTier !== 'None' ? 'Active' : 'None',
      subscriptionExpiry: subscriptionTier && subscriptionTier !== 'None' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
    });

    if (assignedAdmin) {
      await User.findByIdAndUpdate(assignedAdmin, { propertyId: property.id || property._id });
    }

    await logAction(req.user, 'Created Property', `${name} (${city})`, req);
    return sendSuccess(res, 201, property, 'Property created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create property');
  }
});

router.put('/properties/:id', authorize('super-admin'), async (req, res) => {
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

    if (updateData.assignedAdmin) {
      await User.findByIdAndUpdate(updateData.assignedAdmin, { propertyId: updated.id || updated._id });
    }

    await logAction(req.user, 'Updated Property', `${updated.name}`, req);
    return sendSuccess(res, 200, updated, 'Property updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update property');
  }
});

router.put('/properties/:propertyId/assign-admin', authorize('super-admin'), async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return sendError(res, 400, 'Admin ID is required');
    }

    const updated = await Property.findByIdAndUpdate(propertyId, { assignedAdmin: adminId }, { new: true });
    if (!updated) return sendError(res, 404, 'Property not found');

    await User.findByIdAndUpdate(adminId, { propertyId });

    await logAction(req.user, 'Assigned Admin to Property', `${updated.name}`, req);
    return sendSuccess(res, 200, updated, 'Admin assigned to property successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to assign admin');
  }
});

router.delete('/properties/:id', authorize('super-admin'), async (req, res) => {
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
router.get('/users', checkPropertyStatus, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'super-admin') {
      query.propertyId = req.user.propertyId;
    }
    const users = await User.find(query);
    const sanitized = users.map(u => ({
      id: u.id || u._id,
      _id: u.id || u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      mobile: u.mobile || '—',
      status: u.status || 'Active',
      propertyId: u.propertyId || null,
      lastLogin: u.lastLogin || '—'
    }));
    return sendSuccess(res, 200, sanitized, 'Users list retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve users');
  }
});

router.post('/users', checkPropertyStatus, async (req, res) => {
  try {
    const { name, email, password, role, mobile, propertyId, status } = req.body;
    if (!name || !email || !password || !role) {
      return sendError(res, 400, 'All fields (name, email, password, role) are required');
    }

    let targetPropertyId = propertyId || null;
    if (req.user.role !== 'super-admin') {
      targetPropertyId = req.user.propertyId;
      if (role === 'super-admin') {
        return sendError(res, 403, 'Access denied: You cannot create super-admin users');
      }
    }

    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 400, 'User with this email already exists');

    const newUser = await User.create({
      name,
      email,
      password,
      role,
      mobile: mobile || '',
      propertyId: targetPropertyId,
      status: status || 'Active'
    });

    await logAction(req.user, 'Created User', `${name} (${role})`, req);
    return sendSuccess(res, 201, {
      id: newUser.id || newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      mobile: newUser.mobile,
      propertyId: newUser.propertyId,
      status: newUser.status,
      lastLogin: newUser.lastLogin || '—'
    }, 'User created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create user');
  }
});

router.put('/users/:id', checkPropertyStatus, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, mobile, status, propertyId } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) return sendError(res, 404, 'User not found');

    if (req.user.role !== 'super-admin') {
      if (!targetUser.propertyId || targetUser.propertyId.toString() !== req.user.propertyId.toString()) {
        return sendError(res, 403, 'Access denied: You are not authorized to update this user');
      }
    }

    const updateFields = { name, role, mobile, status };
    if (req.user.role === 'super-admin') {
      updateFields.propertyId = propertyId || null;
    }

    const updated = await User.findByIdAndUpdate(id, updateFields, { new: true });
    if (!updated) return sendError(res, 404, 'User not found');

    await logAction(req.user, 'Updated User', `${updated.name}`, req);
    return sendSuccess(res, 200, {
      id: updated.id || updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      mobile: updated.mobile,
      status: updated.status,
      propertyId: updated.propertyId,
      lastLogin: updated.lastLogin || '—'
    }, 'User updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update user');
  }
});

router.delete('/users/:id', checkPropertyStatus, async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) return sendError(res, 404, 'User not found');

    if (req.user.role !== 'super-admin') {
      if (!targetUser.propertyId || targetUser.propertyId.toString() !== req.user.propertyId.toString()) {
        return sendError(res, 403, 'Access denied: You are not authorized to delete this user');
      }
    }

    const deleted = await User.findByIdAndDelete(id);
    await logAction(req.user, 'Deleted User', `${deleted.name}`, req);
    return sendSuccess(res, 200, deleted, 'User deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete user');
  }
});

// ==========================================
// 4. RESERVATIONS
// ==========================================
router.get('/reservations', checkPropertyStatus, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'super-admin') {
      query.propertyId = req.user.propertyId;
    }
    const bookings = await Booking.find(query);
    return sendSuccess(res, 200, bookings, 'Reservations retrieved successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve bookings');
  }
});

router.post('/reservations', checkPropertyStatus, async (req, res) => {
  try {
    const bookingData = { ...req.body };
    if (req.user.role !== 'super-admin') {
      bookingData.propertyId = req.user.propertyId;
    }
    const booking = await Booking.create(bookingData);
    await logAction(req.user, 'Created Booking', `${booking.guest}`, req);
    return sendSuccess(res, 201, booking, 'Booking created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create booking');
  }
});

router.put('/reservations/:id', checkPropertyStatus, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!booking) return sendError(res, 404, 'Booking not found');
    await logAction(req.user, 'Updated Booking', `${booking.guest}`, req);
    return sendSuccess(res, 200, booking, 'Booking updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update booking');
  }
});

router.delete('/reservations/:id', checkPropertyStatus, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return sendError(res, 404, 'Booking not found');
    await logAction(req.user, 'Deleted Booking', `${booking.guest}`, req);
    return sendSuccess(res, 200, booking, 'Booking deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete booking');
  }
});

// ==========================================
// 5. AUDIT LOGS
// ==========================================
router.get('/audit-logs', authorize('super-admin'), async (req, res) => {
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
router.get('/cms', authorize('super-admin'), async (req, res) => {
  try {
    const cmsItems = await CMS.find({});
    return sendSuccess(res, 200, cmsItems, 'CMS items retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve CMS items');
  }
});

router.post('/cms', authorize('super-admin'), async (req, res) => {
  try {
    const cmsItem = await CMS.create(req.body);
    await logAction(req.user, 'Created CMS item', `${cmsItem.title || cmsItem.question}`, req);
    return sendSuccess(res, 201, cmsItem, 'CMS item created');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create CMS item');
  }
});

router.put('/cms/:id', authorize('super-admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const oldItem = await CMS.findById(id);
    const updated = await CMS.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return sendError(res, 404, 'CMS item not found');

    // If image was replaced, remove old image
    if (oldItem && oldItem.imagePublicId && req.body.imagePublicId && oldItem.imagePublicId !== req.body.imagePublicId) {
      await deleteImageFromCloudinary(oldItem.imagePublicId);
    }

    await logAction(req.user, 'Updated CMS item', `${updated.title || updated.question}`, req);
    return sendSuccess(res, 200, updated, 'CMS item updated');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update CMS item');
  }
});

router.delete('/cms/:id', authorize('super-admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CMS.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, 'CMS item not found');

    // Clean up associated image
    if (deleted.imagePublicId) {
      await deleteImageFromCloudinary(deleted.imagePublicId);
    }

    await logAction(req.user, 'Deleted CMS item', `${deleted.title || deleted.question}`, req);
    return sendSuccess(res, 200, deleted, 'CMS item deleted');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete CMS item');
  }
});

// ==========================================
// 7. NOTIFICATIONS / ANNOUNCEMENTS
// ==========================================
router.get('/notifications', authorize('super-admin'), async (req, res) => {
  try {
    const list = await Announcement.find({});
    return sendSuccess(res, 200, list, 'Announcements retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve announcements');
  }
});

router.post('/notifications', authorize('super-admin'), async (req, res) => {
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
