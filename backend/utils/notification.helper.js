import Notification from '../models/notification.model.js';

/**
 * Centrally triggers/logs a user, role, or property scoped system alert.
 */
export const triggerNotification = async ({ userId, role, propertyId, title, message, category }) => {
  try {
    await Notification.create({
      userId: userId || null,
      role: role || null,
      propertyId: propertyId || null,
      title,
      message,
      category: category || 'General',
      isRead: false
    });
    console.log(`🔔 Notification generated: "${title}" for role: ${role}, user: ${userId}`);
  } catch (err) {
    console.error("❌ Failed to automatically trigger notification:", err.message);
  }
};
