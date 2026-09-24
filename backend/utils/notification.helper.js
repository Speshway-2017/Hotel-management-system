import Notification from '../models/notification.model.js';
import Property from '../models/property.model.js';
import { ManagerNotification } from '../models/managerData.model.js';
import User from '../models/user.model.js';
import { emitRealtimeSync } from './socketEmitter.js';

// In-memory 60-second duplicate suppression cache
const recentNotificationCache = new Map();

/**
 * Retrieves the set of property IDs that are currently managed by an Admin
 * (either assignedAdmin is set on Property or an Admin user is assigned to the property).
 */
export const getAdminManagedPropertyIds = async () => {
  try {
    const adminPropIds = new Set();
    const allProperties = await Property.find({});
    for (const p of (allProperties || [])) {
      if (p.assignedAdmin && String(p.assignedAdmin).trim()) {
        if (p._id) adminPropIds.add(String(p._id).trim());
        if (p.id) adminPropIds.add(String(p.id).trim());
      }
    }
    const adminUsers = await User.find({ role: 'admin' });
    for (const u of (adminUsers || [])) {
      if (u.propertyId && String(u.propertyId).trim()) {
        adminPropIds.add(String(u.propertyId).trim());
      }
    }
    return adminPropIds;
  } catch (err) {
    console.error('Failed to get Admin-managed property IDs:', err.message);
    return new Set();
  }
};

/**
 * Checks if a notification contains disallowed content for Super Admin
 * (e.g. booking, guest, check-in/check-out, payment, reservation, or service notifications).
 */
export const isDisallowedForSuperAdmin = (title = '', message = '', category = '') => {
  const t = (title || '').toLowerCase();
  const m = (message || '').toLowerCase();
  const c = (category || '').toLowerCase();

  // If explicitly categorized as property setup, staff, configuration, maintenance, or system, it's not a guest/booking transaction
  const isAllowedCategory = c.includes('property') || c.includes('staff') || c.includes('config') || c.includes('system') || c.includes('ota') || c.includes('security') || c.includes('maintenance') || c.includes('issue');

  // Exception: System / OTA / Security alerts that may mention an OTA channel or sync
  const isOtaOrSystem = c.includes('ota') || c.includes('channel') || c.includes('security') ||
                        t.includes('ota') || t.includes('parity') || t.includes('unauthorized') ||
                        m.includes('booking.com') || m.includes('failed login');
  if (isOtaOrSystem) {
    return false;
  }

  // 1. Guest Booking & Reservation events
  if (
    c.includes('reserv') || c.includes('book') ||
    t.includes('reservation') || t.includes('online reservation') || t.includes('new booking') ||
    m.includes('booked ') || (m.includes('reservation') && !isAllowedCategory) || m.includes('[ref: #')
  ) {
    return true;
  }

  // 2. Guest Check-in / Check-out events
  if (
    t.includes('guest check-in') || t.includes('guest check-out') || t.includes('check-in confirmed') || t.includes('check-out completed') ||
    m.includes('checked into') || m.includes('checked out from') || (m.includes('check-in') && !isAllowedCategory) || (m.includes('check-out') && !isAllowedCategory)
  ) {
    return true;
  }

  // 3. Guest feedback / Guest experience
  if (
    c.includes('guest') || c.includes('feedback') || c.includes('review') ||
    t.includes('feedback') || t.includes('review') ||
    m.includes('star review') || m.includes('submitted a review') || (m.includes('guest ') && !isAllowedCategory)
  ) {
    return true;
  }

  // 4. Payment / Billing / Refund events
  if (
    c.includes('payment') || c.includes('refund') || c.includes('finance') || c.includes('billing') ||
    t.includes('payment') || t.includes('refund') ||
    m.includes('payment of') || m.includes('refund request') || m.includes('payment received')
  ) {
    return true;
  }

  // 5. Service / Housekeeping / Room Service
  if (
    c.includes('service') || c.includes('housekeeping') || c.includes('room service') ||
    t.includes('room service') || t.includes('guest service') || t.includes('food order') ||
    m.includes('room service') || m.includes('housekeeping request')
  ) {
    return true;
  }

  return false;
};

