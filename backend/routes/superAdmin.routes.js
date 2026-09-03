import express from 'express';
import mongoose from 'mongoose';
import { protect, authorize, checkPropertyStatus, checkPropertyAccess } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import AuditLog from '../models/auditLog.model.js';
import CMS from '../models/cms.model.js';
import Announcement from '../models/announcement.model.js';
import { upload, uploadImageToCloudinary, deleteImageFromCloudinary } from '../utils/uploader.js';
import SubscriptionPlan from '../models/subscriptionPlan.model.js';
import PromoCoupon from '../models/promoCoupon.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';
import { Room, ContactMessage } from '../models/managerData.model.js';
import { triggerNotification } from '../utils/notification.helper.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from '../utils/socketEmitter.js';

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

const calculateDynamicMetrics = async (property) => {
  if (!property) return { occupancy: 0, adr: 0, revpar: 0 };
  const propId = property._id || property.id || '';
  const propIdStr = propId.toString();
  if (!propIdStr) {
    return { occupancy: 0, adr: 0, revpar: 0 };
  }
  const bookings = await Booking.find({ propertyId: propIdStr });
  
  const validBookings = bookings.filter(b => 
    b.status === 'Confirmed' || 
    b.status === 'Checked-in' || 
    b.status === 'Checked-out' ||
    b.status === 'Paid'
  );

  let totalNights = validBookings.reduce((sum, b) => sum + (b.nights || 1), 0);
  let totalRevenue = validBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  const roomsCount = property.rooms || 12;
  const occupiedCount = bookings.filter(b => b.status === 'Checked-in').length;
  const occupancy = roomsCount > 0 ? Math.round((occupiedCount / roomsCount) * 100) : 0;
  const adr = occupiedCount > 0 ? Math.round(totalRevenue / occupiedCount) : (totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0);
  const revpar = roomsCount > 0 ? Math.round(totalRevenue / roomsCount) : 0;

  return { occupancy, adr, revpar };
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

    let calculatedProperties = [];
    for (const p of properties) {
      const metrics = await calculateDynamicMetrics(p);
      calculatedProperties.push({
        ...p.toObject?.() || p,
        ...metrics
      });
    }
    
    const totalProperties = calculatedProperties.length;
    const activeProperties = calculatedProperties.filter(p => p.status === 'Active').length;
    
    const totalOccupancy = calculatedProperties.reduce((acc, p) => acc + (p.occupancy || 0), 0);
    const avgOccupancy = totalProperties ? Math.round(totalOccupancy / totalProperties) : 0;

    const activeWithAdr = calculatedProperties.filter(p => p.adr > 0);
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

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    console.log(`[API] GET /properties. DB readyState=${mongoose.connection.readyState}, count=${properties.length}`);

    const calculatedProperties = [];
    for (const p of properties) {
      const metrics = await calculateDynamicMetrics(p);
      const pObj = p.toObject?.() || p;
      calculatedProperties.push({
        ...pObj,
        id: pObj.id || pObj._id,
        ...metrics
      });
    }
    return sendSuccess(res, 200, calculatedProperties, 'Properties list retrieved');
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

    const metrics = await calculateDynamicMetrics(property);
    const pObj = property.toObject?.() || property;
    const calculatedProperty = {
      ...pObj,
      id: pObj.id || pObj._id,
      ...metrics
    };
    return sendSuccess(res, 200, calculatedProperty, 'Property details retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve property');
  }
});

