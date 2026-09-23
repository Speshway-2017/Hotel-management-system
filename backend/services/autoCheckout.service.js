import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';
import Property from '../models/property.model.js';
import { syncRoomStatus, extractRoomNumber } from '../utils/roomHelper.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from '../utils/socketEmitter.js';
import { notifyBookingEvent } from '../utils/notification.helper.js';
import { isCheckOutDue, formatISTDateTime } from '../utils/dateUtils.js';

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

      if (isCheckOutDue(bookingData, now)) {
        const bId = bookingData._id || bookingData.id || bookingData.bookingId;
        const roomNum = extractRoomNumber(bookingData);
        const propId = bookingData.propertyId || 'HS-9HQ8P';

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
            await syncRoomStatus(roomNum, 'Available', propId, io);
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

    isRunning = false;
    return { processed: checkedOutList.length, checkedOut: checkedOutList };
  } catch (error) {
    console.error('❌ Auto-checkout processing error:', error);
    isRunning = false;
    return { error: error.message, processed: 0 };
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

  // Run recurring background interval
  const timer = setInterval(() => {
    processAutoCheckouts().catch(err => console.error('Interval auto-checkout error:', err));
  }, intervalMs);

  return timer;
};