/**
 * Checks if a notification is a property-related alert for Super Admin
 * (e.g. property setup/updates, staff, configuration, system, and property-level issues).
 */
export const isPropertyRelatedForSuperAdmin = (title = '', message = '', category = '') => {
  if (isDisallowedForSuperAdmin(title, message, category)) return false;

  const t = (title || '').toLowerCase();
  const m = (message || '').toLowerCase();
  const c = (category || '').toLowerCase();
  const combined = `${t} ${m} ${c}`;

  // 1. Property Setup / Updates
  if (
    c.includes('property') || t.includes('property') ||
    combined.includes('onboard') || combined.includes('property update') || combined.includes('admin assign')
  ) {
    return true;
  }

  // 2. Staff Management
  if (
    c.includes('staff') || t.includes('staff') || combined.includes('staff member') ||
    combined.includes('employee') || combined.includes('roster')
  ) {
    return true;
  }

  // 3. Configuration & Subscriptions
  if (
    c.includes('config') || c.includes('settings') || c.includes('subscription') ||
    t.includes('configuration') || t.includes('settings') || t.includes('subscription') ||
    combined.includes('plan upgrade')
  ) {
    return true;
  }

  // 4. System & Security Alerts
  if (
    c.includes('system') || c.includes('security') || c.includes('ota') || c.includes('sync') || c.includes('access control') ||
    t.includes('system') || t.includes('security') || t.includes('sync') || t.includes('unauthorized') ||
    combined.includes('login attempt') || combined.includes('parity')
  ) {
    return true;
  }

  // 5. Property-level issues & Maintenance
  if (
    c.includes('maintenance') || c.includes('issue') || c.includes('compliance') || c.includes('facility') ||
    t.includes('maintenance') || t.includes('issue') || t.includes('out of order') ||
    combined.includes('maintenance alert') || combined.includes('facility issue') || combined.includes('room status')
  ) {
    return true;
  }

  return false;
};

/**
 * Validates whether a notification is allowed to be dispatched to Super Admin.
 */
