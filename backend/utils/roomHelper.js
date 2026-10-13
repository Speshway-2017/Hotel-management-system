import { Room } from '../models/managerData.model.js';
import Booking from '../models/booking.model.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from './socketEmitter.js';
import { parseDateSafe } from './dateUtils.js';

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
    if (val.assignedRoom && String(val.assignedRoom).trim()) {
      const parsed = extractRoomNumber(String(val.assignedRoom));
      if (parsed) return parsed;
    }
    if (val.roomType && String(val.roomType).trim()) {
      const parsed = extractRoomNumber(String(val.roomType));
      if (parsed) return parsed;
    }
    if (val.category && String(val.category).trim()) {
      const parsed = extractRoomNumber(String(val.category));
      if (parsed) return parsed;
    }
    if (val.roomId && typeof val.roomId === 'string' && /^\d{1,4}$/.test(val.roomId.trim())) {
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

  // 2. Standard 3-4 digit hotel room number with word boundary: 101, 201, 301, 501, 101 AC
  const match34 = str.match(/\b\d{3,4}\b/);
  if (match34) return match34[0];

  // 3. Standalone 1-2 digit room number at the start: "6 · Deluxe", "6"
  const standaloneMatch = str.match(/^(\d{1,4})(?:\s*·|\s+|$)/);
  if (standaloneMatch) return standaloneMatch[1];

  return null;
};

/**
 * Normalizes date to UTC midnight timestamp (milliseconds) for reliable calendar day comparisons
 */