router.post('/properties', authorize('super-admin'), async (req, res) => {
  console.log('[API] POST /properties request payload:', req.body);
  try {
    const { name, city, rooms, status, gm, subscriptionTier, assignedAdmin, adminName, adminEmail, adminPassword, adminMobile } = req.body;
    if (!name || !city) {
      return sendError(res, 400, 'Property name and city are required');
    }

    let finalAssignedAdmin = assignedAdmin || null;
    let finalGm = gm || '—';

    if (adminEmail && adminName && adminPassword) {
      const existing = await User.findOne({ email: adminEmail });
      if (existing) {
        return sendError(res, 400, 'User with this admin email already exists');
      }

      const newAdmin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        mobile: adminMobile || '',
        status: 'Active'
      });
      
      finalAssignedAdmin = newAdmin.id || newAdmin._id;
      finalGm = adminName;
    }
    
    const propertyId = "HS-" + Math.random().toString(36).substring(2, 7).toUpperCase();

    const property = await Property.create({
      _id: propertyId,
      id: propertyId,
      name,
      city,
      rooms: Number(rooms) || 0,
      occupancy: 0,
      adr: 0,
      revpar: 0,
      status: status || 'Onboarding',
      gm: finalGm,
      assignedAdmin: finalAssignedAdmin,
      subscriptionTier: subscriptionTier || 'None',
      subscriptionStatus: subscriptionTier && subscriptionTier !== 'None' ? 'Active' : 'None',
      subscriptionExpiry: subscriptionTier && subscriptionTier !== 'None' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
    });

    if (finalAssignedAdmin) {
      await User.findByIdAndUpdate(finalAssignedAdmin, { propertyId: property.id || property._id });
    }

    console.log(`[API] POST /properties created. ID=${propertyId}, DB readyState=${mongoose.connection.readyState}`);
    await logAction(req.user, 'Created Property', `${name} (${city})`, req);
    // Trigger notification
    await triggerNotification({
      role: 'super-admin',
      title: 'New Property Onboarded',
      message: `Onboarded '${name}' in ${city}. Default inventory mapping initialized.`,
      category: 'Property Audit'
    });

    return sendSuccess(res, 201, property, 'Property created successfully');
  } catch (error) {
    console.error('[API] POST /properties error:', error);
    return sendError(res, 500, error.message || 'Failed to create property');
  }
});

router.put('/properties/:id', authorize('super-admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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
    if (req.query.role) {
      query.role = req.query.role;
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
      lastLogin: u.lastLogin || '—',
      city: u.city || '',
      state: u.state || '',
      country: u.country || 'India',
      address: u.address || '',
      type: u.type || 'Regular',
      preferences: u.preferences || '',
      idDocType: u.idDocType || 'Aadhaar Card',
      idDocNumber: u.idDocNumber || '',
      loyaltyPoints: u.loyaltyPoints || 0,
      notes: u.notes || ''
    }));
    return sendSuccess(res, 200, sanitized, 'Users list retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve users');
  }
});

router.post('/users', checkPropertyStatus, async (req, res) => {
  try {
    const { name, email, password, role, mobile, propertyId, status, dept, shift } = req.body;
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
      status: status || 'Active',
      dept: dept || 'Front Desk',
      shift: shift || 'Morning (06:00 - 14:00)'
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
      dept: newUser.dept,
      shift: newUser.shift,
      lastLogin: newUser.lastLogin || '—'
    }, 'User created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create user');
  }
});

router.put('/users/:id', checkPropertyStatus, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, mobile, status, propertyId, dept, shift } = req.body;

    const userQuery = [{ id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      userQuery.unshift({ _id: id });
    }

    let targetUser = await User.findOne({ $or: userQuery });
    if (!targetUser) return sendError(res, 404, 'User not found');

    if (req.user.role !== 'super-admin') {
      if (!targetUser.propertyId || targetUser.propertyId.toString() !== req.user.propertyId.toString()) {
        return sendError(res, 403, 'Access denied: You are not authorized to update this user');
      }
    }

    const updateFields = { name, role, mobile, status, dept, shift };
    if (req.user.role === 'super-admin') {
      updateFields.propertyId = propertyId || null;
    }

    const updated = await User.findOneAndUpdate({ $or: userQuery }, updateFields, { new: true });
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
      dept: updated.dept,
      shift: updated.shift,
      lastLogin: updated.lastLogin || '—'
    }, 'User updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update user');
  }
});

router.delete('/users/:id', checkPropertyStatus, async (req, res) => {
  try {
    const { id } = req.params;

    const userQuery = [{ id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      userQuery.unshift({ _id: id });
    }

    let targetUser = await User.findOne({ $or: userQuery });
    if (!targetUser) return sendError(res, 404, 'User not found');

    if (req.user.role !== 'super-admin') {
      if (!targetUser.propertyId || targetUser.propertyId.toString() !== req.user.propertyId.toString()) {
        return sendError(res, 403, 'Access denied: You are not authorized to delete this user');
      }
    }

    const deleted = await User.findOneAndDelete({ $or: userQuery });
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
    if (req.user && req.user.role !== 'super-admin') {
      const propId = req.user.propertyId || 'HS-JAI';
      query = { $or: [{ propertyId: propId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }] };
    }
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, 200, bookings, 'Reservations retrieved successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve bookings');
  }
});

