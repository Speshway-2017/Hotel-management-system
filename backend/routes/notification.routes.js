import express from 'express';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import Booking from '../models/booking.model.js';
import { ManagerNotification } from '../models/managerData.model.js';
import { protect } from '../middleware/auth.middleware.js';
import { emitRealtimeSync } from '../utils/socketEmitter.js';

const router = express.Router();

let lastSyncAllRoleTime = 0;
let isSeededMap = new Map();

// Helper to seed initial notifications if database is empty for role
const seedNotificationsIfNeeded = async (user) => {
  if (!user) return;
  const cacheKey = `${user.role}_${user.id || user._id}`;
  if (isSeededMap.has(cacheKey)) return;
  isSeededMap.set(cacheKey, true);

  try {
    const count = await Notification.countDocuments({
      $or: [
        { userId: user.id || user._id },
        { role: user.role }
      ]
    });
    if (count === 0) {
      const propertyId = user.propertyId || 'HS-9HQ8P';
      if (user.role === 'super-admin') {
        await Notification.create({
          role: 'super-admin',
          title: 'OTA Parity Sync Issue',
          message: 'Booking.com connection returned timeout error during room availability sync for Suite rooms.',
          category: 'OTA Sync',
          isRead: false
        });
        await Notification.create({
          role: 'super-admin',
          title: 'New Property Onboarded',
          message: "Onboarded 'Backwater Retreat' in Alleppey, Kerala. Default inventory mapping initialized.",
          category: 'Property Audit',
          isRead: false
        });
        await Notification.create({
          role: 'super-admin',
          title: 'Security Alert: Unauthorized Login',
          message: 'Multiple failed login attempts detected on Rambagh Residency admin console from IP 192.168.1.105.',
          category: 'Security Warning',
          isRead: true
        });
      } else if (user.role === 'manager' || user.role === 'admin' || user.role === 'receptionist') {
        await Notification.create({
          role: user.role,
          propertyId,
          title: 'Refund Request Pending',
          message: 'Neha Patel submitted a refund request of ₹4,900 for Approval.',
          category: 'Approvals',
          isRead: false
        });
        await Notification.create({
          role: user.role,
          propertyId,
          title: 'Guest Feedback Submitted',
          message: 'Kabir Dev submitted a 5-star review for cleanliness and services.',
          category: 'Guest Experience',
          isRead: false
        });
      } else if (user.role === 'guest') {
        await Notification.create({
          userId: user.id || user._id,
          title: 'Welcome to Hour Stay!',
          message: 'Thank you for registering. Manage your bookings and stay preferences from this console.',
          category: 'General',
          isRead: false
        });
      }
    }
  } catch (err) {
    console.error("Failed to seed initial notifications:", err.message);
  }
};

// Batch synchronizer: ensures all bookings in DB have matching notifications across Admin, Super Admin, Manager, and Receptionist
const syncAllRoleBookingNotifications = async () => {
  const now = Date.now();
  if (now - lastSyncAllRoleTime < 300000) return; // run at most once per 5 minutes
  lastSyncAllRoleTime = now;

  try {
    const [allBookings, existingNotifs] = await Promise.all([
      Booking.find({}).lean(),
      Notification.find({}, { role: 1, message: 1, title: 1 }).lean()
    ]);

    const rolesToNotify = ['super-admin', 'admin', 'manager', 'receptionist'];
    const existingRefMap = new Map();
    for (const r of rolesToNotify) {
      existingRefMap.set(r, new Set());
    }

    for (const n of existingNotifs || []) {
      const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
      const r = n.role;
      if (existingRefMap.has(r)) {
        const set = existingRefMap.get(r);
        const matches = text.match(/([a-z0-9_-]{4,})/g);
        if (matches) {
          for (const m of matches) set.add(m);
        }
      }
    }

    const notifsToInsert = [];
    for (const b of allBookings || []) {
      const bId = String(b.bookingId || b._id || b.id || '').trim();
      if (!bId) continue;
      const bIdLower = bId.toLowerCase();
      const guestName = b.guest || b.guestName || b.customerName || 'Guest';
      const roomInfo = b.room || b.roomType || 'Standard Room';
      const checkIn = b.checkIn || b.checkInDate || 'Today';
      const checkOut = b.checkOut || b.checkOutDate || 'Tomorrow';
      const amount = b.totalAmount || b.amount || 0;
      const targetProp = b.propertyId || 'HS-9HQ8P';

      const title = 'New Online Reservation';
      const message = `Guest ${guestName} booked ${roomInfo} (${checkIn} → ${checkOut}) for ₹${amount}. [Ref: #${bId}]`;

      for (const role of rolesToNotify) {
        const roleSet = existingRefMap.get(role);
        if (!roleSet.has(bIdLower)) {
          roleSet.add(bIdLower);
          notifsToInsert.push({
            role,
            propertyId: targetProp,
            title,
            message,
            category: 'Reservations',
            isRead: false,
            createdAt: b.createdAt || new Date()
          });
        }
      }
    }

    if (notifsToInsert.length > 0) {
      await Notification.insertMany(notifsToInsert);
    }
  } catch (err) {
    console.error("Failed to sync booking notifications across roles:", err.message);
  }
};

