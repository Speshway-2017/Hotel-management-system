import { redactSensitiveData } from './logger.js';

/**
 * Socket.io Real-Time Event Scoper & Broadcaster
 * Handles real-time synchronization across Admin, Manager, and Receptionist dashboards
 * with strict propertyId-based room isolation and PII redaction.
 */

export const emitRealtimeSync = (io, propertyId, eventName, payload = {}) => {
  if (!io) return;

  const targetPropId = propertyId || payload.propertyId || null;
  const safePayload = redactSensitiveData({
    ...payload,
    propertyId: targetPropId,
    timestamp: Date.now()
  });

  // 1. Emit to specific property room if propertyId is provided and not 'all'/'global'
  if (targetPropId && targetPropId !== 'all' && targetPropId !== 'global') {
    const cleanProp = String(targetPropId).replace(/^property_/, '');
    io.to(`property_${cleanProp}`).emit(eventName, safePayload);
  }

  // 2. Emit to super-admin global room (authorized super-admins only)
  io.to('property_all').emit(eventName, safePayload);

  // 3. If a guest userId is targeted, emit to their personal authenticated room
  const targetUserId = payload?.userId || payload?.guestId;
  if (targetUserId) {
    io.to(`user_${String(targetUserId)}`).emit(eventName, safePayload);
  }
};

export const broadcastCheckinCheckout = (io, propertyId, { action, booking, roomNumber, status }) => {
  if (!io) return;

  const resolvedRoomNum = roomNumber || booking?.roomNumber || (booking?.room ? String(booking.room).match(/\b\d{3,4}\b/)?.[0] : null);
  const targetPropId = propertyId || booking?.propertyId || 'HS-9HQ8P';

  const data = {
    action,
    status: status || booking?.status,
    bookingId: booking?._id || booking?.id || booking?.bookingId,
    guestId: booking?.guestId,
    booking: redactSensitiveData(booking),
    roomNumber: resolvedRoomNum,
    guest: booking?.guest || booking?.guestName || booking?.name,
    propertyId: targetPropId,
    timestamp: Date.now()
  };

  let computedRoomStatus = status;
  if (action === 'checkin' || status === 'Checked-in') {
    computedRoomStatus = 'Occupied';
  } else if (action === 'checkout' || status === 'Checked-out' || status === 'Cancelled' || status === 'No-show') {
    computedRoomStatus = 'Available';
  } else if (status === 'Confirmed' || status === 'Pending') {
    computedRoomStatus = 'Reserved';
  }

  emitRealtimeSync(io, targetPropId, 'booking_updated', data);
  emitRealtimeSync(io, targetPropId, 'guest_updated', data);

  if (resolvedRoomNum) {
    emitRealtimeSync(io, targetPropId, 'room_status_changed', {
      propertyId: targetPropId,
      roomNumber: resolvedRoomNum,
      status: computedRoomStatus
    });
    io.emit('availability_changed', { propertyId: targetPropId, roomNumber: resolvedRoomNum, timestamp: Date.now() });
  }

  emitRealtimeSync(io, targetPropId, 'dashboard_sync', { propertyId: targetPropId, action, timestamp: Date.now() });

  if (action === 'checkin' || status === 'Checked-in') {
    emitRealtimeSync(io, targetPropId, 'checkin_completed', data);
  } else if (action === 'checkout' || status === 'Checked-out') {
    emitRealtimeSync(io, targetPropId, 'checkout_completed', data);
  }
};
