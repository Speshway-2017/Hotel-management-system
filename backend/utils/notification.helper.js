import Notification from '../models/notification.model.js';
import { ManagerNotification } from '../models/managerData.model.js';
import User from '../models/user.model.js';
import { emitRealtimeSync } from './socketEmitter.js';

// In-memory 60-second duplicate suppression cache
const recentNotificationCache = new Map();

/**
 * Centrally triggers/logs a user, role, or property scoped system alert
 * and broadcasts it instantly via Socket.io and Firebase Cloud Messaging (FCM).
 */
export const triggerNotification = async ({ req, io, userId, role, propertyId, title, message, category, data = {} }) => {
  try {
    const socketIo = io || (req && req.app ? req.app.get('socketio') : null);
    const targetPropId = propertyId || null;

    const cleanTitle = (title || '').trim();
    const cleanMsg = (message || '').trim();
    const dedupKey = `${role || 'all'}:::${targetPropId || 'all'}:::${userId || 'none'}:::${cleanTitle.toLowerCase()}:::${cleanMsg.toLowerCase()}`;

    // 1. In-memory check (60-second duplicate suppression)
    const now = Date.now();
    if (recentNotificationCache.has(dedupKey)) {
      const cachedTime = recentNotificationCache.get(dedupKey);
      if (now - cachedTime < 60000) {
        return null; // Suppress duplicate trigger immediately
      }
    }
    recentNotificationCache.set(dedupKey, now);

    // Clean up cache older than 2 minutes
    if (recentNotificationCache.size > 200) {
      for (const [k, v] of recentNotificationCache.entries()) {
        if (now - v > 120000) recentNotificationCache.delete(k);
      }
    }

    // 2. Database deduplication check (60 seconds)
    const sixtySecondsAgo = new Date(now - 60000);
    const duplicateQuery = {
      title: cleanTitle,
      message: cleanMsg,
      createdAt: { $gte: sixtySecondsAgo }
    };
    if (role) duplicateQuery.role = role;
    if (targetPropId) duplicateQuery.propertyId = targetPropId;
    if (userId) duplicateQuery.userId = userId;

    let existing = null;
    try {
      existing = await Notification.findOne(duplicateQuery);
    } catch (_) {}

    if (existing) {
      return existing;
    }

    const notif = await Notification.create({
      userId: userId || null,
      role: role || null,
      propertyId: targetPropId,
      title: cleanTitle,
      message: cleanMsg,
      category: category || 'General',
      isRead: false
    });

    // Only persist to ManagerNotification for manager scoped notifications
    if (role === 'manager') {
      try {
        let existingMn = null;
        try {
          existingMn = await ManagerNotification.findOne({
            title: cleanTitle,
            message: cleanMsg,
            propertyId: targetPropId || 'HS-JAI',
            createdAt: { $gte: sixtySecondsAgo }
          });
        } catch (_) {}

        if (!existingMn) {
          await ManagerNotification.create({
            title: cleanTitle,
            message: cleanMsg,
            category: category || 'General',
            isRead: false,
            propertyId: targetPropId || 'HS-JAI'
          });
        }
      } catch (_) {}
    }

    console.log(`🔔 Notification generated (Single): "${cleanTitle}" [${category || 'General'}] for role: ${role || 'all'}, property: ${targetPropId || 'all'}, user: ${userId || 'none'}`);

    if (socketIo) {
      // Standard events
      emitRealtimeSync(socketIo, targetPropId, 'notification_created', {
        notification: notif,
        role,
        userId,
        propertyId: targetPropId,
        data
      });
      emitRealtimeSync(socketIo, targetPropId, 'notification_received', notif);
      emitRealtimeSync(socketIo, targetPropId, 'new_notification', notif);
      if (role === 'manager') {
        emitRealtimeSync(socketIo, targetPropId, 'manager_notification', notif);
      }
      emitRealtimeSync(socketIo, targetPropId, 'unread_notifications_count_updated', {
        role,
        userId,
        propertyId: targetPropId
      });
      emitRealtimeSync(socketIo, targetPropId, 'dashboard_sync', {
        action: 'notification_created',
        propertyId: targetPropId
      });
    }

    // Lookup recipient FCM device tokens and dispatch once
    try {
      const userQuery = [];
      if (userId) {
        userQuery.push({ _id: userId }, { id: userId });
      } else if (role && targetPropId) {
        userQuery.push({ role, propertyId: targetPropId });
      } else if (role) {
        userQuery.push({ role });
      } else if (targetPropId) {
        userQuery.push({ propertyId: targetPropId, role: 'manager' });
      } else {
        userQuery.push({ role: 'manager' });
      }

      if (userQuery.length > 0) {
        const targetUsers = await User.find({ $or: userQuery });
        const tokens = new Set();
        for (const u of targetUsers) {
          if (u.fcmToken) tokens.add(u.fcmToken);
          if (Array.isArray(u.fcmTokens)) {
            for (const t of u.fcmTokens) {
              if (t) tokens.add(t);
            }
          }
        }

        if (tokens.size > 0) {
          console.log(`📱 [FCM PUSH] Dispatching single notification to ${tokens.size} device tokens: "${cleanTitle}"`);
        }
      }
    } catch (fcmErr) {
      console.warn("⚠️ FCM lookup notice:", fcmErr.message);
    }

    return notif;
  } catch (err) {
    console.error("❌ Failed to automatically trigger notification:", err.message);
  }
};