// 1. Get user notifications
router.get('/', protect, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const propId = req.user.propertyId;

    let query;
    if (userRole === 'super-admin' || userRole === 'admin') {
      query = {
        $or: [
          { userId },
          { role: { $in: ['admin', 'super-admin', 'manager', 'receptionist', null, 'all'] } }
        ]
      };
    } else if (userRole === 'manager') {
      query = {
        $or: [
          { userId },
          { role: { $in: ['manager', 'all', null] } },
          { propertyId: propId },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: 'HS-9HQ8P' }
        ]
      };
    } else if (userRole === 'receptionist') {
      query = {
        $or: [
          { userId },
          { role: { $in: ['receptionist', 'all', null] } },
          { propertyId: propId },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: 'HS-9HQ8P' }
        ]
      };
    } else if (userRole === 'guest') {
      const uIdStr = String(userId || '');
      const userEmail = req.user?.email;
      const userPhone = req.user?.mobile || req.user?.phone;
      const userName = req.user?.name;

      const bQuery = [
        { guestId: userId },
        { guestId: uIdStr },
        { userId: userId },
        { userId: uIdStr }
      ];
      if (userEmail) bQuery.push({ email: userEmail }, { guestEmail: userEmail });
      if (userPhone) bQuery.push({ phone: userPhone }, { guestPhone: userPhone });
      if (userName) bQuery.push({ guest: userName }, { guestName: userName });

      let guestBookings = [];
      try {
        guestBookings = await Booking.find({ $or: bQuery }).lean();
      } catch (_) {}

      var myBookingIds = new Set();
      for (const b of guestBookings) {
        if (b.bookingId) myBookingIds.add(String(b.bookingId).trim().toLowerCase());
        if (b._id) myBookingIds.add(String(b._id).trim().toLowerCase());
        if (b.id) myBookingIds.add(String(b.id).trim().toLowerCase());
      }

      const guestQueries = [
        { userId: uIdStr },
        { userId: req.user.id },
        { userId: req.user._id }
      ];
      if (userEmail) guestQueries.push({ userId: userEmail });
      if (userPhone) guestQueries.push({ userId: userPhone });

      for (const b of guestBookings) {
        const bId = b.bookingId || String(b._id) || b.id;
        if (bId) {
          guestQueries.push({ message: { $regex: bId, $options: 'i' } });
          guestQueries.push({ title: { $regex: bId, $options: 'i' } });
        }
      }

      guestQueries.push({
        role: { $in: ['guest', 'all'] },
        userId: { $in: [null, undefined, '', 'all'] },
        category: { $in: ['General', 'Announcement', 'Announcements', 'Promo', 'Promotions', 'System'] }
      });

      query = { $or: guestQueries };
    } else {
      query = {
        $or: [
          { userId },
          { role: userRole }
        ]
      };
    }

    const list = await Notification.find(query).sort({ createdAt: -1 }).lean().limit(100);

    // Deduplicate items by title and message with strict guest isolation
    const dedupMap = new Map();
    for (const item of list) {
      if (userRole === 'guest') {
        const notifUserId = item.userId ? String(item.userId).trim().toLowerCase() : '';
        const isMyUserId = notifUserId === '' ||
                           notifUserId === 'null' ||
                           notifUserId === 'undefined' ||
                           notifUserId === 'all' ||
                           notifUserId === String(userId || '').toLowerCase() ||
                           (req.user?.email && notifUserId === req.user.email.toLowerCase()) ||
                           (req.user?.phone && notifUserId === req.user.phone.toLowerCase()) ||
                           (req.user?.mobile && notifUserId === req.user.mobile.toLowerCase());

        const combined = `${item.title || ''} ${item.message || ''}`;
        const refMatches = combined.match(/Ref:\s*#?([A-Za-z0-9-]+)/gi) || [];
        const bkMatches = combined.match(/\b(BK-[A-Za-z0-9-]+)\b/gi) || [];
        const allRefs = [...refMatches, ...bkMatches].map(r => r.replace(/Ref:\s*#?/i, '').replace(/#/g, '').trim().toLowerCase());

        if (allRefs.length > 0) {
          const matchesMyBooking = allRefs.some(ref => {
            for (const myId of (myBookingIds || [])) {
              if (myId.includes(ref) || ref.includes(myId)) return true;
            }
            return false;
          });
          if (!matchesMyBooking) continue;
        } else {
          if (!isMyUserId) continue;
        }

        const nRole = (item.role || '').toLowerCase();
        if ((nRole === 'manager' || nRole === 'admin' || nRole === 'super-admin' || nRole === 'receptionist') && !isMyUserId) {
          continue;
        }
      }

      const key = `${(item.title || '').trim().toLowerCase()}:::${(item.message || '').trim().toLowerCase()}`;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, item);
      }
    }
    const uniqueList = Array.from(dedupMap.values());

    return res.status(200).json({ success: true, data: uniqueList });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Get unread count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const propId = req.user.propertyId;

    let query;
    let myBookingIds = null;
    if (userRole === 'super-admin' || userRole === 'admin') {
      query = {
        $or: [
          { userId },
          { role: { $in: ['admin', 'super-admin', 'manager', 'receptionist', null, 'all'] } }
        ]
      };
    } else if (userRole === 'manager') {
      query = {
        $or: [
          { userId },
          { role: { $in: ['manager', 'all', null] } },
          { propertyId: propId },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: 'HS-9HQ8P' }
        ]
      };
    } else if (userRole === 'receptionist') {
      query = {
        $or: [
          { userId },
          { role: { $in: ['receptionist', 'all', null] } },
          { propertyId: propId },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: 'HS-9HQ8P' }
        ]
      };
    } else if (userRole === 'guest') {
      const uIdStr = String(userId || '');
      const userEmail = req.user?.email;
      const userPhone = req.user?.mobile || req.user?.phone;
      const userName = req.user?.name;

      const bQuery = [
        { guestId: userId },
        { guestId: uIdStr },
        { userId: userId },
        { userId: uIdStr }
      ];
      if (userEmail) bQuery.push({ email: userEmail }, { guestEmail: userEmail });
      if (userPhone) bQuery.push({ phone: userPhone }, { guestPhone: userPhone });
      if (userName) bQuery.push({ guest: userName }, { guestName: userName });

      let guestBookings = [];
      try {
        guestBookings = await Booking.find({ $or: bQuery });
      } catch (_) {}

      myBookingIds = new Set();
      for (const b of guestBookings) {
        if (b.bookingId) myBookingIds.add(String(b.bookingId).trim().toLowerCase());
        if (b._id) myBookingIds.add(String(b._id).trim().toLowerCase());
        if (b.id) myBookingIds.add(String(b.id).trim().toLowerCase());
      }

      const guestQueries = [
        { userId: uIdStr },
        { userId: req.user.id },
        { userId: req.user._id }
      ];
      if (userEmail) guestQueries.push({ userId: userEmail });
      if (userPhone) guestQueries.push({ userId: userPhone });

      for (const b of guestBookings) {
        const bId = b.bookingId || String(b._id) || b.id;
        if (bId) {
          guestQueries.push({ message: { $regex: bId, $options: 'i' } });
          guestQueries.push({ title: { $regex: bId, $options: 'i' } });
        }
      }

      guestQueries.push({
        role: { $in: ['guest', 'all'] },
        userId: { $in: [null, undefined, '', 'all'] },
        category: { $in: ['General', 'Announcement', 'Announcements', 'Promo', 'Promotions', 'System'] }
      });

      query = { $or: guestQueries };
    } else {
      query = {
        $or: [
          { userId },
          { role: userRole }
        ]
      };
    }

    const list = await Notification.find(query).sort({ createdAt: -1 }).lean().limit(100);
    const dedupMap = new Map();
    for (const item of list) {
      if (userRole === 'guest') {
        const notifUserId = item.userId ? String(item.userId).trim().toLowerCase() : '';
        const isMyUserId = notifUserId === '' ||
                           notifUserId === 'null' ||
                           notifUserId === 'undefined' ||
                           notifUserId === 'all' ||
                           notifUserId === String(userId || '').toLowerCase() ||
                           (req.user?.email && notifUserId === req.user.email.toLowerCase()) ||
                           (req.user?.phone && notifUserId === req.user.phone.toLowerCase()) ||
                           (req.user?.mobile && notifUserId === req.user.mobile.toLowerCase());

        const combined = `${item.title || ''} ${item.message || ''}`;
        const refMatches = combined.match(/Ref:\s*#?([A-Za-z0-9-]+)/gi) || [];
        const bkMatches = combined.match(/\b(BK-[A-Za-z0-9-]+)\b/gi) || [];
        const allRefs = [...refMatches, ...bkMatches].map(r => r.replace(/Ref:\s*#?/i, '').replace(/#/g, '').trim().toLowerCase());

        if (allRefs.length > 0) {
          const matchesMyBooking = allRefs.some(ref => {
            for (const myId of (myBookingIds || [])) {
              if (myId.includes(ref) || ref.includes(myId)) return true;
            }
            return false;
          });
          if (!matchesMyBooking) continue;
        } else {
          if (!isMyUserId) continue;
        }

        const nRole = (item.role || '').toLowerCase();
        if ((nRole === 'manager' || nRole === 'admin' || nRole === 'super-admin' || nRole === 'receptionist') && !isMyUserId) {
          continue;
        }
      }

      const key = `${(item.title || '').trim().toLowerCase()}:::${(item.message || '').trim().toLowerCase()}`;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, item);
      }
    }
    const unreadCount = Array.from(dedupMap.values()).filter(n => !n.isRead).length;

    return res.status(200).json({ success: true, count: unreadCount, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Mark notification as read (strictly scoped to target notification ID)
const handleMarkNotificationRead = async (req, res) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    const existing = await Notification.findOne({ $or: idQuery });

    await Promise.all([
      Notification.updateMany({ $or: idQuery }, { isRead: true }),
      (req.user.role === 'manager' || req.user.role === 'admin' || req.user.role === 'super-admin')
        ? ManagerNotification.updateMany({ $or: idQuery }, { isRead: true }).catch(() => null)
        : Promise.resolve()
    ]);

    const io = req.app.get('socketio');
    if (io) {
      const prop = existing?.propertyId || req.user?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, prop, 'unread_notifications_count_updated', { propertyId: prop, userId: req.user?.id || req.user?._id });
      emitRealtimeSync(io, 'global', 'unread_notifications_count_updated', { userId: req.user?.id || req.user?._id });
      emitRealtimeSync(io, prop, 'dashboard_sync', { action: 'notification_read', id });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'notification_read', id });
    }

    return res.status(200).json({ success: true, data: { id, isRead: true, ...(existing ? existing.toObject() : {}) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/:id/read', protect, handleMarkNotificationRead);
router.patch('/:id/read', protect, handleMarkNotificationRead);
router.put('/:id/read', protect, handleMarkNotificationRead);

// 3b. Mark notification as unread
const handleMarkNotificationUnread = async (req, res) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    const existing = await Notification.findOne({ $or: idQuery });

    await Promise.all([
      Notification.updateMany({ $or: idQuery }, { isRead: false }),
      (req.user.role === 'manager' || req.user.role === 'admin' || req.user.role === 'super-admin')
        ? ManagerNotification.updateMany({ $or: idQuery }, { isRead: false }).catch(() => null)
        : Promise.resolve()
    ]);

    const io = req.app.get('socketio');
    if (io) {
      const prop = existing?.propertyId || req.user?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, prop, 'unread_notifications_count_updated', { propertyId: prop, userId: req.user?.id || req.user?._id });
      emitRealtimeSync(io, 'global', 'unread_notifications_count_updated', { userId: req.user?.id || req.user?._id });
      emitRealtimeSync(io, prop, 'dashboard_sync', { action: 'notification_unread', id });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'notification_unread', id });
    }

    return res.status(200).json({ success: true, data: { id, isRead: false, ...(existing ? existing.toObject() : {}) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/:id/unread', protect, handleMarkNotificationUnread);
router.patch('/:id/unread', protect, handleMarkNotificationUnread);
router.put('/:id/unread', protect, handleMarkNotificationUnread);

// 4. Mark all as read (strictly matching user's viewable notifications query)
const handleMarkAllNotificationsRead = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const propId = req.user.propertyId;

    let roleQuery;
    if (userRole === 'super-admin' || userRole === 'admin') {
      roleQuery = {
        $or: [
          { userId },
          { role: { $in: ['admin', 'super-admin', 'manager', 'receptionist', null] } },
          { role: { $exists: false } }
        ]
      };
    } else if (userRole === 'manager') {
      roleQuery = {
        $or: [
          { userId },
          { role: 'manager' },
          { role: null },
          { role: { $exists: false } },
          { propertyId: propId },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: null },
          { propertyId: { $exists: false } }
        ]
      };
    } else if (userRole === 'receptionist') {
      roleQuery = {
        $or: [
          { userId },
          { role: 'receptionist' },
          { role: null },
          { role: { $exists: false } },
          { propertyId: propId },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: 'HS-9HQ8P' }
        ]
      };
    } else if (userRole === 'guest') {
      const uIdStr = String(userId || '');
      const userEmail = req.user?.email;
      const userPhone = req.user?.mobile || req.user?.phone;
      const userName = req.user?.name;

      const bQuery = [
        { guestId: userId },
        { guestId: uIdStr },
        { userId: userId },
        { userId: uIdStr }
      ];
      if (userEmail) bQuery.push({ email: userEmail }, { guestEmail: userEmail });
      if (userPhone) bQuery.push({ phone: userPhone }, { guestPhone: userPhone });
      if (userName) bQuery.push({ guest: userName }, { guestName: userName });

      let guestBookings = [];
      try {
        guestBookings = await Booking.find({ $or: bQuery });
      } catch (_) {}

      const guestQueries = [
        { userId: uIdStr },
        { userId: req.user.id },
        { userId: req.user._id }
      ];
      if (userEmail) guestQueries.push({ userId: userEmail });
      if (userPhone) guestQueries.push({ userId: userPhone });

      for (const b of guestBookings) {
        const bId = b.bookingId || String(b._id) || b.id;
        if (bId) {
          guestQueries.push({ message: { $regex: bId, $options: 'i' } });
          guestQueries.push({ title: { $regex: bId, $options: 'i' } });
        }
      }

      roleQuery = { $or: guestQueries };
    } else {
      roleQuery = {
        $or: [
          { userId },
          { role: userRole }
        ]
      };
    }

    const filter = {
      $and: [
        { isRead: false },
        roleQuery
      ]
    };

    await Promise.all([
      Notification.updateMany(filter, { isRead: true }),
      (userRole === 'manager' || userRole === 'admin' || userRole === 'super-admin')
        ? ManagerNotification.updateMany({ isRead: false }, { isRead: true }).catch(() => null)
        : Promise.resolve()
    ]);

    const io = req.app.get('socketio');
    if (io) {
      const targetProp = propId || 'HS-9HQ8P';
      emitRealtimeSync(io, targetProp, 'unread_notifications_count_updated', { propertyId: targetProp, userId });
      emitRealtimeSync(io, 'global', 'unread_notifications_count_updated', { userId });
      emitRealtimeSync(io, targetProp, 'dashboard_sync', { action: 'all_notifications_read' });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'all_notifications_read' });
    }

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/read-all', protect, handleMarkAllNotificationsRead);
router.patch('/read-all', protect, handleMarkAllNotificationsRead);
router.put('/read-all', protect, handleMarkAllNotificationsRead);

