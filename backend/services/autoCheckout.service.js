import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';
import Property from '../models/property.model.js';
import { syncRoomStatus, extractRoomNumber, extractRoomVariant, reconcileRoomStatuses } from '../utils/roomHelper.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from '../utils/socketEmitter.js';
import { notifyBookingEvent } from '../utils/notification.helper.js';
import { isCheckOutDue, formatISTDateTime, parseDateTimeToIST } from '../utils/dateUtils.js';

let isRunning = false;
let globalIo = null;

export const setAutoCheckoutIo = (io) => {
  if (io) globalIo = io;
};

/**
 * Sweeps all active in-stay bookings and automatically marks any whose
 * scheduled checkout date & time has passed as 'Checked-out'.
 * Updates room status to Available, closes folio, sends real-time socket events,
 * and creates persistent notifications.
 */
export const processAutoCheckouts = async (ioInstance = null) => {
  if (isRunning) return { processed: 0, skipped: true };
  isRunning = true;

  const io = ioInstance || globalIo;
  const now = new Date();
  const checkedOutList = [];

  try {
    // Retrieve all active in-stay bookings
    const activeBookings = await Booking.find({
      status: { $in: ['Checked-in', 'Checked In', 'Staying', 'Staying-In', 'active'] }
    });

    if (!activeBookings || activeBookings.length === 0) {
      isRunning = false;
      return { processed: 0, checkedOut: [] };
    }

    // Cache property settings for default checkOutTime if not on booking
    let propertySettingsCache = {};
    try {
      const properties = await Property.find({}).lean();
      if (Array.isArray(properties)) {
        properties.forEach(p => {
          const propId = p.propertyId || p.id || p._id;
          if (propId && p.settings?.checkOutTime) {
            propertySettingsCache[String(propId)] = p.settings.checkOutTime;
          }
        });
      }
    } catch (_) {
      // Fallback to default
    }

    for (const b of activeBookings) {
      const bookingData = b.toObject ? b.toObject() : b;
      
      // If booking doesn't have an explicit checkOutTime, check property settings
      if (!bookingData.checkOutTime && bookingData.propertyId && propertySettingsCache[String(bookingData.propertyId)]) {
        bookingData.checkOutTime = propertySettingsCache[String(bookingData.propertyId)];
      }

      const bId = bookingData._id || bookingData.id || bookingData.bookingId;
      const roomNum = extractRoomNumber(bookingData);
      const propId = bookingData.propertyId || 'HS-9HQ8P';

      // 1. Pre-checkout reminder: Trigger notification 10 to 15 mins before scheduled checkout
      const checkOutDate = bookingData.checkOut || bookingData.checkOutDate;
      const checkOutTime = bookingData.checkOutTime || bookingData.checkOutSlot || '11:00 AM';
      const scheduledCheckout = parseDateTimeToIST(checkOutDate, checkOutTime);

      if (scheduledCheckout) {
        const diffMins = Math.round((scheduledCheckout.getTime() - now.getTime()) / 60000);
        if (diffMins <= 15 && diffMins > 0 && !bookingData.checkoutReminderSent) {
          try {
            console.log(`⏰ [CheckoutReminder] Sending 15-min checkout reminder for booking #${bookingData.bookingId || bId} (Room: ${roomNum || 'N/A'}, Remaining: ${diffMins}m)`);
            await notifyBookingEvent({
              action: 'checkout_reminder',
              booking: bookingData,
              minutesRemaining: diffMins,
              io
            });
            await Booking.findByIdAndUpdate(bId, {
              checkoutReminderSent: true,
              checkoutReminderSentAt: now.toISOString()
            });
            bookingData.checkoutReminderSent = true;
          } catch (reminderErr) {
            console.warn(`⚠️ Failed to dispatch checkout reminder for booking #${bId}:`, reminderErr.message);
          }
        }
      }

      // 2. Checkout time arrived: Process auto-checkout
      if (isCheckOutDue(bookingData, now)) {
        console.log(`⏰ [AutoCheckOut] Automatically checking out booking #${bookingData.bookingId || bId} (Guest: ${bookingData.guest || bookingData.name}, Room: ${roomNum || 'N/A'}, Scheduled checkout: ${bookingData.checkOut} ${bookingData.checkOutTime || '11:00 AM'}) at server time ${formatISTDateTime(now)}`);

        const updatePayload = {
          status: 'Checked-out',
          checkedOutAt: now.toISOString(),
          autoCheckedOut: true,
          autoCheckedOutAt: now.toISOString(),
          folioStatus: 'Closed'
        };

        const updated = await Booking.findByIdAndUpdate(bId, updatePayload, { new: true });
        const record = updated ? (updated.toObject ? updated.toObject() : updated) : { ...bookingData, ...updatePayload };

        // 1. Release room status back to Available
        if (roomNum) {
          try {
            const rVariant = bookingData.roomVariant || extractRoomVariant(bookingData);
            await syncRoomStatus(roomNum, 'Available', propId, io, rVariant);
          } catch (rmErr) {
            console.warn(`⚠️ Failed to sync room #${roomNum} on auto-checkout:`, rmErr.message);
          }
        }

        // 1b. Close folio in folios collection if exists
        try {
          const folioColl = mongoose.connection?.collection('folios');
          if (folioColl) {
            await folioColl.updateMany(
              {
                $or: [
                  { reservationId: String(bId) },
                  { reservationId: bId },
                  { bookingId: bookingData.bookingId },
                  { id: String(bId) }
                ]
              },
              { $set: { status: 'Closed', closedAt: now.toISOString() } }
            );
          }
        } catch (fErr) {
          console.warn('⚠️ Folio collection update skipped:', fErr.message);
        }

        // 2. Real-time broadcast to all dashboards
        if (io) {
          try {
            broadcastCheckinCheckout(io, propId, {
              action: 'checkout',
              booking: record,
              roomNumber: roomNum,
              status: 'Checked-out',
              autoCheckout: true
            });

            emitRealtimeSync(io, propId, 'checkout_completed', {
              propertyId: propId,
              bookingId: bId,
              roomNumber: roomNum,
              status: 'Checked-out',
              auto: true
            });

            emitRealtimeSync(io, propId, 'booking_updated', {
              propertyId: propId,
              bookingId: bId,
              status: 'Checked-out',
              action: 'auto_checkout'
            });

            emitRealtimeSync(io, propId, 'room_status_changed', {
              propertyId: propId,
              roomNumber: roomNum,
              status: 'Available'
            });
          } catch (sockErr) {
            console.warn('⚠️ Realtime emit error during auto-checkout:', sockErr.message);
          }
        }

        // 3. Dispatch persistent notifications to Receptionist, Manager, and Guest
        try {
          await notifyBookingEvent({
            action: 'checkout',
            booking: record
          });
        } catch (notifErr) {
          console.warn('⚠️ Notification error during auto-checkout:', notifErr.message);
        }

        checkedOutList.push({
          bookingId: bookingData.bookingId || bId,
          guest: bookingData.guest,
          room: roomNum,
          checkOut: bookingData.checkOut
        });
      }
    }

    if (checkedOutList.length > 0) {
      try {
        await reconcileRoomStatuses();
      } catch (recErr) {
        console.warn('⚠️ Room status reconciliation error:', recErr.message);
      }
    }

    isRunning = false;
    return { processed: checkedOutList.length, checkedOut: checkedOutList };
  } catch (error) {
    console.error('❌ Auto-checkout processing error:', error);
    isRunning = false;
    return { error: error.message, processed: 0 };
  }
};

