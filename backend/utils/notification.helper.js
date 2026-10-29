import Notification from '../models/notification.model.js';
import Property from '../models/property.model.js';
import { ManagerNotification, ReceptionistNotification, Feedback } from '../models/managerData.model.js';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import mongoose from 'mongoose';
import { emitRealtimeSync } from './socketEmitter.js';
import { sendPushToTokens } from '../services/fcm.service.js';

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

    // Persist to ManagerNotification for manager scoped notifications
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

    // Persist to ReceptionistNotification for receptionist scoped notifications
    if (role === 'receptionist') {
      try {
        let existingRn = null;
        try {
          existingRn = await ReceptionistNotification.findOne({
            title: cleanTitle,
            message: cleanMsg,
            propertyId: targetPropId || 'HS-9HQ8P',
            createdAt: { $gte: sixtySecondsAgo }
          });
        } catch (_) {}

        if (!existingRn) {
          await ReceptionistNotification.create({
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
      if (role === 'guest') {
        emitRealtimeSync(socketIo, targetPropId, 'guest_notification', notif);
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
        userQuery.push({ _id: String(userId) }, { id: String(userId) });
        if (typeof userId === 'string' && userId.includes('@')) {
          userQuery.push({ email: userId.toLowerCase().trim() });
        }
      }
      const potentialEmail = (data?.email || data?.guestEmail || data?.userEmail || '').toLowerCase().trim();
      if (potentialEmail) {
        userQuery.push({ email: potentialEmail });
      }
      const potentialPhone = (data?.phone || data?.guestPhone || data?.mobile || '').trim();
      if (potentialPhone) {
        const cleanP = potentialPhone.replace(/[^0-9]/g, '');
        userQuery.push({ phone: potentialPhone }, { mobile: potentialPhone });
        if (cleanP.length >= 10) {
          userQuery.push({ phone: { $regex: cleanP.slice(-10) } }, { mobile: { $regex: cleanP.slice(-10) } });
        }
      }

      if (userQuery.length === 0) {
        if (role && targetPropId) {
          userQuery.push({ role, propertyId: targetPropId });
        } else if (role) {
          userQuery.push({ role });
        } else if (targetPropId) {
          userQuery.push({ propertyId: targetPropId, role: 'manager' });
        } else {
          userQuery.push({ role: 'manager' });
        }
      }

      let targetUsers = [];
      if (userQuery.length > 0) {
        targetUsers = (await User.find({ $or: userQuery })) || [];
      }

      // Fallback: If role is guest and no user with token found yet, search via bookingId
      if (targetUsers.length === 0 && role === 'guest' && data?.bookingId) {
        try {
          const bDoc = await Booking.findOne({
            $or: [
              { bookingId: data.bookingId },
              { reservationNumber: data.bookingId },
              ...(mongoose.Types.ObjectId.isValid(data.bookingId) ? [{ _id: data.bookingId }] : [])
            ]
          }).lean();
          if (bDoc) {
            const fallbackQueries = [];
            if (bDoc.userId) fallbackQueries.push({ _id: String(bDoc.userId) }, { id: String(bDoc.userId) });
            if (bDoc.guestId) fallbackQueries.push({ _id: String(bDoc.guestId) }, { id: String(bDoc.guestId) });
            if (bDoc.email) fallbackQueries.push({ email: bDoc.email.toLowerCase().trim() });
            if (bDoc.phone) {
              const cleanP = bDoc.phone.replace(/[^0-9]/g, '');
              fallbackQueries.push({ phone: bDoc.phone }, { mobile: bDoc.phone });
              if (cleanP.length >= 10) {
                fallbackQueries.push({ phone: { $regex: cleanP.slice(-10) } }, { mobile: { $regex: cleanP.slice(-10) } });
              }
            }
            if (fallbackQueries.length > 0) {
              targetUsers = (await User.find({ $or: fallbackQueries })) || [];
            }
          }
        } catch (_) {}
      }

      const tokens = new Set();
      for (const u of (targetUsers || [])) {
        if (u.fcmToken) tokens.add(u.fcmToken);
        if (Array.isArray(u.fcmTokens)) {
          for (const t of u.fcmTokens) {
            if (t) tokens.add(t);
          }
        }
      }

      if (tokens.size > 0) {
        console.log(`📱 [FCM PUSH] Dispatching notification to ${tokens.size} token(s) for "${cleanTitle}"...`);
        sendPushToTokens(Array.from(tokens), {
          title: cleanTitle,
          body: cleanMsg,
          data: {
            ...(data || {}),
            notificationId: notif._id || notif.id,
            category: category || 'General',
            role: role || '',
            propertyId: targetPropId || ''
          },
          notificationId: notif._id || notif.id,
          category: category || 'General',
          role: role || '',
          propertyId: targetPropId || ''
        }).then(res => {
          console.log(`✅ [FCM PUSH RESULT] Sent: ${res.successCount} succeeded, ${res.failureCount} failed for "${cleanTitle}"`);
        }).catch(pushErr => console.warn("⚠️ FCM push dispatch notice:", pushErr.message));
      } else {
        console.log(`ℹ️ [FCM PUSH] No device tokens found for notification "${cleanTitle}" (role: ${role || 'all'}, userId: ${userId || 'none'})`);
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
export const notifyBookingEvent = async ({ req, io, action = 'created', booking, guestUser = null, property = null, minutesRemaining = 15 }) => {
  try {
    const socketIo = io || (req && req.app ? req.app.get('socketio') : null);
    const propId = booking.propertyId || 'HS-9HQ8P';
    const guestName = booking.guest || booking.guestName || 'A Guest';
    const roomInfo = booking.room || booking.roomType || 'Standard Room';
    const bookingId = booking.bookingId || booking._id || booking.id || '';
    const checkIn = booking.checkIn || booking.checkInDate || 'Today';
    const checkOut = booking.checkOut || booking.checkOutDate || 'Tomorrow';
    const amount = booking.totalAmount || booking.amount || 0;

    const bStatus = String(booking.status || '').toLowerCase().trim();
    const isAlreadyCheckedIn = bStatus === 'checked-in' || bStatus === 'checked in' || bStatus === 'staying' || bStatus === 'in-house';
    const isEndedOrCancelled = bStatus === 'checked-out' || bStatus === 'checked out' || bStatus === 'cancelled' || bStatus === 'no-show';

    // Strictly suppress check-in reminder & arrival notifications if guest is already checked-in or stay has ended
    if ((action === 'checkin_reminder' || action === 'checkin_arrived') && (isAlreadyCheckedIn || isEndedOrCancelled)) {
      console.log(`ℹ️ [notifyBookingEvent] Suppressing '${action}' for booking #${bookingId} because status is already '${booking.status}'.`);
      return;
    }

    if (action === 'checkin') {
      // Mark flags on booking document so scheduler never sends check-in reminders
      Booking.findByIdAndUpdate(booking._id || booking.id, {
        checkinReminderSent: true,
        checkinArrivedSent: true
      }).catch(() => null);

      // Auto-resolve any pending check-in arrival alerts for this booking in Notification collection
      Notification.updateMany(
        {
          $or: [
            { title: /check-in/i },
            { category: 'Check-in' }
          ],
          message: new RegExp(String(bookingId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
          isRead: false
        },
        { $set: { isRead: true } }
      ).catch(() => null);
    }

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
    } else if (action === 'checkin_reminder') {
      title = `Check-in in ${minutesRemaining || 15} Minutes`;
      msg = `Check-in approaching in ${minutesRemaining || 15} minutes for guest ${guestName} (${roomInfo}). [Ref: #${bookingId}]`;
      category = 'Check-in';
    } else if (action === 'checkin_arrived') {
      title = 'Check-in Time Arrived';
      msg = `Scheduled check-in time has arrived for guest ${guestName} (${roomInfo}). [Ref: #${bookingId}]`;
      category = 'Check-in';
    } else if (action === 'checkin') {
      title = 'Guest Checked In';
      msg = `Guest ${guestName} checked into ${roomInfo} (Ref: #${bookingId}).`;
      category = 'Operations';
    } else if (action === 'checkout_reminder') {
      title = `Check-out in ${minutesRemaining || 15} Minutes`;
      msg = `Check-out approaching in ${minutesRemaining || 15} minutes for guest ${guestName} in ${roomInfo}. [Ref: #${bookingId}]`;
      category = 'Check-out';
    } else if (action === 'checkout') {
      title = 'Guest Checked Out';
      msg = `Guest ${guestName} checked out from ${roomInfo} (Ref: #${bookingId}).`;
      category = 'Check-out';
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
      data: { bookingId, guestName, room: roomInfo, action, minutesRemaining }
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
      data: { bookingId, guestName, room: roomInfo, action, minutesRemaining }
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
      data: { bookingId, guestName, room: roomInfo, action, minutesRemaining }
    });

    // 4. Resolve Guest Recipient Identity and User Document robustly
    let resolvedGuestUser = guestUser || null;
    const bookingGuestEmail = (booking.email || booking.guestEmail || '').toLowerCase().trim();
    const bookingGuestPhone = (booking.phone || booking.guestPhone || '').trim();
    const rawGuestId = booking.guestId || booking.userId || null;

    if (!resolvedGuestUser && rawGuestId) {
      try {
        const u = await User.findOne({
          $or: [
            { _id: String(rawGuestId) },
            { id: String(rawGuestId) }
          ]
        });
        if (u) resolvedGuestUser = u;
      } catch (_) {}
    }

    if (!resolvedGuestUser && bookingGuestEmail) {
      try {
        const u = await User.findOne({ email: bookingGuestEmail });
        if (u) resolvedGuestUser = u;
      } catch (_) {}
    }

    if (!resolvedGuestUser && bookingGuestPhone) {
      try {
        const cleanPhone = bookingGuestPhone.replace(/[^0-9]/g, '');
        const u = await User.findOne({
          $or: [
            { phone: bookingGuestPhone },
            { mobile: bookingGuestPhone },
            ...(cleanPhone.length >= 10 ? [
              { phone: { $regex: cleanPhone.slice(-10) } },
              { mobile: { $regex: cleanPhone.slice(-10) } }
            ] : [])
          ]
        });
        if (u) resolvedGuestUser = u;
      } catch (_) {}
    }

    const targetGuestId = resolvedGuestUser
      ? String(resolvedGuestUser._id || resolvedGuestUser.id)
      : (rawGuestId ? String(rawGuestId) : bookingGuestEmail || null);

    // If we resolved a real user, ensure booking document is linked to this user
    if (resolvedGuestUser && booking._id && !booking.userId) {
      Booking.findByIdAndUpdate(booking._id, { userId: String(resolvedGuestUser._id || resolvedGuestUser.id) }).catch(() => null);
    }

    // 5. Notify Guest
    let guestTitle = action === 'created' || action === 'booked' ? 'Booking Confirmed!' :
      action === 'checkin_reminder' ? `Check-in in ${minutesRemaining || 15} Minutes` :
      action === 'checkin_arrived' ? 'Check-in Time Arrived' :
      action === 'checkin' ? 'Check-in Confirmed!' :
      action === 'checkout_reminder' ? `Check-out in ${minutesRemaining || 15} Minutes` :
      action === 'checkout' ? 'Check-out Time Arrived' :
      action === 'room_assigned' ? 'Room Assigned' :
      action === 'extended' ? 'Stay Extended' :
      action === 'cancelled' ? 'Reservation Cancelled' : title;

    let guestMsg = action === 'created' || action === 'booked'
      ? `Your reservation is confirmed for ${checkIn} → ${checkOut}. Booking Reference: #${bookingId}.`
      : action === 'checkin_reminder'
      ? `Your check-in time for Room ${roomInfo} is approaching in ${minutesRemaining || 15} minutes. You can review your booking or prepare for arrival at the hotel. [Ref: #${bookingId}]`
      : action === 'checkin_arrived'
      ? `Your scheduled check-in time has arrived for Room ${roomInfo}! Welcome to Hour Stay. Please visit the reception desk to complete check-in. [Ref: #${bookingId}]`
      : action === 'checkin'
      ? `Welcome! You have checked in to Room ${roomInfo}. Enjoy your stay! [Ref: #${bookingId}]`
      : action === 'checkout_reminder'
      ? `Your check-out time for Room ${roomInfo} is approaching in ${minutesRemaining || 15} minutes. If you want to stay extra, please extend your booking or contact the front desk. [Ref: #${bookingId}]`
      : action === 'checkout'
      ? `Your scheduled check-out time has arrived for Room ${roomInfo}. If you want to stay extra, please extend your booking or visit the front desk to complete check-out. [Ref: #${bookingId}]`
      : action === 'room_assigned'
      ? `Room ${roomInfo} has been assigned for your reservation. [Ref: #${bookingId}]`
      : action === 'extended'
      ? `Your reservation #${bookingId} has been extended to ${checkOut}. Enjoy your continued stay!`
      : action === 'cancelled'
      ? `Your reservation #${bookingId} for ${roomInfo} has been cancelled.`
      : msg;

    const guestCategory = (action === 'checkout' || action === 'checkout_reminder') ? 'Check-out' :
      (action === 'checkin' || action === 'checkin_reminder' || action === 'checkin_arrived') ? 'Check-in' :
      action === 'created' || action === 'booked' ? 'Booking Confirmation' :
      'Stay';

    await triggerNotification({
      req,
      io: socketIo,
      userId: targetGuestId || bookingGuestEmail || null,
      role: 'guest',
      propertyId: propId,
      title: guestTitle,
      message: guestMsg,
      category: guestCategory,
      data: {
        bookingId,
        guestName,
        room: roomInfo,
        action,
        status: action === 'checkin' ? 'Checked-in' : booking.status,
        minutesRemaining,
        email: bookingGuestEmail,
        guestEmail: bookingGuestEmail,
        phone: bookingGuestPhone,
        guestPhone: bookingGuestPhone,
        userId: targetGuestId
      }
    });

    // 6. Realtime Socket.io Broadcast
    if (socketIo) {
      emitRealtimeSync(socketIo, propId, 'booking_created', { booking, propertyId: propId });
      emitRealtimeSync(socketIo, propId, 'booking_updated', { type: action.toUpperCase(), action, booking, propertyId: propId });
      emitRealtimeSync(socketIo, propId, 'guest_notification', {
        action,
        bookingId,
        title: guestTitle,
        message: guestMsg,
        category: guestCategory,
        userId: targetGuestId,
        email: bookingGuestEmail,
        phone: bookingGuestPhone
      });
      emitRealtimeSync(socketIo, propId, 'notification_created', {
        action,
        bookingId,
        role: 'guest',
        userId: targetGuestId,
        title: guestTitle,
        message: guestMsg,
        category: guestCategory,
        email: bookingGuestEmail,
        phone: bookingGuestPhone
      });
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
      const bRef = feedback.bookingId || feedback.id || (feedback._id ? String(feedback._id) : '');
      const propName = feedback.propertyName || 'Hour Stay Luxury Hotel';
      const replySnippet = (feedback.response || '').trim();

      // 1. Resolve guest recipient by all available identifiers
      let guestUserId = feedback.userId ? String(feedback.userId).trim() : null;
      let guestEmail = (feedback.guestEmail || '').toLowerCase().trim();
      let guestPhone = (feedback.guestPhone || '').trim();

      // Look up User by email if no guestUserId
      if (!guestUserId && guestEmail) {
        try {
          const u = await User.findOne({ email: guestEmail });
          if (u) guestUserId = String(u._id || u.id);
        } catch (_) {}
      }

      // Look up User by phone if still no guestUserId
      if (!guestUserId && guestPhone) {
        try {
          const u = await User.findOne({ $or: [{ phone: guestPhone }, { mobile: guestPhone }] });
          if (u) guestUserId = String(u._id || u.id);
        } catch (_) {}
      }

      // Look up Booking by bookingId / reservationNumber
      if (bRef) {
        try {
          const bookingDoc = await Booking.findOne({
            $or: [
              { bookingId: bRef },
              { reservationNumber: bRef },
              ...(mongoose.Types.ObjectId.isValid(bRef) ? [{ _id: bRef }] : [])
            ]
          }).lean();

          if (bookingDoc) {
            if (!guestUserId && (bookingDoc.guestId || bookingDoc.userId)) {
              guestUserId = String(bookingDoc.guestId || bookingDoc.userId);
            }
            if (!guestEmail && (bookingDoc.email || bookingDoc.guestEmail)) {
              guestEmail = (bookingDoc.email || bookingDoc.guestEmail).toLowerCase().trim();
            }
          }
        } catch (_) {}
      }

      // If resolved guestUserId and Feedback document didn't have it, persist it
      if (guestUserId && !feedback.userId && feedback._id) {
        try {
          await Feedback.findByIdAndUpdate(feedback._id, { userId: guestUserId });
        } catch (_) {}
      }

      const guestTitle = `Hotel Replied to Your Feedback`;
      const guestMsg = `${actor || 'Hotel Management'} replied to your review for ${propName}: "${replySnippet.slice(0, 80)}${replySnippet.length > 80 ? '...' : ''}" [ref: #${bRef}]`;

      // Dispatch to Guest (both via userId and email fallback so guest query in guest.routes.js finds it)
      const targetGuestId = guestUserId || guestEmail || null;
      if (targetGuestId) {
        await triggerNotification({
          req,
          io: socketIo,
          userId: targetGuestId,
          role: 'guest',
          propertyId: propId,
          title: guestTitle,
          message: guestMsg,
          category: 'Guest Experience',
          data: {
            feedbackId: String(feedback._id || feedback.id),
            bookingId: bRef,
            action: 'feedback_responded'
          }
        });
      } else {
        await triggerNotification({
          req,
          io: socketIo,
          role: 'guest',
          propertyId: propId,
          title: guestTitle,
          message: guestMsg,
          category: 'Guest Experience',
          data: {
            feedbackId: String(feedback._id || feedback.id),
            bookingId: bRef,
            action: 'feedback_responded'
          }
        });
      }

      // Notify Admin & Manager
      const staffTitle = `Management Responded to Feedback`;
      const staffMsg = `${actor || 'Management'} replied to review #${bRef}: "${replySnippet.slice(0, 60)}..."`;
      await triggerNotification({ req, io: socketIo, role: 'admin', propertyId: propId, title: staffTitle, message: staffMsg, category: 'Guest Experience' });
      await triggerNotification({ req, io: socketIo, role: 'manager', propertyId: propId, title: staffTitle, message: staffMsg, category: 'Guest Experience' });

      if (socketIo) {
        emitRealtimeSync(socketIo, propId, 'feedback_updated', feedback);
        emitRealtimeSync(socketIo, propId, 'guest_notification', {
          title: guestTitle,
          message: guestMsg,
          category: 'Guest Experience',
          userId: targetGuestId
        });
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

/**
 * Handles notification distribution across Admin, Manager, Receptionist, and Guest when an account is deleted.
 */
export const notifyAccountDeletionEvent = async ({ req, io, user }) => {
  try {
    if (!user) return;
    const socketIo = io || (req && req.app ? req.app.get('socketio') : null);
    const userName = user.name || 'Guest User';
    const userEmail = (user.email || 'guest@hourstay.com').toLowerCase().trim();
    const userId = String(user._id || user.id || '');
    const propId = user.propertyId || 'HS-9HQ8P';

    const adminTitle = `Guest Account Deleted: ${userName}`;
    const adminMsg = `Guest ${userName} (${userEmail}) permanently deleted their account. Status has been updated to Inactive.`;

    const guestTitle = `Your Hour Stay Account Has Been Deleted`;
    const guestMsg = `Your account (${userEmail}) and profile credentials have been permanently deleted and marked Inactive.`;

    // 1. Notify Admin Portal
    await triggerNotification({
      req,
      io: socketIo,
      role: 'admin',
      propertyId: null,
      title: adminTitle,
      message: adminMsg,
      category: 'System',
      data: { userId, email: userEmail, status: 'Inactive', event: 'account_deleted' }
    });

    // 2. Notify Manager Portal
    await triggerNotification({
      req,
      io: socketIo,
      role: 'manager',
      propertyId: propId,
      title: adminTitle,
      message: adminMsg,
      category: 'System',
      data: { userId, email: userEmail, status: 'Inactive', event: 'account_deleted' }
    });

    // Also ensure default property has ManagerNotification
    if (propId !== 'HS-9HQ8P') {
      await triggerNotification({
        req,
        io: socketIo,
        role: 'manager',
        propertyId: 'HS-9HQ8P',
        title: adminTitle,
        message: adminMsg,
        category: 'System',
        data: { userId, email: userEmail, status: 'Inactive', event: 'account_deleted' }
      });
    }

    // 3. Notify Receptionist Portal
    await triggerNotification({
      req,
      io: socketIo,
      role: 'receptionist',
      propertyId: propId,
      title: adminTitle,
      message: adminMsg,
      category: 'System',
      data: { userId, email: userEmail, status: 'Inactive', event: 'account_deleted' }
    });

    if (propId !== 'HS-9HQ8P') {
      await triggerNotification({
        req,
        io: socketIo,
        role: 'receptionist',
        propertyId: 'HS-9HQ8P',
        title: adminTitle,
        message: adminMsg,
        category: 'System',
        data: { userId, email: userEmail, status: 'Inactive', event: 'account_deleted' }
      });
    }

    // Direct fallback write into dedicated role tables
    try {
      await Promise.all([
        ManagerNotification.create({
          title: adminTitle,
          message: adminMsg,
          category: 'System',
          isRead: false,
          propertyId: propId
        }).catch(() => null),
        ReceptionistNotification.create({
          title: adminTitle,
          message: adminMsg,
          category: 'System',
          isRead: false,
          propertyId: propId
        }).catch(() => null)
      ]);
    } catch (_) {}

    // Real-time broadcast sync strictly for administrative/management consoles
    if (socketIo) {
      const payload = {
        id: userId,
        userId: userId,
        email: userEmail,
        name: userName,
        role: user.role || 'guest',
        status: 'Inactive',
        isDeleted: true
      };
      const notifPayload = {
        title: adminTitle,
        message: adminMsg,
        category: 'System',
        role: 'admin',
        propertyId: propId,
        data: { userId, email: userEmail, status: 'Inactive' },
        createdAt: new Date().toISOString()
      };

      emitRealtimeSync(socketIo, propId, 'guest_deleted', payload);
      emitRealtimeSync(socketIo, propId, 'guest_status_changed', payload);
      emitRealtimeSync(socketIo, propId, 'user_updated', payload);
      emitRealtimeSync(socketIo, propId, 'manager_notification', notifPayload);
      emitRealtimeSync(socketIo, propId, 'unread_notifications_count_updated', { role: 'manager', propertyId: propId });
      emitRealtimeSync(socketIo, 'global', 'unread_notifications_count_updated', { role: 'admin' });
      emitRealtimeSync(socketIo, propId, 'dashboard_sync', { propertyId: propId, action: 'guest_account_deleted', userId });
    }
  } catch (err) {
    console.error("❌ Failed to broadcast account deletion notification:", err.message);
  }
};

/**
 * Purges any legacy Account Deletion alerts accidentally saved under Guest or All-role scope.
 */
export const purgeGuestAccountDeletionNotifications = async () => {
  try {
    const deletionFilter = {
      $or: [
        { title: { $regex: /account deleted|account has been deleted|deleted account/i } },
        { message: { $regex: /account deleted|permanently deleted their account|credentials have been permanently deleted/i } },
        { category: 'Account Deletion' }
      ],
      role: { $in: ['guest', 'all', null] }
    };
    await Notification.deleteMany(deletionFilter).catch(() => null);
  } catch (err) {
    console.warn("Notice: account deletion notifications cleanup:", err.message);
  }
};

/**
 * Checks if a property's subscription plan expires within 15 days (or is already expired).
 * If so, dispatches an alert notification to Admin if one hasn't been sent within the last 24 hours.
 */
export const checkAndNotifySubscriptionExpiry = async (property, req = null) => {
  try {
    if (!property || !property.subscriptionExpiry) return null;

    const expiryDate = new Date(property.subscriptionExpiry);
    if (isNaN(expiryDate.getTime())) return null;

    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Only notify if expiring within 15 days (daysRemaining <= 15, including <= 0 expired)
    if (daysRemaining > 15) return null;

    const propertyId = String(property._id || property.id || 'HS-9HQ8P');
    const planName = property.subscriptionPlanName || property.subscriptionTier || 'Subscription';
    const dateFormatted = expiryDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const isExpired = daysRemaining <= 0;
    const title = isExpired ? 'Subscription Plan Expired' : 'Subscription Plan Expiring Soon';
    const message = isExpired
      ? `Your ${planName} subscription plan expired on ${dateFormatted}. Please renew your plan immediately to maintain uninterrupted access to all hotel operations.`
      : `Your ${planName} subscription plan will expire in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} on ${dateFormatted}. Please renew your plan before expiration to prevent service interruption.`;

    // 24-hour deduplication check to prevent duplicate notifications
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await Notification.findOne({
      role: 'admin',
      $or: [
        { propertyId },
        { propertyId: null }
      ],
      category: 'Subscription',
      title: { $regex: /expir/i },
      createdAt: { $gte: twentyFourHoursAgo }
    });

    if (existing) {
      return existing;
    }

    const notif = await triggerNotification({
      req,
      role: 'admin',
      propertyId,
      title,
      message,
      category: 'Subscription',
      data: {
        type: 'subscription_expiry',
        daysRemaining,
        expiryDate: expiryDate.toISOString(),
        planName,
        isExpired
      }
    });

    return notif;
  } catch (err) {
    console.error('❌ Error in checkAndNotifySubscriptionExpiry:', err.message);
    return null;
  }
};


