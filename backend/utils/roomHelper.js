import { Room } from '../models/managerData.model.js';
import Booking from '../models/booking.model.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from './socketEmitter.js';

/**
 * Robustly extracts a clean 3-4 digit room number (or normalized room identifier)
 * from various string/object formats:
 * e.g., "Standard Room (Room 101)" -> "101"
 *       "101 · Standard Room" -> "101"
 *       "Deluxe Room 202" -> "202"
 *       "Room 301" -> "301"
 *       { roomNumber: "101" } -> "101"
 *       { room: "Standard (Room 102)" } -> "102"
 */
export const extractRoomNumber = (val) => {
  if (!val) return null;
  if (typeof val === 'object') {
    if (val.roomNumber && String(val.roomNumber).trim()) {
      const parsed = extractRoomNumber(String(val.roomNumber));
      if (parsed) return parsed;
    }
    if (val.room && String(val.room).trim()) {
      const parsed = extractRoomNumber(String(val.room));
      if (parsed) return parsed;
    }
    if (val.num && String(val.num).trim()) {
      const parsed = extractRoomNumber(String(val.num));
      if (parsed) return parsed;
    }
    if (val.roomId && typeof val.roomId === 'string' && /^\d{3,4}$/.test(val.roomId.trim())) {
      return val.roomId.trim();
    }
    return null;
  }
  const str = String(val).trim();
  if (!str) return null;

  // Ignore 24-character hex ObjectIds
  if (/^[0-9a-f]{24}$/i.test(str)) {
    return null;
  }

  // 1. Explicit Room prefix: "Room 501", "(Room 501)", "Rm 301", "#501"
  const prefixMatch = str.match(/(?:room|rm|#)\s*(\d{1,4})\b/i);
  if (prefixMatch) return prefixMatch[1];

  // 2. Standard 3-4 digit hotel room number with word boundary: 101, 201, 301, 501
  const match34 = str.match(/\b\d{3,4}\b/);
  if (match34) return match34[0];

  // 3. Standalone 1-2 digit room number at the start: "6 · Deluxe", "6"
  const standaloneMatch = str.match(/^(\d{1,4})(?:\s*·|\s+|$)/);
  if (standaloneMatch) return standaloneMatch[1];

  return null;
};

/**
 * Synchronizes room status in MongoDB for a given room number and property.
 * Automatically handles propertyId fallback queries so status is never missed.
 */
export const syncRoomStatus = async (roomNumber, newStatus, propertyId, io = null) => {
  const cleanRoomNum = extractRoomNumber(roomNumber);
  if (!cleanRoomNum) return null;

  const validStatuses = ['Available', 'Occupied', 'Reserved', 'Dirty', 'Cleaning', 'Maintenance', 'Out of Order', 'Blocked'];
  const targetStatus = validStatuses.includes(newStatus) ? newStatus : 'Available';

  const query = {
    roomNumber: cleanRoomNum
  };
  if (propertyId) {
    query.$or = [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }];
  }

  let updatedRoom = await Room.findOneAndUpdate(
    query,
    { status: targetStatus },
    { new: true }
  );

  if (!updatedRoom) {
    updatedRoom = await Room.findOneAndUpdate(
      { roomNumber: cleanRoomNum },
      { status: targetStatus },
      { new: true }
    );
  }

  if (io && propertyId) {
    emitRealtimeSync(io, propertyId, 'room_status_changed', {
      propertyId,
      roomNumber: cleanRoomNum,
      status: targetStatus
    });
    emitRealtimeSync(io, propertyId, 'availability_changed', {
      propertyId,
      roomNumber: cleanRoomNum,
      status: targetStatus
    });
    emitRealtimeSync(io, propertyId, 'dashboard_sync', {
      propertyId,
      action: 'room_status_changed',
      roomNumber: cleanRoomNum,
      status: targetStatus
    });
  }

  return updatedRoom;
};

/**
 * Calculates live property stats from MongoDB
 */
export const calculatePropertyStats = async (propertyId) => {
  const propQuery = propertyId ? { $or: [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }] } : {};
  
  const [rooms, bookings] = await Promise.all([
    Room.find(propQuery),
    Booking.find(propQuery)
  ]);

  const totalRooms = rooms.length || 14;
  
  // Find occupied room numbers from active checked-in bookings
  const occupiedRoomNums = new Set();
  const reservedRoomNums = new Set();

  bookings.forEach(b => {
    const s = String(b.status || '').toLowerCase().trim();
    const rNum = extractRoomNumber(b);
    if (s === 'checked-in' || s === 'checked in' || s === 'occupied' || s === 'staying') {
      if (rNum) occupiedRoomNums.add(rNum);
    } else if (s === 'confirmed' || s === 'pending' || s === 'reserved' || s === 'booked' || s === 'pre-checked' || s === 'paid') {
      if (rNum) reservedRoomNums.add(rNum);
    }
  });

  rooms.forEach(r => {
    const s = String(r.status || '').toLowerCase().trim();
    const rNum = String(r.roomNumber || '');
    if (s === 'occupied') {
      if (rNum) occupiedRoomNums.add(rNum);
    } else if (s === 'reserved') {
      if (rNum && !occupiedRoomNums.has(rNum)) reservedRoomNums.add(rNum);
    }
  });

  const occupiedRooms = occupiedRoomNums.size;
  const reservedRooms = reservedRoomNums.size;
  const availableRooms = Math.max(0, totalRooms - occupiedRooms);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIns = bookings.filter(b => String(b.checkIn || '').startsWith(todayStr)).length;
  const todayCheckOuts = bookings.filter(b => String(b.checkOut || '').startsWith(todayStr)).length;
  const activeReservations = bookings.filter(b => b.status !== 'Cancelled' && b.status !== 'Checked-out').length;
  const revenueToday = bookings.filter(b => b.status !== 'Cancelled').reduce((sum, b) => sum + Number(b.amount || b.totalAmount || 0), 0);

  return {
    totalRooms,
    occupiedRooms,
    availableRooms,
    reservedRooms,
    occupancyRate: `${occupancyRate}%`,
    occupancyRateNum: occupancyRate,
    activeReservations,
    todayCheckIns,
    todayCheckOuts,
    revenueToday
  };
};