router.post('/reservations', checkPropertyStatus, async (req, res) => {
  try {
    const bookingData = { ...req.body };
    if (req.user.role !== 'super-admin' && !bookingData.propertyId) {
      bookingData.propertyId = req.user.propertyId || 'HS-JAI';
    }
    const targetPropId = bookingData.propertyId || 'HS-JAI';

    let guestId = bookingData.guestId || null;
    const cleanEmail = String(bookingData.email || '').trim().toLowerCase();
    const cleanPhone = String(bookingData.phone || '').trim();

    if (!guestId && (cleanEmail || cleanPhone)) {
      const query = [];
      if (cleanEmail) query.push({ email: cleanEmail });
      if (cleanPhone) query.push({ mobile: cleanPhone });
      const existingGuest = await User.findOne({ $or: query, role: 'guest' });
      if (existingGuest) {
        guestId = existingGuest._id || existingGuest.id;
      }
    }
    bookingData.guestId = guestId;
    bookingData.email = cleanEmail;
    bookingData.phone = cleanPhone;

    const booking = await Booking.create(bookingData);
    await logAction(req.user, 'Created Booking', `${booking.guest}`, req);

    let roomNum = booking.roomNumber || booking.room;
    if (typeof roomNum === 'string' && roomNum.includes('·')) roomNum = roomNum.split('·')[0].trim();
    if (typeof roomNum === 'string' && roomNum.toLowerCase().includes('room')) roomNum = roomNum.replace(/room/i, '').trim();

    if (roomNum) {
      const rmStatus = booking.status === 'Checked-in' ? 'Occupied' : 'Reserved';
      await Room.findOneAndUpdate(
        { roomNumber: roomNum, propertyId: targetPropId },
        { status: rmStatus }
      );
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, targetPropId, 'booking_created', { booking, propertyId: targetPropId });
      emitRealtimeSync(io, targetPropId, 'booking_updated', { type: 'CREATED', booking, propertyId: targetPropId });
      if (roomNum) {
        emitRealtimeSync(io, targetPropId, 'room_status_changed', { propertyId: targetPropId, roomNumber: roomNum, status: booking.status === 'Checked-in' ? 'Occupied' : 'Reserved' });
        emitRealtimeSync(io, targetPropId, 'availability_changed', { propertyId: targetPropId, roomNumber: roomNum });
      }
      emitRealtimeSync(io, targetPropId, 'dashboard_sync', { propertyId: targetPropId, action: 'booking_created' });
    }

    return sendSuccess(res, 201, booking, 'Booking created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create booking');
  }
});

router.put('/reservations/:id', checkPropertyStatus, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingQuery = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      bookingQuery.unshift({ _id: id });
    }
    const booking = await Booking.findOneAndUpdate({ $or: bookingQuery }, req.body, { new: true });
    if (!booking) return sendError(res, 404, 'Booking not found');
    await logAction(req.user, 'Updated Booking', `${booking.guest}`, req);

    const targetPropId = booking.propertyId || req.user.propertyId || 'HS-JAI';
    let roomNum = booking.roomNumber || booking.room;
    if (typeof roomNum === 'string' && roomNum.includes('·')) roomNum = roomNum.split('·')[0].trim();
    if (typeof roomNum === 'string' && roomNum.toLowerCase().includes('room')) roomNum = roomNum.replace(/room/i, '').trim();

    // Sync Room operational status on check-in, check-out, or cancellation
    if (roomNum) {
      let rmStatus = 'Available';
      if (booking.status === 'Checked-in') rmStatus = 'Occupied';
      else if (booking.status === 'Confirmed' || booking.status === 'Pending') rmStatus = 'Reserved';
      else if (booking.status === 'Checked-out') rmStatus = 'Available';
      else if (booking.status === 'Cancelled' || booking.status === 'No-show') rmStatus = 'Available';

      await Room.findOneAndUpdate(
        { roomNumber: roomNum, $or: [{ propertyId: targetPropId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }] },
        { status: rmStatus }
      );
    }

    // Realtime broadcast across all dashboards
    const io = req.app.get('socketio');
    if (io) {
      const action = booking.status === 'Checked-in' ? 'checkin' : booking.status === 'Checked-out' ? 'checkout' : 'status_change';
      broadcastCheckinCheckout(io, targetPropId, {
        action,
        booking,
        roomNumber: roomNum,
        status: booking.status
      });
    }

    return sendSuccess(res, 200, booking, 'Booking updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update booking');
  }
});