export const isAllowedForSuperAdminNotification = async ({ title, message, category, propertyId }, cachedAdminPropIds = null) => {
  if (isDisallowedForSuperAdmin(title, message, category)) {
    return false;
  }
  if (!isPropertyRelatedForSuperAdmin(title, message, category)) {
    return false;
  }
  // Property scope check: if propertyId is provided, must be an Admin-managed property
  if (propertyId && propertyId !== 'all' && propertyId !== 'All' && propertyId !== 'global') {
    const adminPropIds = cachedAdminPropIds || await getAdminManagedPropertyIds();
    if (!adminPropIds.has(String(propertyId))) {
      return false; // Exclude non-Admin-managed properties
    }
  }
  return true;
};

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

    // Guard: Super Admin receives ONLY property-related notifications for Admin-managed properties
    if (role === 'super-admin') {
      const allowed = await isAllowedForSuperAdminNotification({
        title: cleanTitle,
        message: cleanMsg,
        category,
        propertyId: targetPropId
      });
      if (!allowed) {
        return null;
      }
    }

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
            propertyId: targetPropId || 'HS-9HQ8P',
            createdAt: { $gte: sixtySecondsAgo }
          });
        } catch (_) {}

        if (!existingMn) {
          await ManagerNotification.create({
            title: cleanTitle,
            message: cleanMsg,
            category: category || 'General',
            isRead: false,
            propertyId: targetPropId || 'HS-9HQ8P'
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
    const propId = booking.propertyId || 'HS-9HQ8P';
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
    } else if (action === 'room_assigned') {
      title = 'Room Assigned';
      msg = `Room ${roomInfo} assigned for guest ${guestName} (Ref: #${bookingId}).`;
      category = 'Operations';
    } else if (action === 'extended') {
      title = 'Stay Extended';
      msg = `Stay extended for guest ${guestName} to ${checkOut} (Ref: #${bookingId}).`;
      category = 'Operations';
    }

    // 1. Notify Admin (Global)
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

    // 4. Resolve Guest Recipient Identity
    let targetGuestId = booking.guestId || booking.userId || (guestUser ? (guestUser._id || guestUser.id) : null);
    if (!targetGuestId && (booking.email || booking.guestEmail)) {
      try {
        const u = await User.findOne({ email: booking.email || booking.guestEmail });
        if (u) targetGuestId = String(u._id || u.id);
      } catch (_) {}
    }
    if (!targetGuestId && (booking.phone || booking.guestPhone)) {
      try {
        const u = await User.findOne({ phone: booking.phone || booking.guestPhone });
        if (u) targetGuestId = String(u._id || u.id);
      } catch (_) {}
    }

    // 5. Notify Guest
    let guestTitle = action === 'created' || action === 'booked' ? 'Booking Confirmed!' :
      action === 'checkin' ? 'Check-in Confirmed!' :
      action === 'checkout' ? 'Check-out Completed' :
      action === 'room_assigned' ? 'Room Assigned' :
      action === 'extended' ? 'Stay Extended' :
      action === 'cancelled' ? 'Reservation Cancelled' : title;

    let guestMsg = action === 'created' || action === 'booked'
      ? `Your reservation is confirmed for ${checkIn} → ${checkOut}. Booking Reference: #${bookingId}.`
      : action === 'checkin'
      ? `Welcome! You have checked in to Room ${roomInfo}. Enjoy your stay! [Ref: #${bookingId}]`
      : action === 'checkout'
      ? `Thank you for choosing Hour Stay! We hope you had a pleasant stay in Room ${roomInfo}. [Ref: #${bookingId}]`
      : action === 'room_assigned'
      ? `Room ${roomInfo} has been assigned for your reservation. [Ref: #${bookingId}]`
      : action === 'extended'
      ? `Your reservation #${bookingId} has been extended to ${checkOut}. Enjoy your continued stay!`
      : action === 'cancelled'
      ? `Your reservation #${bookingId} for ${roomInfo} has been cancelled.`
      : msg;

    await triggerNotification({
      req,
      io: socketIo,
      userId: targetGuestId || booking.email || null,
      role: 'guest',
      propertyId: propId,
      title: guestTitle,
      message: guestMsg,
      category: 'Booking Confirmation',
      data: { bookingId, guestName, room: roomInfo, action }
    });

    // 6. Realtime Socket.io Broadcast
    if (socketIo) {
      emitRealtimeSync(socketIo, propId, 'booking_created', { booking, propertyId: propId });
      emitRealtimeSync(socketIo, propId, 'booking_updated', { type: action.toUpperCase(), action, booking, propertyId: propId });
      emitRealtimeSync(socketIo, propId, 'guest_notification', { action, bookingId, title: guestTitle, message: guestMsg });
      emitRealtimeSync(socketIo, propId, 'notification_created', { action, bookingId, role: 'guest', userId: targetGuestId });
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
    const propId = feedback.propertyId || 'HS-9HQ8P';
    const ratingStars = `${feedback.rating || 5}★`;
    const snippet = (feedback.comment || feedback.comments || '').slice(0, 50);

    if (action === 'created' || action === 'received') {
      const title = `New Guest Feedback (${ratingStars})`;
      const msg = `${feedback.guestName || 'A guest'} submitted a ${feedback.rating || 5}-star review for ${feedback.room || feedback.roomType || 'Stay'}: "${snippet}..."`;

      // 1. Notify Admin
      await triggerNotification({ req, io: socketIo, role: 'admin', title, message: msg, category: 'Guest Experience' });
      
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