export const parseDateToDayUtc = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && val > 10000000000) {
    const d = new Date(val);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const d = parseDateSafe(val);
  if (!d || isNaN(d.getTime())) return null;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * Checks if a booking's status should block room inventory
 */
export const isBookingStatusActive = (status) => {
  if (!status) return true;
  const s = String(status).trim().toLowerCase();
  const inactiveStatuses = ['cancelled', 'canceled', 'checked-out', 'checked out', 'checkout', 'completed', 'no-show', 'no show', 'void', 'inactive', 'failed'];
  return !inactiveStatuses.includes(s);
};

/**
 * Robustly extracts the room variant ('AC' or 'Non-AC') from a room or booking object/string.
 */
export const extractRoomVariant = (val) => {
  if (!val) return null;
  if (typeof val === 'object') {
    if (val.roomVariant && typeof val.roomVariant === 'string' && val.roomVariant.trim()) {
      const v = val.roomVariant.trim().toLowerCase();
      if (v.includes('non')) return 'Non-AC';
      if (v.includes('ac')) return 'AC';
    }
    if (val.climateType && typeof val.climateType === 'string' && val.climateType.trim()) {
      const v = val.climateType.trim().toLowerCase();
      if (v.includes('non')) return 'Non-AC';
      if (v.includes('ac')) return 'AC';
    }
    if (val.type && typeof val.type === 'string' && val.type.trim()) {
      const v = val.type.trim().toLowerCase();
      if (v.includes('non')) return 'Non-AC';
      if (v.includes('ac')) return 'AC';
    }

    // Check string fields inside the object (e.g. room, roomType, category, name)
    const strCandidate = [val.room, val.roomType, val.category, val.name, val.assignedRoom].filter(Boolean).join(' ');
    if (strCandidate) {
      const res = extractRoomVariant(strCandidate);
      if (res) return res;
    }

    // Check amenities array if present
    if (Array.isArray(val.amenities)) {
      const hasFan = val.amenities.some(a => String(a).toLowerCase().includes('fan'));
      const hasAc = val.amenities.some(a => String(a).toLowerCase().includes('air condition') || String(a).toLowerCase().includes('split ac'));
      if (hasFan && !hasAc) return 'Non-AC';
      if (hasAc) return 'AC';
    }
    return null;
  }

  const str = String(val).trim().toLowerCase();
  if (str.includes('non-ac') || str.includes('non ac') || str.includes('nonac')) {
    return 'Non-AC';
  }
  if (
    !str.includes('non') &&
    (/\bac\b/i.test(str) ||
     str.includes('(ac)') ||
     str.includes(' ac') ||
     str.includes('air condition') ||
     str.includes('air-condition'))
  ) {
    return 'AC';
  }
  return null;
};

/**
 * Matches a booking to a physical Room model object via ObjectId, roomNumber, or text,
 * strictly respecting climate variant (AC vs Non-AC).
 */
export const isBookingMatchingRoom = (booking, room) => {
  if (!booking || !room) return false;

  const rmId = room._id ? String(room._id) : (room.id ? String(room.id) : null);
  const bRoomId = booking.roomId ? String(booking.roomId) : null;

  // 1. Exact ObjectId match
  if (rmId && bRoomId && rmId === bRoomId) {
    return true;
  }
  // If both have 24-character ObjectIds and they differ, they represent different physical rooms
  if (rmId && bRoomId && /^[0-9a-fA-F]{24}$/.test(rmId) && /^[0-9a-fA-F]{24}$/.test(bRoomId) && rmId !== bRoomId) {
    return false;
  }

  // 2. Room number match
  const rmNum = extractRoomNumber(room.roomNumber || room.room || room.num || room);
  if (!rmNum) return false;

  const bNum = extractRoomNumber(booking.roomNumber) ||
               extractRoomNumber(booking.room) ||
               extractRoomNumber(booking.num) ||
               extractRoomNumber(booking.roomType) ||
               extractRoomNumber(booking.category) ||
               extractRoomNumber(booking.assignedRoom) ||
               extractRoomNumber(booking.roomId) ||
               extractRoomNumber(booking);

  let numMatches = false;
  if (bNum && String(bNum).trim() === String(rmNum).trim()) {
    numMatches = true;
  } else {
    // 3. Text search match for room number in booking strings
    const testStrings = [booking.room, booking.roomNumber, booking.roomType, booking.category, booking.assignedRoom, booking.name].filter(Boolean);
    for (const s of testStrings) {
      if (typeof s === 'string') {
        const regex = new RegExp(`\\b${rmNum}\\b`);
        if (regex.test(s)) {
          numMatches = true;
          break;
        }
      }
    }
  }

  if (!numMatches) return false;

  // 4. Variant match (AC vs Non-AC)
  // An AC booking must NEVER occupy or block a Non-AC room, and vice versa!
  const roomVariant = extractRoomVariant(room);
  const bookingVariant = extractRoomVariant(booking);

  if (roomVariant && bookingVariant && roomVariant !== bookingVariant) {
    return false;
  }

  return true;
};

/**
 * Mathematically checks if requested stay [reqIn, reqOut] overlaps an existing booking [bIn, bOut]
 * Formula: reqIn < bOut AND reqOut > bIn
 */
export const isStayDateOverlapping = (reqIn, reqOut, bIn, bOut) => {
  const reqInMs = typeof reqIn === 'number' && reqIn > 10000000000 ? reqIn : parseDateToDayUtc(reqIn);
  const reqOutMs = typeof reqOut === 'number' && reqOut > 10000000000 ? reqOut : parseDateToDayUtc(reqOut);
  const bInMs = typeof bIn === 'number' && bIn > 10000000000 ? bIn : parseDateToDayUtc(bIn);
  const bOutMs = typeof bOut === 'number' && bOut > 10000000000 ? bOut : parseDateToDayUtc(bOut);

  if (reqInMs === null || reqOutMs === null || bInMs === null || bOutMs === null) {
    return false;
  }

  return (reqInMs < bOutMs && reqOutMs > bInMs);
};

/**
 * Centralized, bulletproof evaluator for room availability over a date range.
 * Evaluates active overlapping bookings, active check-ins, and computes accurate displayStatus and isAvailable flags.
 */
export const evaluateRoomAvailabilityForDates = (room, activeBookings = [], checkIn = null, checkOut = null) => {
  const roomBookings = (activeBookings || []).filter(b => isBookingMatchingRoom(b, room));

  const bookedRanges = roomBookings.map(b => ({
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
    guest: b.guest || b.guestName || '',
    bookingId: b.bookingId || b.id || b._id,
    roomVariant: b.roomVariant || extractRoomVariant(b) || extractRoomVariant(room) || 'AC'
  }));

  const reqInDay = parseDateToDayUtc(checkIn);
  const reqOutDay = parseDateToDayUtc(checkOut);

  let activeCheckIn = null;
  let reservedBooking = null;

  if (reqInDay !== null && reqOutDay !== null) {
    for (const b of roomBookings) {
      if (isStayDateOverlapping(reqInDay, reqOutDay, b.checkIn, b.checkOut)) {
        const bStatus = String(b.status || '').toLowerCase().trim();
        if (bStatus.includes('checked-in') || bStatus.includes('checked in') || bStatus.includes('stay') || bStatus.includes('in-house') || bStatus.includes('occup')) {
          activeCheckIn = b;
          break;
        } else {
          if (!reservedBooking) reservedBooking = b;
        }
      }
    }
  } else {
    // When no dates are specified, check if the room currently has an in-house checked-in guest today
    const todayUtc = parseDateToDayUtc(new Date());
    for (const b of roomBookings) {
      const bStatus = String(b.status || '').toLowerCase().trim();
      if (bStatus.includes('checked-in') || bStatus.includes('checked in') || bStatus.includes('stay') || bStatus.includes('in-house') || bStatus.includes('occup')) {
        const bIn = parseDateToDayUtc(b.checkIn);
        const bOut = parseDateToDayUtc(b.checkOut);
        if (bIn !== null && bOut !== null && todayUtc !== null) {
          if (todayUtc >= bIn && todayUtc < bOut) {
            activeCheckIn = b;
            break;
          }
        } else {
          activeCheckIn = b;
          break;
        }
      }
    }
  }

  const isBlocked = ['blocked', 'maintenance', 'out of order'].includes(String(room.status || '').toLowerCase().trim());
  const isRoomStatusOccupied = (String(room.status || '').toLowerCase().trim() === 'occupied' || Boolean(activeCheckIn));
  
  let displayStatus = 'Available';
  let isAvailable = true;
  let isReserved = false;

  if (isBlocked) {
    displayStatus = room.status || 'Blocked';
    isAvailable = false;
    isReserved = false;
  } else if (activeCheckIn || (reqInDay === null && reqOutDay === null && isRoomStatusOccupied)) {
    displayStatus = 'Occupied';
    isAvailable = false;
    isReserved = false;
  } else if (reservedBooking) {
    displayStatus = 'Reserved';
    isAvailable = false;
    isReserved = true;
  } else {
    // When dates have no overlapping bookings:
    displayStatus = 'Available';
    isAvailable = true;
    isReserved = false;
  }

  const matchedBooking = activeCheckIn || reservedBooking || (roomBookings.length > 0 ? roomBookings[0] : null);

  return {
    displayStatus,
    isAvailable,
    isReserved,
    activeCheckIn,
    reservedBooking,
    matchedBooking,
    bookedRanges
  };
};

/**
 * Synchronizes room status in MongoDB for a given room number and property.
 * Automatically handles propertyId fallback queries and variant differentiation (AC vs Non-AC).
 */
export const syncRoomStatus = async (roomNumber, newStatus, propertyId, io = null, roomVariant = null) => {
  const cleanRoomNum = extractRoomNumber(roomNumber);
  if (!cleanRoomNum) return null;

  const validStatuses = ['Available', 'Occupied', 'Reserved', 'Dirty', 'Cleaning', 'Maintenance', 'Out of Order', 'Blocked'];
  const targetStatus = validStatuses.includes(newStatus) ? newStatus : 'Available';

  const variant = roomVariant ? extractRoomVariant(roomVariant) : extractRoomVariant(roomNumber);

  const query = {
    roomNumber: cleanRoomNum
  };
  if (propertyId) {
    query.$or = [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }];
  }
  if (variant) {
    query.type = variant;
  }

  await Room.updateMany(
    query,
    { status: targetStatus }
  );

  let updatedRoom = await Room.findOne(query);

  if (!updatedRoom) {
    const fallbackQuery = { roomNumber: cleanRoomNum };
    if (variant) fallbackQuery.type = variant;
    await Room.updateMany(
      fallbackQuery,
      { status: targetStatus }
    );
    updatedRoom = await Room.findOne(fallbackQuery);
  }

  if (io && propertyId) {
    emitRealtimeSync(io, propertyId, 'room_status_changed', {
      propertyId,
      roomNumber: cleanRoomNum,
      status: targetStatus,
      roomVariant: variant
    });
    emitRealtimeSync(io, propertyId, 'availability_changed', {
      propertyId,
      roomNumber: cleanRoomNum,
      status: targetStatus,
      roomVariant: variant
    });
    emitRealtimeSync(io, propertyId, 'dashboard_sync', {
      propertyId,
      action: 'room_status_changed',
      roomNumber: cleanRoomNum,
      status: targetStatus,
      roomVariant: variant
    });
  }

  return updatedRoom;
};