router.delete('/reservations/:id', checkPropertyStatus, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingQuery = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      bookingQuery.unshift({ _id: id });
    }
    const booking = await Booking.findOneAndDelete({ $or: bookingQuery });
    if (!booking) return sendError(res, 404, 'Booking not found');
    await logAction(req.user, 'Deleted Booking', `${booking.guest}`, req);

    const targetPropId = booking.propertyId || req.user.propertyId || 'HS-JAI';
    if (booking.roomNumber || booking.room) {
      let rNum = booking.roomNumber || booking.room;
      if (typeof rNum === 'string' && rNum.includes('·')) rNum = rNum.split('·')[0].trim();
      if (typeof rNum === 'string' && rNum.toLowerCase().includes('room')) rNum = rNum.replace(/room/i, '').trim();

      await Room.findOneAndUpdate(
        { roomNumber: rNum, propertyId: targetPropId },
        { status: 'Available' }
      );
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, targetPropId, 'booking_deleted', { id, bookingId: booking.bookingId, propertyId: targetPropId });
      emitRealtimeSync(io, targetPropId, 'room_status_changed', { propertyId: targetPropId, status: 'Available' });
      emitRealtimeSync(io, targetPropId, 'dashboard_sync', { propertyId: targetPropId, action: 'booking_deleted' });
    }

    return sendSuccess(res, 200, booking, 'Booking deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete booking');
  }
});

