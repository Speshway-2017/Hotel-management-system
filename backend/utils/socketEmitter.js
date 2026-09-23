/**
 * Socket.io Real-Time Event Scoper & Broadcaster
 * Handles real-time synchronization across Admin, Manager, and Receptionist dashboards
 * with propertyId-based room isolation and global event propagation.
 */

export const emitRealtimeSync = (io, propertyId, eventName, payload = {}) => {
  if (!io) return;

  const targetPropId = propertyId || payload.propertyId || null;
  const enrichedPayload = {
    ...payload,
    propertyId: targetPropId,
    timestamp: Date.now()
  };

  // 1. Emit to specific property room if propertyId is provided
  if (targetPropId) {
    const cleanProp = String(targetPropId).replace(/^property_/, '');
    io.to(`property_${cleanProp}`).emit(eventName, enrichedPayload);
  }

  // 2. Also emit to super-admin global room and broadcast channel
  io.to('property_all').emit(eventName, enrichedPayload);
  io.emit(eventName, enrichedPayload);
};

export const broadcastCheckinCheckout = (io, propertyId, { action, booking, roomNumber, status }) => {
  if (!io) return;

  const resolvedRoomNum = roomNumber || booking?.roomNumber || (booking?.room ? String(booking.room).match(/\b\d{3,4}\b/)?.[0] : null);
  const targetPropId = propertyId || booking?.propertyId || 'HS-9HQ8P';

  const data = {
    action, // 'checkin' | 'checkout' | 'room_assigned' | 'status_change' | 'payment' | 'walkin'
    status: status || booking?.status,
    bookingId: booking?._id || booking?.id || booking?.bookingId,
    booking,
    roomNumber: resolvedRoomNum,
    guest: booking?.guest || booking?.guestName || booking?.name,
    propertyId: targetPropId,
    timestamp: Date.now()
  };

  // Determine operational room status
  let computedRoomStatus = status;
  if (action === 'checkin' || status === 'Checked-in') {
    computedRoomStatus = 'Occupied';
  } else if (action === 'checkout' || status === 'Checked-out' || status === 'Cancelled' || status === 'No-show') {
    computedRoomStatus = 'Available';
  } else if (status === 'Confirmed' || status === 'Pending') {
    computedRoomStatus = 'Reserved';
  }

  // Broadcast standard events across all dashboard subscribers
  emitRealtimeSync(io, targetPropId, 'booking_updated', data);
  emitRealtimeSync(io, targetPropId, 'guest_updated', data);
  
  if (resolvedRoomNum) {
    emitRealtimeSync(io, targetPropId, 'room_status_changed', {
      propertyId: targetPropId,
      roomNumber: resolvedRoomNum,
      status: computedRoomStatus
    });
    emitRealtimeSync(io, targetPropId, 'availability_changed', { propertyId: targetPropId, roomNumber: resolvedRoomNum });
  }

  emitRealtimeSync(io, targetPropId, 'dashboard_sync', { propertyId: targetPropId, action, timestamp: Date.now() });

  if (action === 'checkin' || status === 'Checked-in') {
    emitRealtimeSync(io, targetPropId, 'checkin_completed', data);
  } else if (action === 'checkout' || status === 'Checked-out') {
    emitRealtimeSync(io, targetPropId, 'checkout_completed', data);
  }
};