/**
 * Sweeps all upcoming confirmed/booked reservations and sends:
 * 1. Pre-checkin reminder notification (10 to 15 mins before scheduled check-in)
 * 2. Check-in time arrived notification when scheduled check-in time is reached.
 */
export const processCheckInReminders = async (ioInstance = null) => {
  const io = ioInstance || globalIo;
  const now = new Date();

  try {
    const upcomingBookings = await Booking.find({
      status: {
        $in: [
          'Confirmed', 'confirmed',
          'Paid', 'paid',
          'Reserved', 'reserved',
          'Booked', 'booked',
          'Pending', 'pending',
          'Upcoming', 'upcoming',
          'Active', 'active'
        ]
      }
    });

    if (!upcomingBookings || upcomingBookings.length === 0) return { processed: 0 };

    // Cache property settings for default checkInTime & checkOutTime if not on booking
    let propertySettingsCache = {};
    try {
      const properties = await Property.find({}).lean();
      if (Array.isArray(properties)) {
        properties.forEach(p => {
          const propId = p.propertyId || p.id || p._id;
          if (propId) {
            propertySettingsCache[String(propId)] = {
              checkInTime: p.settings?.checkInTime || '12:00 PM',
              checkOutTime: p.settings?.checkOutTime || '11:00 AM'
            };
          }
        });
      }
    } catch (_) {}

    for (const b of upcomingBookings) {
      const bookingData = b.toObject ? b.toObject() : b;
      const bId = bookingData._id || bookingData.id || bookingData.bookingId;
      const roomNum = extractRoomNumber(bookingData);

      const bStatus = String(bookingData.status || '').toLowerCase().trim();
      // If already checked in or ended, skip immediately
      if (bStatus.includes('checked-in') || bStatus.includes('stay') || bStatus.includes('in-house') || bStatus.includes('checked-out') || bStatus.includes('cancel')) {
        if (!bookingData.checkinReminderSent || !bookingData.checkinArrivedSent) {
          await Booking.findByIdAndUpdate(bId, { checkinReminderSent: true, checkinArrivedSent: true });
        }
        continue;
      }

      const propSettings = propertySettingsCache[String(bookingData.propertyId)] || {};
      const checkInDate = bookingData.checkIn || bookingData.checkInDate;
      const checkInTime = bookingData.checkInTime || bookingData.checkInSlot || propSettings.checkInTime || '12:00 PM';
      const scheduledCheckIn = parseDateTimeToIST(checkInDate, checkInTime);

      const checkOutDate = bookingData.checkOut || bookingData.checkOutDate;
      const checkOutTime = bookingData.checkOutTime || bookingData.checkOutSlot || propSettings.checkOutTime || '11:00 AM';
      const scheduledCheckOut = parseDateTimeToIST(checkOutDate, checkOutTime);

      // If scheduled checkout has already passed, stay is in the past! Mark flags and skip
      if (scheduledCheckOut && now >= scheduledCheckOut) {
        if (!bookingData.checkinReminderSent || !bookingData.checkinArrivedSent) {
          await Booking.findByIdAndUpdate(bId, { checkinReminderSent: true, checkinArrivedSent: true });
        }
        continue;
      }

      if (scheduledCheckIn) {
        const diffMins = Math.round((scheduledCheckIn.getTime() - now.getTime()) / 60000);

        // Pre-checkin reminder: 15 mins before scheduled checkin (diffMins between 1 and 15)
        if (diffMins <= 15 && diffMins > 0 && !bookingData.checkinReminderSent) {
          try {
            console.log(`🛎️ [CheckinReminder] Sending 15-min check-in reminder for booking #${bookingData.bookingId || bId} (Room: ${roomNum || 'N/A'}, Remaining: ${diffMins}m)`);
            await notifyBookingEvent({
              action: 'checkin_reminder',
              booking: bookingData,
              minutesRemaining: diffMins,
              io
            });
            await Booking.findByIdAndUpdate(bId, {
              checkinReminderSent: true,
              checkinReminderSentAt: now.toISOString()
            });
            bookingData.checkinReminderSent = true;
          } catch (reminderErr) {
            console.warn(`⚠️ Failed to dispatch check-in reminder for booking #${bId}:`, reminderErr.message);
          }
        } else if (diffMins <= 0 && diffMins >= -180 && !bookingData.checkinArrivedSent) {
          // Check-in time has arrived within the last 3 hours: notify guest that room/front-desk is ready
          try {
            console.log(`🛎️ [CheckinArrived] Sending check-in arrived notification for booking #${bookingData.bookingId || bId} (Room: ${roomNum || 'N/A'})`);
            await notifyBookingEvent({
              action: 'checkin_arrived',
              booking: bookingData,
              io
            });
            await Booking.findByIdAndUpdate(bId, {
              checkinArrivedSent: true,
              checkinReminderSent: true,
              checkinArrivedSentAt: now.toISOString()
            });
            bookingData.checkinArrivedSent = true;
            bookingData.checkinReminderSent = true;
          } catch (arrivedErr) {
            console.warn(`⚠️ Failed to dispatch check-in arrived notification for #${bId}:`, arrivedErr.message);
          }
        } else if (diffMins < -180 && !bookingData.checkinArrivedSent) {
          // Check-in was more than 3 hours ago: mark sent without sending stale notifications
          await Booking.findByIdAndUpdate(bId, {
            checkinArrivedSent: true,
            checkinReminderSent: true,
            checkinArrivedSentAt: now.toISOString()
          });
          bookingData.checkinArrivedSent = true;
          bookingData.checkinReminderSent = true;
        }
      }
    }
  } catch (err) {
    console.error('❌ Check-in reminder processing error:', err.message);
  }
};