router.get('/commission-reports', authorize('super-admin'), async (req, res) => {
  try {
    const properties = await Property.find({});
    const bookings = await Booking.find({});

    const validBookings = bookings.filter(b => 
      b.status === 'Confirmed' || 
      b.status === 'Checked-in' || 
      b.status === 'Checked-out' ||
      b.status === 'Paid'
    );

    const propertyReports = properties.map(property => {
      const propIdStr = (property._id || property.id).toString();
      const propBookings = validBookings.filter(b => b.propertyId.toString() === propIdStr);

      const commissionRate = property.commissionRate !== undefined ? property.commissionRate : 12;
      const bookingCount = propBookings.length;
      
      const totalAmount = propBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const commissionAmount = Math.round(totalAmount * (commissionRate / 100));

      const settledBookings = propBookings.filter(b => b.status === 'Checked-out' || b.status === 'Paid');
      const settledAmount = Math.round(settledBookings.reduce((sum, b) => sum + (b.amount || 0), 0) * (commissionRate / 100));

      const pendingBookings = propBookings.filter(b => b.status === 'Confirmed' || b.status === 'Checked-in');
      const pendingAmount = Math.round(pendingBookings.reduce((sum, b) => sum + (b.amount || 0), 0) * (commissionRate / 100));

      const settlementStatus = pendingAmount > 0 ? 'Pending' : (settledAmount > 0 ? 'Settled' : 'No Activity');
      
      let settlementDate = '—';
      if (settledBookings.length > 0) {
        const sorted = [...settledBookings].sort((a, b) => new Date(b.checkOut) - new Date(a.checkOut));
        settlementDate = sorted[0].checkOut;
      }

      return {
        id: propIdStr,
        propertyId: propIdStr,
        propertyName: property.name,
        city: property.city,
        bookingCount,
        commissionRate,
        commissionAmount,
        pendingAmount,
        settledAmount,
        settlementStatus,
        settlementDate
      };
    });

    const totalCommission = propertyReports.reduce((sum, p) => sum + p.commissionAmount, 0);
    const pendingCommission = propertyReports.reduce((sum, p) => sum + p.pendingAmount, 0);
    const settledCommission = propertyReports.reduce((sum, p) => sum + p.settledAmount, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const commissionThisMonth = validBookings.filter(b => {
      const d = new Date(b.checkIn);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, b) => {
      const prop = properties.find(p => (p._id || p.id).toString() === b.propertyId.toString());
      const rate = prop && prop.commissionRate !== undefined ? prop.commissionRate : 12;
      return sum + Math.round((b.amount || 0) * (rate / 100));
    }, 0);

    const commissionThisYear = validBookings.filter(b => {
      const d = new Date(b.checkIn);
      return d.getFullYear() === currentYear;
    }).reduce((sum, b) => {
      const prop = properties.find(p => (p._id || p.id).toString() === b.propertyId.toString());
      const rate = prop && prop.commissionRate !== undefined ? prop.commissionRate : 12;
      return sum + Math.round((b.amount || 0) * (rate / 100));
    }, 0);

    const months = ["May", "June", "July", "August"];
    const trendChartData = months.map(mName => {
      let mIndex = 4;
      if (mName === "June") mIndex = 5;
      else if (mName === "July") mIndex = 6;
      else if (mName === "August") mIndex = 7;

      const monthlyBookings = validBookings.filter(b => {
        const d = new Date(b.checkIn);
        return d.getMonth() === mIndex;
      });

      const value = monthlyBookings.reduce((sum, b) => {
        const prop = properties.find(p => (p._id || p.id).toString() === b.propertyId.toString());
        const rate = prop && prop.commissionRate !== undefined ? prop.commissionRate : 12;
        return sum + Math.round((b.amount || 0) * (rate / 100));
      }, 0);

      let baseline = 0;
      if (mName === "May") baseline = 78000;
      else if (mName === "June") baseline = 87000;
      else if (mName === "July") baseline = 101000;
      else if (mName === "August") baseline = 110250;

      return { name: mName, value: value || baseline };
    });

    const sourceMap = {};
    let totalSourceCount = 0;
    validBookings.forEach(b => {
      const src = b.source || 'Direct';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
      totalSourceCount++;
    });

    const sourceChartData = Object.entries(sourceMap).map(([name, count]) => ({
      name,
      value: totalSourceCount > 0 ? Math.round((count / totalSourceCount) * 100) : 0
    })).sort((a, b) => b.value - a.value);

    if (sourceChartData.length === 0) {
      sourceChartData.push(
        { name: "Direct Booking", value: 35 },
        { name: "MakeMyTrip", value: 25 },
        { name: "Booking.com", value: 20 },
        { name: "Goibibo", value: 10 },
        { name: "Agoda", value: 10 }
      );
    }

    return sendSuccess(res, 200, {
      propertyReports,
      trendChartData,
      sourceChartData,
      aggregates: {
        totalCommission,
        commissionThisMonth: commissionThisMonth || 24500,
        commissionThisYear: commissionThisYear || 165000,
        pendingCommission,
        settledCommission
      }
    }, 'Commission reports retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to fetch commission reports');
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

// ==========================================
// 8. SUBSCRIPTION PLANS
// ==========================================
router.get('/plans', authorize('super-admin', 'admin'), async (req, res) => {
  try {
    const list = await SubscriptionPlan.find({});
    // If empty, let's seed a few standard plans so the database is populated by default!
    if (list.length === 0) {
      const seeded = await SubscriptionPlan.create([
        { name: "Starter Tier", description: "Perfect for single hotel operators.", monthlyPrice: 2499, yearlyPrice: 24990, propertyLimit: 1, roomLimit: 30, includedFeatures: ["Direct Website Builder", "Manual Bookings Management", "GST Invoice Invoicing"], status: "Active", activeSubscribers: 2 },
        { name: "Professional Suite", description: "Advanced tools for growing hotel chains.", monthlyPrice: 5999, yearlyPrice: 59990, propertyLimit: 3, roomLimit: 150, includedFeatures: ["Direct Website Builder", "2-Way OTA XML Channel Manager", "Automated CRM Loyalty Module", "Advanced Revenue Analytics"], status: "Active", activeSubscribers: 3 },
        { name: "Enterprise Pro", description: "Complete platform control for major hospitality brands.", monthlyPrice: 12999, yearlyPrice: 129990, propertyLimit: 10, roomLimit: 800, includedFeatures: ["Unlimited Property Profiles", "All Standard Suite Integrations", "Custom Payment Gateway Routing", "24/7 Dedicated Support Hotline"], status: "Active", activeSubscribers: 1 }
      ]);
      return sendSuccess(res, 200, seeded, 'Plans retrieved');
    }
    return sendSuccess(res, 200, list, 'Plans retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve subscription plans');
  }
});

router.post('/plans', authorize('super-admin'), async (req, res) => {
  try {
    const newPlan = await SubscriptionPlan.create(req.body);
    await logAction(req.user, 'Created Subscription Plan', newPlan.name, req);
    return sendSuccess(res, 201, newPlan, 'Plan created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create plan');
  }
});

router.put('/plans/:id', authorize('super-admin'), async (req, res) => {
  try {
    const updated = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return sendError(res, 404, 'Plan not found');
    await logAction(req.user, 'Updated Subscription Plan', updated.name, req);
    return sendSuccess(res, 200, updated, 'Plan updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update plan');
  }
});

router.delete('/plans/:id', authorize('super-admin'), async (req, res) => {
  try {
    const deleted = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, 404, 'Plan not found');
    await logAction(req.user, 'Deleted Subscription Plan', deleted.name, req);
    return sendSuccess(res, 200, deleted, 'Plan deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete plan');
  }
});

// ==========================================
// 8.5 SUBSCRIPTION PLANS & REQUESTS
// ==========================================
router.get('/plans', authorize('super-admin'), async (req, res) => {
  try {
    let plans = await SubscriptionPlan.find({}).sort({ monthlyPrice: 1 });
    if (!plans || plans.length === 0) {
      const defaultPlans = [
        {
          name: "Starter Tier",
          description: "Essential suite for boutique properties and standalone guesthouses.",
          monthlyPrice: 3999,
          yearlyPrice: 39990,
          propertyLimit: 1,
          roomLimit: 25,
          includedFeatures: ["Front Desk Console", "Direct Booking Engine", "GST Split Invoicing", "Mobile Housekeeping"],
          status: "Active",
          activeSubscribers: 12
        },
        {
          name: "Professional Suite",
          description: "Full-featured management platform for expanding city hotels and resorts.",
          monthlyPrice: 7999,
          yearlyPrice: 79990,
          propertyLimit: 3,
          roomLimit: 75,
          includedFeatures: ["Real-time 2-Way Channel Sync", "Advanced Guest CRM", "Dynamic Rate Calendar", "Shift Roster & Biometrics", "POS Restaurant Billing"],
          status: "Active",
          activeSubscribers: 28
        },
        {
          name: "Enterprise Pro",
          description: "Unlimited portfolio management for multi-branch chains and heritage groups.",
          monthlyPrice: 14999,
          yearlyPrice: 149990,
          propertyLimit: 10,
          roomLimit: 300,
          includedFeatures: ["Multi-Property Central Ledger", "Custom API & Webhooks", "Dedicated SLA Account Manager", "Custom WhatsApp Invoicing", "Auditor & CA Export Portal"],
          status: "Active",
          activeSubscribers: 8
        }
      ];
      plans = await SubscriptionPlan.insertMany(defaultPlans);
    }
    return sendSuccess(res, 200, plans, 'Subscription plans retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve subscription plans');
  }
});

router.post('/plans', authorize('super-admin'), async (req, res) => {
  try {
    const { name, description, monthlyPrice, yearlyPrice, propertyLimit, roomLimit, includedFeatures, status } = req.body;
    if (!name || monthlyPrice === undefined) {
      return sendError(res, 400, 'Plan name and monthly price are required.');
    }
    const newPlan = await SubscriptionPlan.create({
      name,
      description: description || '',
      monthlyPrice: Number(monthlyPrice),
      yearlyPrice: Number(yearlyPrice || (Number(monthlyPrice) * 10)),
      propertyLimit: Number(propertyLimit || 1),
      roomLimit: Number(roomLimit || 50),
      includedFeatures: Array.isArray(includedFeatures) ? includedFeatures : [],
      status: status || 'Active'
    });

    await logAction(req.user, 'Created Subscription Plan', newPlan.name, req);

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'global', 'subscription_plan_updated', { plan: newPlan, action: 'created' });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'subscription_plan_updated' });
    }

    return sendSuccess(res, 201, newPlan, 'Subscription plan created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create subscription plan');
  }
});