// 5. Delete notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    await Promise.all([
      Notification.deleteMany({ $or: idQuery }).catch(() => null),
      ManagerNotification.deleteMany({ $or: idQuery }).catch(() => null)
    ]);

    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Register FCM device token
router.post('/fcm-token', protect, async (req, res) => {
  const { token, platform } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Valid FCM token is required' });
  }

  try {
    const userId = req.user.id || req.user._id;
    const query = [{ _id: userId }, { id: userId }, { email: req.user.email }];
    if (mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId)) {
      query.unshift({ _id: new mongoose.Types.ObjectId(userId) });
    }

    const updatedUser = await User.findOneAndUpdate(
      { $or: query },
      {
        $set: { fcmToken: token },
        $addToSet: { fcmTokens: token }
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'FCM device token registered successfully',
      data: { token, userId: updatedUser ? (updatedUser.id || updatedUser._id) : userId }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Unregister FCM device token
router.delete('/fcm-token', protect, async (req, res) => {
  const { token } = req.body || {};
  try {
    const userId = req.user.id || req.user._id;
    const query = [{ _id: userId }, { id: userId }, { email: req.user.email }];
    if (mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId)) {
      query.unshift({ _id: new mongoose.Types.ObjectId(userId) });
    }

    const update = {};
    if (token) {
      update.$pull = { fcmTokens: token };
      if (req.user.fcmToken === token) update.$set = { fcmToken: null };
    } else {
      update.$set = { fcmToken: null };
    }

    await User.findOneAndUpdate({ $or: query }, update, { new: true });
    return res.status(200).json({ success: true, message: 'FCM device token unregistered successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
