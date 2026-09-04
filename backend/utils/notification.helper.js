import Notification from '../models/notification.model.js';
import app from '../app.js';
import { emitRealtimeSync } from './socketEmitter.js';

/**
 * Centrally triggers/logs a user, role, or property scoped system alert
 * and broadcasts it instantly via Socket.io.
 */
export const triggerNotification = async ({ req, io, userId, role, propertyId, title, message, category }) => {
  try {
    const socketIo = io || (req && req.app ? req.app.get('socketio') : null) || app.get('socketio');
    const notif = await Notification.create({
      userId: userId || null,
      role: role || null,
      propertyId: propertyId || null,
      title,
      message,
      category: category || 'General',
      isRead: false
    });
    console.log(`🔔 Notification generated: "${title}" for role: ${role}, user: ${userId}`);

    if (socketIo) {
      emitRealtimeSync(socketIo, propertyId, 'notification_created', {
        notification: notif,
        role,
        userId,
        propertyId
      });
      emitRealtimeSync(socketIo, propertyId, 'unread_notifications_count_updated', {
        role,
        userId,
        propertyId
      });
      emitRealtimeSync(socketIo, propertyId, 'dashboard_sync', {
        action: 'notification_created',
        propertyId
      });
    }
    return notif;
  } catch (err) {
    console.error("❌ Failed to automatically trigger notification:", err.message);
  }
};

/**
 * Universal helper for guest feedback events:
 * Dispatches database notifications and emits realtime socket synchronization
 * across Admin, Manager, Receptionist, and Guest consoles.
 */
export const notifyFeedbackEvent = async ({ req, io, action, feedback, actor = 'Guest' }) => {
  try {
    const socketIo = io || (req && req.app ? req.app.get('socketio') : null) || app.get('socketio');
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