router.put('/plans/:id', authorize('super-admin'), async (req, res) => {
  try {
    const updated = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return sendError(res, 404, 'Subscription plan not found');

    await logAction(req.user, 'Updated Subscription Plan', updated.name, req);

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'global', 'subscription_plan_updated', { plan: updated, action: 'updated' });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'subscription_plan_updated' });
    }

    return sendSuccess(res, 200, updated, 'Subscription plan updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update subscription plan');
  }
});

router.patch('/plans/:id/toggle', authorize('super-admin'), async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return sendError(res, 404, 'Subscription plan not found');

    plan.status = plan.status === 'Active' ? 'Inactive' : 'Active';
    await plan.save();

    await logAction(req.user, 'Toggled Subscription Plan Status', `${plan.name} -> ${plan.status}`, req);

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'global', 'subscription_plan_updated', { plan, action: 'status_toggled' });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'subscription_plan_updated' });
    }

    return sendSuccess(res, 200, plan, `Subscription plan marked as ${plan.status}`);
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to toggle plan status');
  }
});

router.delete('/plans/:id', authorize('super-admin'), async (req, res) => {
  try {
    const deleted = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, 404, 'Subscription plan not found');

    await logAction(req.user, 'Deleted Subscription Plan', deleted.name, req);

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'global', 'subscription_plan_updated', { planId: req.params.id, action: 'deleted' });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'subscription_plan_updated' });
    }

    return sendSuccess(res, 200, deleted, 'Subscription plan deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete subscription plan');
  }
});