/**
 * Universal helper for booking/reservation events:
 * Dispatches database notifications and emits realtime socket synchronization
 * across Admin, Super Admin, Manager, Receptionist, and Guest consoles.
 */
export const notifyBookingEvent = async ({ req, io, action = 'created', booking, guestUser = null, property = null }) => {
  try {
    const socketIo = io || (req && req.app ? req.app.get('socketio') : null);
    const propId = booking.propertyId || 'HS-JAI';
    const guestName = booking.guest || booking.guestName || 'A Guest';
    const roomInfo = booking.room || booking.roomType || 'Standard Room';
    const bookingId = booking.bookingId || booking._id || booking.id || '';
    const checkIn = booking.checkIn || booking.checkInDate || 'Today';
    const checkOut = booking.checkOut || booking.checkOutDate || 'Tomorrow';
    const amount = booking.totalAmount || booking.amount || 0;

    let title = 'New Reservation Booking';
    let msg = `Guest ${guestName} booked ${roomInfo} (${checkIn} → ${checkOut}) for ₹${amount}. [Ref: #${bookingId}]`;
    let category = 'Reservations';

    if (action === 'created' || action === 'booked') {
      title = 'New Online Reservation';
      msg = `Guest ${guestName} booked ${roomInfo} (${checkIn} → ${checkOut}) for ₹${amount}. [Ref: #${bookingId}]`;
      category = 'Reservations';
    } else if (action === 'cancelled') {
      title = 'Reservation Cancelled';
      msg = `Booking #${bookingId} for guest ${guestName} (${roomInfo}) was cancelled.`;
      category = 'Alerts';
    } else if (action === 'checkin') {
      title = 'Guest Checked In';
      msg = `Guest ${guestName} checked into ${roomInfo} (Ref: #${bookingId}).`;
      category = 'Operations';
    } else if (action === 'checkout') {
      title = 'Guest Checked Out';
      msg = `Guest ${guestName} checked out from ${roomInfo} (Ref: #${bookingId}).`;
      category = 'Operations';
    }

    // 1. Notify Super Admin & Admin (Global)
    await triggerNotification({
      req,
      io: socketIo,
      role: 'super-admin',
      title,
      message: msg,
      category,
      data: { bookingId, guestName, room: roomInfo, action }
    });

    await triggerNotification({
      req,
      io: socketIo,
      role: 'admin',
      title,
      message: msg,
      category,
      data: { bookingId, guestName, room: roomInfo, action }
    });

    // 2. Notify Manager for this property (single clean dispatch)
    await triggerNotification({
      req,
      io: socketIo,
      role: 'manager',
      propertyId: propId,
      title,
      message: msg,
      category,
      data: { bookingId, guestName, room: roomInfo, action }
    });

    // 3. Notify Receptionist for this property
    await triggerNotification({
      req,
      io: socketIo,
      role: 'receptionist',
      propertyId: propId,
      title,
      message: msg,
      category,
      data: { bookingId, guestName, room: roomInfo, action }
    });

    // 4. Notify Guest
    const targetGuestId = booking.guestId || (guestUser ? (guestUser._id || guestUser.id) : null);
    if (targetGuestId) {
      await triggerNotification({
        req,
        io: socketIo,
        userId: targetGuestId,
        role: 'guest',
        title: action === 'created' ? 'Booking Confirmed!' : title,
        message: action === 'created'
          ? `Your reservation is confirmed for ${checkIn} → ${checkOut}. Booking Reference: #${bookingId}.`
          : msg,
        category: 'Booking Confirmation',
        data: { bookingId, guestName, room: roomInfo, action }
      });
    }

    // 5. Realtime Socket.io Broadcast
    if (socketIo) {
      emitRealtimeSync(socketIo, propId, 'booking_created', { booking, propertyId: propId });
      emitRealtimeSync(socketIo, propId, 'booking_updated', { type: action.toUpperCase(), booking, propertyId: propId });
      emitRealtimeSync(socketIo, propId, 'dashboard_sync', { propertyId: propId, action: `booking_${action}`, bookingId });
    }
  } catch (err) {
    console.error("❌ Failed to broadcast booking notification:", err.message);
  }
};