/**
 * Reconciles and synchronizes physical room statuses in MongoDB against live active bookings.
 * Ensures that if a booking is only for AC, the Non-AC variant document in MongoDB is NOT falsely marked Occupied.
 */
export const reconcileRoomStatuses = async (propertyId = null) => {
  try {
    const propQuery = propertyId ? { $or: [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }] } : {};
    const [rooms, bookings] = await Promise.all([
      Room.find(propQuery),
      Booking.find(propQuery)
    ]);
    const activeBookings = bookings.filter(b => isBookingStatusActive(b.status));

    const todayUtc = parseDateToDayUtc(new Date());

    for (const rm of rooms) {
      if (['Blocked', 'Maintenance', 'Out of Order'].includes(rm.status)) {
        continue;
      }

      // Check if there is an active check-in specifically matching this room and variant
      const matchingActiveBookings = activeBookings.filter(b => isBookingMatchingRoom(b, rm));
      let hasLiveCheckIn = false;

      for (const b of matchingActiveBookings) {
        const bIn = parseDateToDayUtc(b.checkIn);
        const bOut = parseDateToDayUtc(b.checkOut);
        const isStayingNow = (bIn !== null && bOut !== null && todayUtc !== null && todayUtc >= bIn && todayUtc < bOut);
        const bStatus = String(b.status || '').toLowerCase().trim();
        if ((isStayingNow && ['checked-in', 'checked in', 'staying', 'occupied'].includes(bStatus)) || bStatus === 'checked-in') {
          hasLiveCheckIn = true;
          break;
        }
      }

      const correctStatus = hasLiveCheckIn ? 'Occupied' : 'Available';
      if (rm.status !== correctStatus) {
        rm.status = correctStatus;
        await rm.save();
      }
    }
  } catch (err) {
    console.error('Error reconciling room statuses:', err.message);
  }
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
