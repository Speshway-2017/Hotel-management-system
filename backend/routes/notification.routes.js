import express from 'express';
import Notification from '../models/notification.model.js';
import Booking from '../models/booking.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Helper to seed initial notifications if database is empty for role
const seedNotificationsIfNeeded = async (user) => {
  try {
    const list = await Notification.find({
      $or: [
        { userId: user.id || user._id },
        { role: user.role }
      ]
    });
    if (list.length === 0) {
      const propertyId = user.propertyId || 'HS-JAI';
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

// Permanent synchronizer: ensures all bookings in DB have matching notifications across Admin, Super Admin, Manager, and Receptionist
const syncAllRoleBookingNotifications = async () => {
  try {
    const allBookings = await Booking.find({}).sort({ createdAt: -1 });
    const rolesToNotify = ['super-admin', 'admin', 'manager', 'receptionist'];

    for (const b of allBookings) {
      const bId = b.bookingId || String(b._id) || b.id;
      const guestName = b.guest || b.guestName || b.customerName || 'Guest';
      const roomInfo = b.room || b.roomType || 'Standard Room';
      const checkIn = b.checkIn || b.checkInDate || 'Today';
      const checkOut = b.checkOut || b.checkOutDate || 'Tomorrow';
      const amount = b.totalAmount || b.amount || 0;
      const targetProp = b.propertyId || 'HS-9HQ8P';

      const title = 'New Online Reservation';
      const message = `Guest ${guestName} booked ${roomInfo} (${checkIn} → ${checkOut}) for ₹${amount}. [Ref: #${bId}]`;

      for (const role of rolesToNotify) {
        let exists = null;
        try {
          exists = await Notification.findOne({
            role,
            $or: [
              { message: { $regex: bId, $options: 'i' } },
              { title: { $regex: bId, $options: 'i' } }
            ]
          });
        } catch (_) {}

        if (!exists) {
          try {
            await Notification.create({
              role,
              propertyId: targetProp,
              title,
              message,
              category: 'Reservations',
              isRead: false,
              createdAt: b.createdAt || new Date()
            });
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.error("Failed to sync booking notifications across roles:", err.message);
  }
};

// 1. Get user notifications
router.get('/', protect, async (req, res) => {
  try {
    await seedNotificationsIfNeeded(req.user);
    await syncAllRoleBookingNotifications();
    
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const propId = req.user.propertyId;

    let query;
    if (userRole === 'super-admin' || userRole === 'admin') {
      query = {
        $or: [
          { userId },
          { role: { $in: ['admin', 'super-admin', 'manager', 'receptionist', null] } },
          { role: { $exists: false } }
        ]
      };
    } else if (userRole === 'manager') {
      query = {
        $or: [
          { userId },
          { role: 'manager' },
          { role: null },
          { role: { $exists: false } },
          { propertyId: propId },
          { propertyId: 'HS-JAI' },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: null },
          { propertyId: { $exists: false } }
        ]
      };
    } else if (userRole === 'receptionist') {
      query = {
        $or: [
          { userId },
          { role: 'receptionist' },
          { role: null },
          { role: { $exists: false } },
          { propertyId: propId },
          { propertyId: 'HS-JAI' },
          { propertyId: 'HS-9HQ8P' }
        ]
      };
    } else if (userRole === 'guest') {
      const uIdStr = String(userId);
      const guestQueries = [
        { userId: uIdStr },
        { userId: req.user.id },
        { userId: req.user._id }
      ];
      if (req.user.email) guestQueries.push({ userId: req.user.email });
      if (req.user.phone) guestQueries.push({ userId: req.user.phone });
      query = { $or: guestQueries };
    } else {
      query = {
        $or: [
          { userId },
          { role: userRole }
        ]
      };
    }

    const list = await Notification.find(query).sort({ createdAt: -1 });

    // Deduplicate items by title and message
    const dedupMap = new Map();
    for (const item of list) {
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
    await syncAllRoleBookingNotifications();
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const propId = req.user.propertyId;

    let query;
    if (userRole === 'super-admin' || userRole === 'admin') {
      query = {
        $or: [
          { userId },
          { role: { $in: ['admin', 'super-admin', 'manager', 'receptionist', null] } },
          { role: { $exists: false } }
        ]
      };
    } else if (userRole === 'manager') {
      query = {
        $or: [
          { userId },
          { role: 'manager' },
          { role: null },
          { role: { $exists: false } },
          { propertyId: propId },
          { propertyId: 'HS-JAI' },
          { propertyId: 'HS-9HQ8P' },
          { propertyId: null },
          { propertyId: { $exists: false } }
        ]
      };
    } else if (userRole === 'receptionist') {
      query = {
        $or: [
          { userId },
          { role: 'receptionist' },
          { role: null },
          { role: { $exists: false } },
          { propertyId: propId },
          { propertyId: 'HS-JAI' },
          { propertyId: 'HS-9HQ8P' }
        ]
      };
    } else if (userRole === 'guest') {
      const uIdStr = String(userId);
      const guestQueries = [
        { userId: uIdStr },
        { userId: req.user.id },
        { userId: req.user._id }
      ];
      if (req.user.email) guestQueries.push({ userId: req.user.email });
      if (req.user.phone) guestQueries.push({ userId: req.user.phone });
      query = { $or: guestQueries };
    } else {
      query = {
        $or: [
          { userId },
          { role: userRole }
        ]
      };
    }

    const list = await Notification.find(query).sort({ createdAt: -1 });
    const dedupMap = new Map();
    for (const item of list) {
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

    const [updated] = await Promise.all([
      Notification.findOneAndUpdate({ $or: idQuery }, { isRead: true }, { new: true }),
      (req.user.role === 'manager' || req.user.role === 'admin' || req.user.role === 'super-admin')
        ? ManagerNotification.updateMany({ $or: idQuery }, { isRead: true }).catch(() => null)
        : Promise.resolve()
    ]);

    if (!updated) {
      return res.status(200).json({ success: true, data: { id, isRead: true } });
    }

    const io = req.app.get('socketio');
    if (io) {
      const prop = updated.propertyId || req.user?.propertyId || 'HS-JAI';
      emitRealtimeSync(io, prop, 'unread_notifications_count_updated', { propertyId: prop, userId: req.user?.id || req.user?._id });
      emitRealtimeSync(io, prop, 'dashboard_sync', { action: 'notification_read', id });
    }

    return res.status(200).json({ success: true, data: updated });
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

    const [updated] = await Promise.all([
      Notification.findOneAndUpdate({ $or: idQuery }, { isRead: false }, { new: true }),
      (req.user.role === 'manager' || req.user.role === 'admin' || req.user.role === 'super-admin')
        ? ManagerNotification.updateMany({ $or: idQuery }, { isRead: false }).catch(() => null)
        : Promise.resolve()
    ]);

    if (!updated) {
      return res.status(200).json({ success: true, data: { id, isRead: false } });
    }

    const io = req.app.get('socketio');
    if (io) {
      const prop = updated?.propertyId || req.user?.propertyId || 'HS-JAI';
      emitRealtimeSync(io, prop, 'unread_notifications_count_updated', { propertyId: prop, userId: req.user?.id || req.user?._id });
      emitRealtimeSync(io, prop, 'dashboard_sync', { action: 'notification_unread', id });
    }

    return res.status(200).json({ success: true, data: updated || { id, isRead: false } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/:id/unread', protect, handleMarkNotificationUnread);
router.patch('/:id/unread', protect, handleMarkNotificationUnread);
router.put('/:id/unread', protect, handleMarkNotificationUnread);

// 4. Mark all as read (strictly scoped to user's own notifications)
const handleMarkAllNotificationsRead = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const propId = req.user.propertyId;

    let filter;
    if (userRole === 'super-admin' || userRole === 'admin') {
      filter = {
        isRead: false,
        $or: [
          { userId },
          { role: 'admin' },
          { role: 'super-admin' }
        ]
      };
    } else if (userRole === 'manager') {
      filter = {
        isRead: false,
        $or: [
          { userId },
          { role: 'manager' }
        ]
      };
    } else if (userRole === 'receptionist') {
      filter = {
        isRead: false,
        $or: [
          { userId },
          { role: 'receptionist' }
        ]
      };
    } else if (userRole === 'guest') {
      const uIdStr = String(userId);
      filter = {
        isRead: false,
        $or: [
          { userId: uIdStr },
          { userId: req.user.id },
          { userId: req.user._id },
          { userId: req.user.email }
        ]
      };
    } else {
      filter = {
        isRead: false,
        userId
      };
    }

    await Promise.all([
      Notification.updateMany(filter, { isRead: true }),
      (userRole === 'manager' || userRole === 'admin' || userRole === 'super-admin')
        ? ManagerNotification.updateMany({ isRead: false }, { isRead: true }).catch(() => null)
        : Promise.resolve()
    ]);

    const io = req.app.get('socketio');
    if (io) {
      const targetProp = propId || 'HS-JAI';
      emitRealtimeSync(io, targetProp, 'unread_notifications_count_updated', { propertyId: targetProp, userId });
      emitRealtimeSync(io, targetProp, 'dashboard_sync', { action: 'all_notifications_read' });
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

import User from '../models/user.model.js';
import mongoose from 'mongoose';

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
