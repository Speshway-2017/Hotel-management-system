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