/**
 * Universal helper for guest feedback events:
 * Dispatches database notifications and emits realtime socket synchronization
 * across Admin, Manager, Receptionist, and Guest consoles.
 */
export const notifyFeedbackEvent = async ({ req, io, action, feedback, actor = 'Guest' }) => {
  try {
    const socketIo = io || (req && req.app ? req.app.get('socketio') : null);
    const propId = feedback.propertyId || 'HS-JAI';
    const ratingStars = `${feedback.rating || 5}★`;
    const snippet = (feedback.comment || feedback.comments || '').slice(0, 50);

    if (action === 'created' || action === 'received') {
      const title = `New Guest Feedback (${ratingStars})`;
      const msg = `${feedback.guestName || 'A guest'} submitted a ${feedback.rating || 5}-star review for ${feedback.room || feedback.roomType || 'Stay'}: "${snippet}..."`;

      // 1. Notify Admin & Super Admin
      await triggerNotification({ req, io: socketIo, role: 'admin', title, message: msg, category: 'Guest Experience' });
      await triggerNotification({ req, io: socketIo, role: 'super-admin', title, message: msg, category: 'Guest Experience' });
      
      // 2. Notify Property Manager & Receptionist
      await triggerNotification({ req, io: socketIo, role: 'manager', propertyId: propId, title, message: msg, category: 'Guest Experience' });
      await triggerNotification({ req, io: socketIo, role: 'receptionist', propertyId: propId, title, message: msg, category: 'Guest Experience' });

      if (socketIo) {
        emitRealtimeSync(socketIo, propId, 'feedback_received', feedback);
        emitRealtimeSync(socketIo, propId, 'feedback_created', feedback);
        emitRealtimeSync(socketIo, propId, 'dashboard_sync', { propertyId: propId, action: 'feedback_received' });
      }
    } else if (action === 'responded') {
      const title = `Management Responded to Feedback`;
      const msg = `${actor || 'Management'} replied to review #${feedback.bookingId || feedback.id}: "${(feedback.response || '').slice(0, 60)}..."`;

      // Notify Guest if userId present
      if (feedback.userId) {
        await triggerNotification({ req, io: socketIo, userId: feedback.userId, role: 'guest', title: 'Hotel Replied to Your Feedback', message: msg, category: 'Guest Experience' });
      }
      // Notify Admin & Manager
      await triggerNotification({ req, io: socketIo, role: 'admin', propertyId: propId, title, message: msg, category: 'Guest Experience' });
      await triggerNotification({ req, io: socketIo, role: 'manager', propertyId: propId, title, message: msg, category: 'Guest Experience' });

      if (socketIo) {
        emitRealtimeSync(socketIo, propId, 'feedback_updated', feedback);
        emitRealtimeSync(socketIo, propId, 'dashboard_sync', { propertyId: propId, action: 'feedback_updated' });
      }
    } else if (action === 'status_updated') {
      const title = `Feedback Status Updated: ${feedback.status}`;
      const msg = `Review #${feedback.bookingId || feedback.id} from ${feedback.guestName} status changed to ${feedback.status}.`;

      await triggerNotification({ req, io: socketIo, role: 'manager', propertyId: propId, title, message: msg, category: 'Guest Experience' });
      await triggerNotification({ req, io: socketIo, role: 'admin', propertyId: propId, title, message: msg, category: 'Guest Experience' });

      if (socketIo) {
        emitRealtimeSync(socketIo, propId, 'feedback_updated', feedback);
        emitRealtimeSync(socketIo, propId, 'dashboard_sync', { propertyId: propId, action: 'feedback_updated' });
      }
    } else if (action === 'deleted') {
      if (socketIo) {
        emitRealtimeSync(socketIo, propId, 'feedback_deleted', feedback);
        emitRealtimeSync(socketIo, propId, 'dashboard_sync', { propertyId: propId, action: 'feedback_deleted' });
      }
    }
  } catch (err) {
    console.error("❌ Failed to broadcast feedback notification:", err.message);
  }
};