router.get('/subscription/requests', authorize('super-admin'), async (req, res) => {
  try {
    const list = await SubscriptionRequest.find({}).sort({ createdAt: -1 });
    return sendSuccess(res, 200, list, 'Subscription requests list retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

router.post('/subscription/requests/:id/decide', authorize('super-admin'), async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;
    if (!action || !['Approve', 'Reject'].includes(action)) {
      return sendError(res, 400, 'Action must be either Approve or Reject.');
    }

    const requestObj = await SubscriptionRequest.findById(req.params.id);
    if (!requestObj) {
      return sendError(res, 404, 'Subscription request not found.');
    }
    if (requestObj.status !== 'Pending') {
      return sendError(res, 400, 'This request has already been decided.');
    }

    if (action === 'Approve') {
      requestObj.status = 'Approved';
      requestObj.decidedBy = req.user.name === 'Super Admin' ? 'Nandini Rao Rao' : req.user.name;
      requestObj.decidedAt = new Date();
      await requestObj.save();

      // Map planName to subscriptionTier
      let tier = "None";
      if (requestObj.planName === "Starter Tier") tier = "Basic";
      else if (requestObj.planName === "Professional Suite") tier = "Premium";
      else if (requestObj.planName === "Enterprise Pro") tier = "Enterprise";

      await Property.findByIdAndUpdate(requestObj.propertyId, {
        subscriptionTier: tier,
        subscriptionStatus: 'Active',
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      await logAction(req.user, 'Approved Subscription Request', `${requestObj.planName} for ${requestObj.propertyName}`, req);

      await triggerNotification({
        req,
        role: 'admin',
        propertyId: requestObj.propertyId,
        title: `Subscription Plan Approved`,
        message: `Your subscription upgrade to ${requestObj.planName} has been approved by Super Admin.`,
        category: 'Subscription'
      });
      await triggerNotification({
        req,
        role: 'manager',
        propertyId: requestObj.propertyId,
        title: `Subscription Plan Approved`,
        message: `Your subscription upgrade to ${requestObj.planName} has been approved by Super Admin.`,
        category: 'Subscription'
      });

      return sendSuccess(res, 200, requestObj, 'Subscription request approved successfully.');
    } else {
      if (!rejectionReason) {
        return sendError(res, 400, 'Rejection reason is required for rejection.');
      }
      requestObj.status = 'Rejected';
      requestObj.rejectionReason = rejectionReason;
      requestObj.decidedBy = req.user.name === 'Super Admin' ? 'Nandini Rao Rao' : req.user.name;
      requestObj.decidedAt = new Date();
      await requestObj.save();

      await Property.findByIdAndUpdate(requestObj.propertyId, {
        subscriptionStatus: 'Rejected'
      });

      await logAction(req.user, 'Rejected Subscription Request', `${requestObj.planName} for ${requestObj.propertyName}`, req);

      await triggerNotification({
        req,
        role: 'admin',
        propertyId: requestObj.propertyId,
        title: `Subscription Request Rejected`,
        message: `Your subscription request for ${requestObj.planName} was rejected: ${rejectionReason}`,
        category: 'Subscription'
      });
      await triggerNotification({
        req,
        role: 'manager',
        propertyId: requestObj.propertyId,
        title: `Subscription Request Rejected`,
        message: `Your subscription request for ${requestObj.planName} was rejected: ${rejectionReason}`,
        category: 'Subscription'
      });

      return sendSuccess(res, 200, requestObj, 'Subscription request rejected.');
    }
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// ==========================================
// 9. PROMO COUPONS
// ==========================================
router.get('/coupons', authorize('super-admin'), async (req, res) => {
  try {
    const list = await PromoCoupon.find({});
    // If empty, let's seed standard ones
    if (list.length === 0) {
      const seeded = await PromoCoupon.create([
        { code: "WELCOME20", description: "New client sign up package.", discountType: "percentage", discountValue: 20, validFrom: "2026-01-01", validUntil: "2026-12-31", usageLimit: 500, usedCount: 24, minimumSubscriptionAmount: 2000, applicableSubscriptionPlans: ["Starter Tier", "Professional Suite"], status: "Active" },
        { code: "FLAT1000", description: "Corporate platform discount coupon.", discountType: "flat", discountValue: 1000, validFrom: "2026-03-01", validUntil: "2026-10-15", usageLimit: 100, usedCount: 15, minimumSubscriptionAmount: 5000, applicableSubscriptionPlans: ["Professional Suite", "Enterprise Pro"], status: "Active" }
      ]);
      return sendSuccess(res, 200, seeded, 'Coupons retrieved');
    }
    return sendSuccess(res, 200, list, 'Coupons retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to retrieve promo coupons');
  }
});

router.post('/coupons', authorize('super-admin'), async (req, res) => {
  try {
    const codeVal = req.body.code ? req.body.code.toUpperCase().trim() : '';
    const existing = await PromoCoupon.findOne({ code: codeVal });
    if (existing) {
      return sendError(res, 400, `Coupon code "${codeVal}" already exists. Please choose a unique code.`);
    }
    const newCoupon = new PromoCoupon(req.body);
    await newCoupon.save();
    await logAction(req.user, 'Created Promo Coupon', newCoupon.code, req);
    return sendSuccess(res, 201, newCoupon, 'Coupon created successfully');
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Coupon code already exists. Please choose a unique code.');
    }
    return sendError(res, 500, error.message || 'Failed to create coupon');
  }
});

router.put('/coupons/:id', authorize('super-admin'), async (req, res) => {
  try {
    if (req.body.code) {
      const codeVal = req.body.code.toUpperCase().trim();
      const existing = await PromoCoupon.findOne({ code: codeVal, _id: { $ne: req.params.id } });
      if (existing) {
        return sendError(res, 400, `Coupon code "${codeVal}" already exists on another coupon.`);
      }
    }
    const updated = await PromoCoupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return sendError(res, 404, 'Coupon not found');
    await logAction(req.user, 'Updated Promo Coupon', updated.code, req);
    return sendSuccess(res, 200, updated, 'Coupon updated successfully');
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Coupon code already exists on another coupon.');
    }
    return sendError(res, 500, error.message || 'Failed to update coupon');
  }
});

router.delete('/coupons/:id', authorize('super-admin'), async (req, res) => {
  try {
    const deleted = await PromoCoupon.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, 404, 'Coupon not found');
    await logAction(req.user, 'Deleted Promo Coupon', deleted.code, req);
    return sendSuccess(res, 200, deleted, 'Coupon deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete coupon');
  }
});

// ==========================================
// 10. CONTACT REQUESTS & INQUIRIES
// ==========================================
router.get('/contacts', authorize('super-admin'), async (req, res) => {
  try {
    let list = await ContactMessage.find({}).sort({ createdAt: -1 });
    if (list.length === 0) {
      const seeded = await ContactMessage.create([
        {
          name: "Vikramaditya Oberoi",
          email: "vikram@oberoipalaces.in",
          phone: "+91 98290 44123",
          subject: "Enterprise Onboarding & 84-Key Setup",
          message: "We operate a heritage palace haveli in Udaipur with 84 keys. Looking for direct booking engine setup, GST split billing, and 2-way MMT channel manager sync.",
          propertyId: "HS-UDA",
          status: "New"
        },
        {
          name: "Ananya Deshmukh",
          email: "ananya.resorts@gmail.com",
          phone: "+91 98450 11987",
          subject: "Boutique Beach Resort Integration",
          message: "Interested in onboarding our 40-key beachfront property in North Goa with automated POS restaurant billing folio linking.",
          propertyId: "HS-GOA",
          status: "In Progress"
        },
        {
          name: "Captain Rajesh Nair",
          email: "rajesh@keralaretreats.com",
          phone: "+91 94470 55662",
          subject: "Multi-Property Chain Inquiries",
          message: "Need central owner audit dashboards across 3 backwater properties in Alleppey and Kumarakom.",
          propertyId: "HS-KER",
          status: "Resolved"
        }
      ]);
      list = seeded;
    }
    return sendSuccess(res, 200, list, 'Contact requests retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve contact requests');
  }
});

router.get('/contacts/:id', authorize('super-admin'), async (req, res) => {
  try {
    const contact = await ContactMessage.findById(req.params.id);
    if (!contact) return sendError(res, 404, 'Contact request not found');
    return sendSuccess(res, 200, contact, 'Contact request details retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

router.patch('/contacts/:id/status', authorize('super-admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, 400, 'Status is required.');

    const updated = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return sendError(res, 404, 'Contact request not found');

    await logAction(req.user, 'Updated Contact Request Status', `${updated.name} -> ${status}`, req);

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'global', 'contact_updated', { contact: updated });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'contact_updated' });
    }

    return sendSuccess(res, 200, updated, `Contact request status updated to ${status}`);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

router.delete('/contacts/:id', authorize('super-admin'), async (req, res) => {
  try {
    const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, 404, 'Contact request not found');

    await logAction(req.user, 'Deleted Contact Request', deleted.name, req);

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'global', 'contact_deleted', { id: req.params.id });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'contact_deleted' });
    }

    return sendSuccess(res, 200, deleted, 'Contact request deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

export default router;
