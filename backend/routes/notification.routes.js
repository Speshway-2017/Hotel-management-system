import express from 'express';
import Notification from '../models/notification.model.js';
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

// 1. Get user notifications
router.get('/', protect, async (req, res) => {
  try {
    await seedNotificationsIfNeeded(req.user);
    
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
          { role: 'admin' },
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
    } else {
      query = {
        $or: [
          { userId },
          { role: userRole }
        ]
      };
    }

    const list = await Notification.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: list });
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
    if (userRole === 'super-admin' || userRole === 'admin') {
      query = {
        isRead: false,
        $or: [
          { userId },
          { role: { $in: ['admin', 'super-admin', 'manager', 'receptionist', null] } },
          { role: { $exists: false } }
        ]
      };
    } else if (userRole === 'manager') {
      query = {
        isRead: false,
        $or: [
          { userId },
          { role: 'manager' },
          { role: 'admin' },
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
        isRead: false,
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
    } else {
      query = {
        isRead: false,
        $or: [
          { userId },
          { role: userRole }
        ]
      };
    }

    const count = await Notification.countDocuments(query);
    return res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Mark notification as read
router.post('/:id/read', protect, async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Mark all as read
router.post('/read-all', protect, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const propId = req.user.propertyId;

    let filter;
    if (userRole === 'super-admin' || userRole === 'admin') {
      filter = { isRead: false };
    } else if (userRole === 'manager') {
      filter = {
        isRead: false,
        $or: [
          { userId },
          { role: 'manager' },
          { role: 'admin' },
          { role: null },
          { role: { $exists: false } },
          { propertyId: propId },
          { propertyId: 'HS-JAI' },
          { propertyId: 'HS-9HQ8P' }
        ]
      };
    } else {
      filter = {
        isRead: false,
        $or: [
          { userId },
          { role: userRole }
        ]
      };
    }

    await Notification.updateMany(filter, { isRead: true });
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
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
