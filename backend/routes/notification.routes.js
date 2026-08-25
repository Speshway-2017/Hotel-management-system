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
    
    const query = {
      $or: [
        { userId: req.user.id || req.user._id },
        { role: req.user.role }
      ]
    };
    
    if (req.user.propertyId) {
      query.$or.push({ propertyId: req.user.propertyId });
    }

    const list = await Notification.find(query);
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Get unread count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const query = {
      isRead: false,
      $or: [
        { userId: req.user.id || req.user._id },
        { role: req.user.role }
      ]
    };
    
    if (req.user.propertyId) {
      query.$or.push({ propertyId: req.user.propertyId, isRead: false });
    }

    const list = await Notification.find(query);
    return res.status(200).json({ success: true, unreadCount: list.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Mark notification as read
router.post('/:id/read', protect, async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true }
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
    const filter = {
      isRead: false,
      $or: [
        { userId: req.user.id || req.user._id },
        { role: req.user.role }
      ]
    };
    
    if (req.user.propertyId) {
      filter.$or.push({ propertyId: req.user.propertyId, isRead: false });
    }

    await Notification.updateMany(filter, { isRead: true });
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Delete notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.status(200).json({ success: true, data: deleted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