/**
 * Non-blocking convenience function to trigger an auto-checkout sweep
 * before returning reservation queries.
 */
export const runAutoCheckoutSweep = () => {
  processAutoCheckouts().catch(err => {
    console.warn('AutoCheckout sweep error:', err.message);
  });
  processCheckInReminders().catch(err => {
    console.warn('CheckIn reminders sweep error:', err.message);
  });
};

/**
 * Initializes the background scheduler running periodically every 30 seconds.
 */
export const startAutoCheckoutScheduler = (io = null, intervalMs = 30000) => {
  if (io) setAutoCheckoutIo(io);

  console.log(`⏰ [AutoCheckOut] Initializing persistent auto-checkout scheduler (Interval: ${intervalMs / 1000}s)`);

  // Run immediate initial sweep on startup/restart
  processAutoCheckouts(io).then(res => {
    if (res && res.processed > 0) {
      console.log(`✅ [AutoCheckOut] Initial startup sweep completed: ${res.processed} booking(s) checked out.`);
    }
  }).catch(err => console.error('Initial auto-checkout sweep failed:', err));

  processCheckInReminders(io).catch(err => console.error('Initial check-in reminder sweep failed:', err));

  // Run recurring background interval
  const timer = setInterval(() => {
    processAutoCheckouts().catch(err => console.error('Interval auto-checkout error:', err));
    processCheckInReminders().catch(err => console.error('Interval check-in reminder error:', err));
  }, intervalMs);

  return timer;
};
