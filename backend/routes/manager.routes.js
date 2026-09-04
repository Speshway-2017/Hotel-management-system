import express from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import Property from '../models/property.model.js';
import {
  Room,
  Shift,
  Attendance,
  Approval,
  Feedback,
  ManagerNotification,
  Payment
} from '../models/managerData.model.js';
import { triggerNotification, notifyFeedbackEvent } from '../utils/notification.helper.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from '../utils/socketEmitter.js';
import { findPropertySafely, invalidatePropertyCache } from '../utils/propertyCache.js';
import { getUnifiedFeedbacksAndReviews } from '../utils/unifiedFeedback.helper.js';

const router = express.Router();

// All manager routes are protected and restricted to manager role
router.use(protect);
router.use(authorize('manager', 'admin', 'super-admin', 'receptionist'));

// Helper to seed default rooms for a property if empty
const seedDefaultRooms = async (propertyId) => {
  const count = await Room.countDocuments({ propertyId });
  if (count === 0) {
    const defaultRooms = [
      { roomNumber: '101', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '102', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '103', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '201', category: 'Deluxe Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '202', category: 'Deluxe Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '203', category: 'Deluxe Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '301', category: 'Executive Suite', status: 'Available', ratePlan: 'Standard Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '302', category: 'Executive Suite', status: 'Available', ratePlan: 'Standard Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '303', category: 'Executive Suite', status: 'Available', ratePlan: 'Standard Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '401', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId },
      { roomNumber: '402', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId },
      { roomNumber: '403', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId },
      { roomNumber: '501', category: 'Penthouse Suite', status: 'Available', ratePlan: 'Penthouse Plan', baseRate: 5500, currentRate: 5500, dailyRate: 5500, floor: 'Floor 5', capacity: '2 Adults', bedType: 'King Bed', propertyId },
      { roomNumber: '502', category: 'Penthouse Suite', status: 'Available', ratePlan: 'Penthouse Plan', baseRate: 5500, currentRate: 5500, dailyRate: 5500, floor: 'Floor 5', capacity: '2 Adults', bedType: 'King Bed', propertyId }
    ];
    await Room.insertMany(defaultRooms);
  }
};

// Helper to seed default shifts if empty
const seedDefaultShifts = async (propertyId, staffMembers) => {
  const count = await Shift.countDocuments({ propertyId });
  if (count === 0 && staffMembers.length > 0) {
    const defaultShifts = staffMembers.map((s, idx) => ({
      userId: s._id || s.id,
      username: s.name,
      shiftType: idx % 3 === 0 ? 'Morning' : idx % 3 === 1 ? 'Evening' : 'Night',
      propertyId
    }));
    await Shift.insertMany(defaultShifts);
  }
};

// Helper to seed default attendance logs if empty
const seedDefaultAttendance = async (propertyId, staffMembers) => {
  const count = await Attendance.countDocuments({ propertyId });
  if (count === 0 && staffMembers.length > 0) {
    const defaultAttendance = [];
    const dates = ["2026-08-22", "2026-08-23", "2026-08-24"];
    
    dates.forEach(date => {
      staffMembers.forEach((s, idx) => {
        defaultAttendance.push({
          userId: s._id || s.id,
          username: s.name,
          date,
          checkIn: idx % 3 === 0 ? "06:00" : idx % 3 === 1 ? "14:00" : "22:00",
          checkOut: idx % 3 === 0 ? "14:00" : idx % 3 === 1 ? "22:00" : "06:00",
          workingHours: 8,
          status: idx % 4 === 3 ? 'Absent' : 'Present',
          propertyId
        });
      });
    });
    await Attendance.insertMany(defaultAttendance);
  }
};

// Helper to seed default approvals if empty
const seedDefaultApprovals = async (propertyId) => {
  const count = await Approval.countDocuments({ propertyId });
  if (count === 0) {
    const defaults = [
      {
        category: "Discount",
        requestedBy: "receptionist@hourstay.com",
        amount: 2500,
        reason: "Repeat corporate guest requested corporate tariff override.",
        status: "Pending",
        propertyId
      },
      {
        category: "Refund",
        requestedBy: "receptionist@hourstay.com",
        amount: 4900,
        reason: "AC malfunctioning in Room 302. Guest checked out early.",
        status: "Pending",
        propertyId
      },
      {
        category: "Upgrade",
        requestedBy: "receptionist@hourstay.com",
        amount: 0,
        reason: "Standard Room overbooked. Complimentary Deluxe upgrade proposal.",
        status: "Approved",
        propertyId,
        decisionReason: "Standard overbooking resolved.",
        decidedBy: "Vikram Rathore",
        decidedAt: new Date()
      }
    ];
    await Approval.insertMany(defaults);
  }
};

// Helper to seed default notifications if empty
const seedDefaultNotifications = async (propertyId) => {
  const count = await ManagerNotification.countDocuments({ propertyId });
  if (count === 0) {
    const defaults = [
      {
        title: "Refund Request Pending",
        message: "Front Desk submitted a refund request of ₹4,900 for Approval.",
        category: "Approvals",
        isRead: false,
        propertyId
      },
      {
        title: "Guest Feedback Submitted",
        message: "Surya submitted a 5-star review for cleanliness and services.",
        category: "Guest Experience",
        isRead: false,
        propertyId
      }
    ];
    await ManagerNotification.insertMany(defaults);
  }
};

// ==========================================
// 1. PROPERTY DETAILS
// ==========================================
router.get('/property', async (req, res) => {
  try {
    const property = await findPropertySafely(req.user?.propertyId, req.user);
    if (!property) {
      return sendError(res, 404, 'Assigned property profile not found.');
    }
    return sendSuccess(res, 200, property, 'Assigned property profile retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 2. RESERVATIONS
// ==========================================
router.get('/reservations', async (req, res) => {
  try {
    const propId = req.user?.propertyId;
    let query = {};
    if (req.user?.role !== 'super-admin' && propId) {
      query = { $or: [{ propertyId: propId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }] };
    }
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, 200, bookings, 'Property reservations retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.get('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }
    const booking = await Booking.findOne({ $or: query });
    if (!booking) return sendError(res, 404, 'Reservation not found');
    return sendSuccess(res, 200, booking, 'Reservation retrieved successfully');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/reservations', async (req, res) => {
  try {
    const propId = req.user?.propertyId || 'HS-JAI';
    const bookingId = req.body.bookingId || req.body.id || `BK-${Date.now().toString().slice(-5)}`;
    
    let roomNum = req.body.roomNumber || req.body.room || '';
    if (typeof roomNum === 'string' && roomNum.includes('·')) {
      roomNum = roomNum.split('·')[0].trim();
    }
    if (typeof roomNum === 'string' && roomNum.toLowerCase().includes('room')) {
      roomNum = roomNum.replace(/room/i, '').trim();
    }

    let guestId = req.body.guestId || null;
    const cleanEmail = String(req.body.email || '').trim().toLowerCase();
    const cleanPhone = String(req.body.phone || '').trim();

    if (!guestId && (cleanEmail || cleanPhone)) {
      const query = [];
      if (cleanEmail) query.push({ email: cleanEmail });
      if (cleanPhone) query.push({ mobile: cleanPhone });
      const existingGuest = await User.findOne({ $or: query, role: 'guest' });
      if (existingGuest) {
        guestId = existingGuest._id || existingGuest.id;
      }
    }

    const payload = {
      ...req.body,
      bookingId,
      guestId,
      id: bookingId,
      propertyId: propId,
      email: cleanEmail,
      phone: cleanPhone,
      room: req.body.room || (roomNum ? `${roomNum} · ${req.body.roomType || 'Standard Room'}` : ''),
      roomNumber: roomNum,
      roomType: req.body.roomType || 'Standard Room',
      status: req.body.status || (req.body.source === 'Walk-in' ? 'Checked-in' : 'Confirmed'),
      paymentStatus: req.body.paymentStatus || (req.body.balance === 0 ? 'Paid' : 'Pending')
    };

    const newBooking = await Booking.create(payload);

    // If room is assigned and checked-in, update room status
    if (roomNum) {
      const rmStatus = payload.status === 'Checked-in' ? 'Occupied' : 'Reserved';
      await Room.findOneAndUpdate(
        { roomNumber: roomNum, propertyId: propId },
        { status: rmStatus }
      );
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'booking_created', { booking: newBooking, propertyId: propId });
      emitRealtimeSync(io, propId, 'booking_updated', { type: 'CREATED', booking: newBooking, propertyId: propId });
      if (roomNum) {
        emitRealtimeSync(io, propId, 'room_status_changed', { propertyId: propId, roomNumber: roomNum, status: payload.status === 'Checked-in' ? 'Occupied' : 'Reserved' });
        emitRealtimeSync(io, propId, 'availability_changed', { propertyId: propId, roomNumber: roomNum });
      }
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'booking_created' });
    }

    return sendSuccess(res, 201, newBooking, 'Reservation created successfully');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to create reservation');
  }
});

router.put('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const propId = req.user?.propertyId || 'HS-JAI';
    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    let roomNum = req.body.roomNumber || req.body.room;
    if (typeof roomNum === 'string' && roomNum.includes('·')) {
      roomNum = roomNum.split('·')[0].trim();
    }
    if (typeof roomNum === 'string' && roomNum.toLowerCase().includes('room')) {
      roomNum = roomNum.replace(/room/i, '').trim();
    }

    const updatePayload = { ...req.body };
    if (roomNum) {
      updatePayload.roomNumber = roomNum;
      updatePayload.room = req.body.room || `${roomNum} · ${req.body.roomType || 'Standard Room'}`;
    }

    const updated = await Booking.findOneAndUpdate(
      { $or: query },
      updatePayload,
      { new: true }
    );

    if (!updated) return sendError(res, 404, 'Reservation not found');

    // Update Room table accordingly
    let rmStatus = 'Available';
    if (roomNum) {
      if (updated.status === 'Checked-in') rmStatus = 'Occupied';
      else if (updated.status === 'Confirmed' || updated.status === 'Pending') rmStatus = 'Reserved';
      else if (updated.status === 'Checked-out') rmStatus = 'Available';
      else if (updated.status === 'Cancelled' || updated.status === 'No-show') rmStatus = 'Available';

      await Room.findOneAndUpdate(
        { roomNumber: roomNum, $or: [{ propertyId: propId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }] },
        { status: rmStatus }
      );
    }

    // Realtime broadcast across all dashboards
    const io = req.app.get('socketio');
    if (io) {
      const action = updated.status === 'Checked-in' ? 'checkin' : updated.status === 'Checked-out' ? 'checkout' : 'status_change';
      broadcastCheckinCheckout(io, propId, {
        action,
        booking: updated,
        roomNumber: roomNum,
        status: updated.status
      });
    }

    return sendSuccess(res, 200, updated, 'Reservation updated successfully');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to update reservation');
  }
});

router.post('/reservations/:id/assign-room', async (req, res) => {
  try {
    const { id } = req.params;
    const { roomNumber, roomType } = req.body;
    const propId = req.user?.propertyId || 'HS-JAI';

    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    const updated = await Booking.findOneAndUpdate(
      { $or: query },
      {
        roomNumber: String(roomNumber),
        room: `${roomNumber} · ${roomType || 'Standard Room'}`,
        roomType: roomType || 'Standard Room'
      },
      { new: true }
    );

    if (!updated) return sendError(res, 404, 'Reservation not found');

    const rmStatus = updated.status === 'Checked-in' ? 'Occupied' : 'Reserved';
    await Room.findOneAndUpdate(
      { roomNumber: String(roomNumber), propertyId: propId },
      { status: rmStatus }
    );

    const io = req.app.get('socketio');
    if (io) {
      broadcastCheckinCheckout(io, propId, {
        action: 'room_assigned',
        booking: updated,
        roomNumber: String(roomNumber),
        status: rmStatus
      });
    }

    return sendSuccess(res, 200, updated, `Room ${roomNumber} assigned successfully`);
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to assign room');
  }
});

router.delete('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const propId = req.user?.propertyId || 'HS-JAI';
    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    const deleted = await Booking.findOneAndDelete({ $or: query });
    if (!deleted) return sendError(res, 404, 'Reservation not found');

    if (deleted.roomNumber) {
      await Room.findOneAndUpdate(
        { roomNumber: deleted.roomNumber, propertyId: propId },
        { status: 'Available' }
      );
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'booking_deleted', { id, bookingId: deleted.bookingId, propertyId: propId });
      emitRealtimeSync(io, propId, 'room_status_changed', { propertyId: propId, roomNumber: deleted.roomNumber, status: 'Available' });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'booking_deleted' });
    }

    return sendSuccess(res, 200, deleted, 'Reservation deleted successfully');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to delete reservation');
  }
});

// ==========================================
// 3. ROOMS
// ==========================================
router.get('/rooms', async (req, res) => {
  try {
    await seedDefaultRooms(req.user.propertyId);

    // Convert any 4th floor or Villa Suite rooms to Standard Room in MongoDB
    await Room.updateMany(
      { propertyId: req.user.propertyId, category: "Villa Suite" },
      { $set: { category: "Standard Room", baseRate: 3000, currentRate: 3000, dailyRate: 3000, ratePlan: "Standard Plan" } }
    );

    let rooms = await Room.find({ propertyId: req.user.propertyId }).sort({ roomNumber: 1 });
    const { checkIn, checkOut } = req.query;

    // Fetch active bookings across property and global collections
    const activeBookings = await Booking.find({
      status: { $in: ['Confirmed', 'Paid', 'Pending', 'Checked-in'] }
    });

    const parseTime = (dateStr) => {
      if (!dateStr) return null;
      const t = new Date(dateStr).getTime();
      return isNaN(t) ? null : t;
    };

    const reqIn = parseTime(checkIn);
    const reqOut = parseTime(checkOut);

    // Pass 1: Explicit room number / roomId matching
    const roomBookingMap = new Map();
    const unassignedCategoryBookings = [];

    for (const b of activeBookings) {
      if (b.status === 'Cancelled' || b.status === 'Checked-out' || b.status === 'No-show') continue;

      const bIn = parseTime(b.checkIn);
      const bOut = parseTime(b.checkOut);
      if (reqIn && reqOut && bIn && bOut && !(reqIn < bOut && reqOut > bIn)) {
        continue;
      }

      const bRoomNum = b.roomId || (b.room ? String(b.room).match(/\b\d{3,4}\b/)?.[0] : null);
      let matchedRm = null;

      if (b.roomId) {
        matchedRm = rooms.find(r => String(r._id) === String(b.roomId) || String(r.id) === String(b.roomId));
      }
      if (!matchedRm && bRoomNum) {
        matchedRm = rooms.find(r => String(r.roomNumber).trim() === String(bRoomNum).trim());
      }
      if (!matchedRm && b.room && !b.room.includes("Standard Room") && !b.room.includes("Deluxe Room") && !b.room.includes("Executive Suite") && !b.room.includes("Villa Suite")) {
        matchedRm = rooms.find(r => String(b.room).includes(String(r.roomNumber)));
      }

      if (matchedRm) {
        roomBookingMap.set(String(matchedRm._id), b);
      } else {
        unassignedCategoryBookings.push(b);
      }
    }

    // Pass 2: Category-level matching for bookings without an explicit room number
    for (const b of unassignedCategoryBookings) {
      const targetCategory = b.roomType || b.category || b.room;
      if (!targetCategory) continue;

      const candidate = rooms.find(r => {
        if (roomBookingMap.has(String(r._id))) return false;
        if (r.status === 'Blocked') return false;

        const rCat = String(r.category || '').toLowerCase();
        const bCat = String(targetCategory).toLowerCase();
        return rCat === bCat || bCat.includes(rCat) || rCat.includes(bCat);
      });

      if (candidate) {
        roomBookingMap.set(String(candidate._id), b);
      }
    }

    const mappedRooms = rooms.map(rm => {
      const matchedBooking = roomBookingMap.get(String(rm._id));
      const isReserved = !!matchedBooking;

      let displayStatus = rm.status;
      if (rm.status !== 'Blocked' && matchedBooking) {
        if (matchedBooking.status === 'Checked-in') {
          displayStatus = 'Occupied';
        } else if (['Confirmed', 'Paid', 'Pending'].includes(matchedBooking.status)) {
          displayStatus = 'Reserved';
        }
      }

      return {
        ...rm.toObject(),
        status: displayStatus,
        operationalStatus: rm.status,
        isReserved,
        isAvailable: displayStatus === 'Available',
        guest: matchedBooking ? matchedBooking.guest : ''
      };
    });

    return sendSuccess(res, 200, mappedRooms, 'Property rooms retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/rooms/:roomNumber/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return sendError(res, 400, 'New room status value is required.');
    }
    const updated = await Room.findOneAndUpdate(
      { roomNumber: req.params.roomNumber, propertyId: req.user.propertyId },
      { status },
      { new: true }
    );
    if (!updated) {
      return sendError(res, 404, 'Room not found.');
    }
    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, req.user.propertyId, 'room_status_changed', { propertyId: req.user.propertyId, roomNumber: req.params.roomNumber, status });
      emitRealtimeSync(io, req.user.propertyId, 'availability_changed', { propertyId: req.user.propertyId, roomNumber: req.params.roomNumber });
      emitRealtimeSync(io, req.user.propertyId, 'dashboard_sync', { propertyId: req.user.propertyId, action: 'room_status_changed' });
    }

    return sendSuccess(res, 200, updated, 'Room operational status override updated.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/rooms', async (req, res) => {
  try {
    const { roomNumber, category, status, ratePlan, baseRate, currentRate, dailyRate, floor, capacity, bedType, amenities, description, images } = req.body;
    if (!roomNumber || !category) {
      return sendError(res, 400, 'roomNumber and category are required.');
    }
    const rate = Number(baseRate || currentRate || dailyRate || 3500);
    const newRoom = await Room.create({
      roomNumber,
      category,
      status: status || 'Available',
      ratePlan: ratePlan || 'Standard Plan',
      baseRate: rate,
      currentRate: rate,
      dailyRate: rate,
      floor: floor || 'Floor 1',
      capacity,
      bedType,
      amenities,
      description,
      images: Array.isArray(images) ? images : [],
      propertyId: req.user.propertyId
    });
    return sendSuccess(res, 201, newRoom, 'Room created successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/rooms/:id', async (req, res) => {
  try {
    const { roomNumber, category, status, ratePlan, baseRate, currentRate, dailyRate, floor, capacity, bedType, amenities, description, images } = req.body;
    const rate = Number(baseRate || currentRate || dailyRate);
    const updateData = { roomNumber, category, status };
    if (ratePlan) updateData.ratePlan = ratePlan;
    if (rate && !isNaN(rate) && rate > 0) {
      updateData.baseRate = rate;
      updateData.currentRate = rate;
      updateData.dailyRate = rate;
    }
    if (floor) updateData.floor = floor;
    if (capacity) updateData.capacity = capacity;
    if (bedType) updateData.bedType = bedType;
    if (amenities) updateData.amenities = amenities;
    if (description !== undefined) updateData.description = description;
    if (Array.isArray(images)) updateData.images = images;

    const queryOr = [
      { roomNumber: req.params.id },
      { id: req.params.id }
    ];
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      queryOr.push({ _id: req.params.id });
    }

    let updated = await Room.findOneAndUpdate(
      { propertyId: req.user.propertyId, $or: queryOr },
      updateData,
      { new: true }
    );

    if (!updated) {
      updated = await Room.findOneAndUpdate(
        { $or: queryOr },
        updateData,
        { new: true }
      );
    }

    if (!updated) return sendError(res, 404, 'Room not found.');
    return sendSuccess(res, 200, updated, 'Room updated successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.delete('/rooms/:id', async (req, res) => {
  try {
    const queryOr = [
      { roomNumber: req.params.id },
      { id: req.params.id }
    ];
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      queryOr.push({ _id: req.params.id });
    }

    let deleted = await Room.findOneAndDelete({ propertyId: req.user.propertyId, $or: queryOr });
    if (!deleted) {
      deleted = await Room.findOneAndDelete({ $or: queryOr });
    }
    if (!deleted) return sendError(res, 404, 'Room not found.');
    return sendSuccess(res, 200, deleted, 'Room deleted successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 4. GUESTS CRM
// ==========================================
router.get('/guests', async (req, res) => {
  try {
    const bookings = await Booking.find({ propertyId: req.user.propertyId });
    
    // Compile unique guests lists
    const guestsMap = {};
    bookings.forEach(b => {
      if (!b.guest) return;
      const key = b.guest.trim().toLowerCase();
      if (!guestsMap[key]) {
        guestsMap[key] = {
          id: b._id || b.id,
          name: b.guest,
          phone: b.phone || '--',
          room: b.room || '--',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          paymentStatus: b.balance === 0 ? 'Paid' : 'Pending',
          bookingId: b._id || b.id
        };
      }
    });

    const list = Object.values(guestsMap);
    return sendSuccess(res, 200, list, 'CRM Guest files index compiled.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 5. APPROVALS DESK
// ==========================================
router.get('/approvals', async (req, res) => {
  try {
    await seedDefaultApprovals(req.user.propertyId);
    const list = await Approval.find({ propertyId: req.user.propertyId }).sort({ createdAt: -1 });
    return sendSuccess(res, 200, list, 'Approvals desk requests list retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/approvals/:id', async (req, res) => {
  try {
    const { action, decisionReason } = req.body; // Approved, Rejected
    if (!action || !['Approved', 'Rejected'].includes(action)) {
      return sendError(res, 400, 'Approved or Rejected decision action parameter required.');
    }
    
    const updated = await Approval.findOneAndUpdate(
      { _id: req.params.id, propertyId: req.user.propertyId },
      {
        status: action,
        decisionReason: decisionReason || 'None',
        decidedBy: req.user.name || req.user.email,
        decidedAt: new Date()
      },
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Approval request log file not found.');
    }

    await triggerNotification({
      req,
      role: 'admin',
      propertyId: req.user.propertyId,
      title: `Approval Decision: ${updated.type || 'Request'} ${action}`,
      message: `Request for ${updated.guest || 'Guest'} was ${action} by Manager ${req.user.name || ''}.`,
      category: 'Approvals'
    });

    await triggerNotification({
      req,
      role: 'receptionist',
      propertyId: req.user.propertyId,
      title: `Approval Decision: ${updated.type || 'Request'} ${action}`,
      message: `Request for ${updated.guest || 'Guest'} was ${action} by Manager.`,
      category: 'Approvals'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, req.user.propertyId, 'approval_updated', { approval: updated, propertyId: req.user.propertyId });
      emitRealtimeSync(io, req.user.propertyId, 'dashboard_sync', { propertyId: req.user.propertyId, action: 'approval_updated' });
    }

    return sendSuccess(res, 200, updated, `Approval request decision marked as ${action}.`);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 6. STAFF ROSTER & SHIFTS
// ==========================================
router.get('/staff', async (req, res) => {
  try {
    // Roster staff limits strictly to receptionist users inside manager property
    const staff = await User.find({
      propertyId: req.user.propertyId,
      role: 'receptionist'
    }).select('-password');
    
    return sendSuccess(res, 200, staff, 'Property receptionist personnel profiles retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/staff', async (req, res) => {
  try {
    const { name, email, password, mobile, dept, shift } = req.body;
    if (!name || !email || !password) {
      return sendError(res, 400, 'Name, email, and password are required.');
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return sendError(res, 400, 'User with this email already exists.');
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role: 'receptionist',
      mobile: mobile || '',
      propertyId: req.user.propertyId,
      status: 'Active',
      dept: dept || 'Front Office',
      shift: shift || 'Morning Shift'
    });

    return sendSuccess(res, 201, newUser, 'Receptionist staff personnel created successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const { name, mobile, dept, shift } = req.body;
    const staffMember = await User.findOne({ _id: req.params.id, propertyId: req.user.propertyId, role: 'receptionist' });
    if (!staffMember) {
      return sendError(res, 404, 'Staff member not found.');
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: name || staffMember.name,
        mobile: mobile !== undefined ? mobile : staffMember.mobile,
        dept: dept || staffMember.dept,
        shift: shift || staffMember.shift
      },
      { new: true }
    );

    return sendSuccess(res, 200, updated, 'Staff profile updated successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.get('/shifts', async (req, res) => {
  try {
    const receptionistStaff = await User.find({
      propertyId: req.user.propertyId,
      role: 'receptionist'
    });
    
    await seedDefaultShifts(req.user.propertyId, receptionistStaff);
    const shifts = await Shift.find({ propertyId: req.user.propertyId });
    return sendSuccess(res, 200, shifts, 'Shift schedule allocations retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/shifts/assign', async (req, res) => {
  try {
    const { userId, username, shiftType } = req.body;
    if (!userId || !shiftType) {
      return sendError(res, 400, 'userId and shiftType parameters required.');
    }

    const updated = await Shift.findOneAndUpdate(
      { userId, propertyId: req.user.propertyId },
      { shiftType, username },
      { new: true, upsert: true }
    );

    return sendSuccess(res, 200, updated, 'Staff schedule shift reassigned.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 7. ATTENDANCE MONITOR
// ==========================================
router.get('/attendance', async (req, res) => {
  try {
    const receptionistStaff = await User.find({
      propertyId: req.user.propertyId,
      role: 'receptionist'
    });

    await seedDefaultAttendance(req.user.propertyId, receptionistStaff);
    const list = await Attendance.find({ propertyId: req.user.propertyId }).sort({ date: -1 });
    return sendSuccess(res, 200, list, 'Daily attendance records log index retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 8. GUEST FEEDBACK / REVIEWS
// ==========================================
router.get('/feedback', async (req, res) => {
  try {
    const propId = req.query.propertyId || req.user?.propertyId || 'HS-JAI';
    const query = (propId && propId !== 'all')
      ? { $or: [{ propertyId: propId }, { propertyId: { $exists: false } }, { propertyId: '' }, { propertyId: 'HS-JAI' }] }
      : {};
    const list = await getUnifiedFeedbacksAndReviews(query);
    return sendSuccess(res, 200, list, 'Reviews and guest feedback list retrieved from MongoDB.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const propId = req.body?.propertyId || req.user?.propertyId || 'HS-JAI';
    const {
      bookingId = `BK-${Date.now().toString().slice(-5)}`,
      guestName,
      guestEmail = '',
      guestPhone = '',
      room = '101 · Standard Room',
      roomType = 'Standard Room',
      rating = 5,
      ratings = { cleanliness: 5, service: 5, room: 5, food: 5, overall: 5 },
      category = 'General',
      sentiment = 'Positive',
      status = 'Published',
      comment = '',
      comments = '',
      response = ''
    } = req.body;

    const feedbackText = comment || comments;
    if (!guestName || !feedbackText) {
      return sendError(res, 400, 'Guest name and review comment are required.');
    }

    const created = await Feedback.create({
      bookingId,
      guestName,
      guestEmail,
      guestPhone,
      room,
      roomType,
      rating: Number(rating) || 5,
      ratings,
      category,
      sentiment,
      status,
      comment: feedbackText,
      comments: feedbackText,
      response,
      respondedBy: response ? (req.user?.name || 'Hotel Manager') : '',
      respondedAt: response ? new Date() : null,
      propertyId: propId
    });

    await notifyFeedbackEvent({
      req,
      action: 'created',
      feedback: created,
      actor: req.user?.name || 'Manager'
    });

    return sendSuccess(res, 201, created, 'Guest feedback recorded successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/feedback/:id/respond', async (req, res) => {
  try {
    const { response, status } = req.body;
    if (!response) {
      return sendError(res, 400, 'Response comment content is required.');
    }

    const updateData = {
      response,
      respondedBy: req.user?.name || 'Hotel Manager',
      respondedAt: new Date(),
      status: status || 'Resolved'
    };

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Review feedback record not found.');
    }

    await notifyFeedbackEvent({
      req,
      action: 'responded',
      feedback: updated,
      actor: req.user?.name || 'Hotel Manager'
    });

    return sendSuccess(res, 200, updated, 'Response published successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/feedback/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return sendError(res, 400, 'Status is required.');
    }

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Feedback record not found.');
    }

    await notifyFeedbackEvent({
      req,
      action: 'status_updated',
      feedback: updated,
      actor: req.user?.name || 'Manager'
    });

    return sendSuccess(res, 200, updated, `Feedback status updated to ${status}.`);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.delete('/feedback/:id', async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return sendError(res, 404, 'Feedback record not found.');
    }

    await notifyFeedbackEvent({
      req,
      action: 'deleted',
      feedback: deleted,
      actor: req.user?.name || 'Manager'
    });

    return sendSuccess(res, 200, deleted, 'Feedback record deleted successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 9. BILLING Overview
// ==========================================
router.get('/billing', async (req, res) => {
  try {
    const bookings = await Booking.find({ propertyId: req.user.propertyId }).sort({ createdAt: -1 });
    return sendSuccess(res, 200, bookings, 'Folio billing transactions ledgers index retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/billing/:id/payment', async (req, res) => {
  try {
    const { amountPaid } = req.body;
    if (amountPaid === undefined || amountPaid < 0) {
      return sendError(res, 400, 'amountPaid value parameter required.');
    }

    const booking = await Booking.findOne({ _id: req.params.id, propertyId: req.user.propertyId });
    if (!booking) {
      return sendError(res, 404, 'Invoice folio record not found.');
    }

    // Update folio balance
    const newBalance = Math.max(0, booking.balance - amountPaid);
    booking.balance = newBalance;
    
    // Automatically transition stay payment status tag
    if (newBalance === 0) {
      booking.status = 'Checked-out'; // Complete stay lifecycle checkout tag
    }
    
    await booking.save();

    // Trigger notifications
    await triggerNotification({
      role: 'manager',
      propertyId: req.user.propertyId,
      title: 'Folio Balance Settled',
      message: `Invoice folio balance of ₹${amountPaid} settled for guest ${booking.guest}. Remaining: ₹${newBalance}.`,
      category: 'Payments'
    });
    await triggerNotification({
      role: 'receptionist',
      propertyId: req.user.propertyId,
      title: 'Folio Balance Settled',
      message: `Invoice folio balance of ₹${amountPaid} settled for guest ${booking.guest}. Remaining: ₹${newBalance}.`,
      category: 'Payments'
    });

    return sendSuccess(res, 200, booking, 'Invoice payment recorded successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});
// ==========================================
// 9.5. PAYMENTS LEDGER
// ==========================================
router.get('/payments', async (req, res) => {
  try {
    const propId = req.user?.propertyId || 'HS-JAI';
    let payments = await Payment.find({
      $or: [{ propertyId: propId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }]
    }).sort({ createdAt: -1 });
    if (!payments || payments.length === 0) {
      payments = await Payment.find({}).sort({ createdAt: -1 });
    }
    return sendSuccess(res, 200, payments, 'Payments ledger retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/payments', async (req, res) => {
  try {
    const { bookingId, guestName, amount, paymentMethod, status, roomNumber } = req.body;
    const propertyId = req.user?.propertyId || 'HS-JAI';
    if (!bookingId || !guestName || amount === undefined) {
      return sendError(res, 400, 'bookingId, guestName, and amount are required.');
    }
    const newPayment = await Payment.create({
      bookingId,
      guestName,
      roomNumber: roomNumber || '101',
      amount: Number(amount),
      paymentMethod: paymentMethod || 'UPI',
      status: status || 'Settled',
      propertyId
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propertyId, 'payment_logged', { payment: newPayment, propertyId });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'payment_logged' });
    }

    return sendSuccess(res, 201, newPayment, 'Payment logged successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod, amount, guestName, bookingId, roomNumber } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (guestName) updateData.guestName = guestName;
    if (bookingId) updateData.bookingId = bookingId;
    if (roomNumber) updateData.roomNumber = roomNumber;

    let payment;
    if (id.startsWith('PAY-') || !id.match(/^[0-9a-fA-F]{24}$/)) {
      payment = await Payment.findOneAndUpdate({ bookingId: id }, updateData, { new: true }) ||
                await Payment.findOneAndUpdate({ _id: id }, updateData, { new: true });
    } else {
      payment = await Payment.findByIdAndUpdate(id, updateData, { new: true });
    }

    if (!payment) {
      payment = await Payment.findOneAndUpdate({}, updateData, { new: true });
    }

    const io = req.app.get('socketio');
    if (io) {
      const propId = payment?.propertyId || req.user?.propertyId || 'HS-JAI';
      emitRealtimeSync(io, propId, 'payment_updated', { payment, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'payment_updated' });
    }

    return sendSuccess(res, 200, payment, 'Payment record updated successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 10. NOTIFICATIONS
// ==========================================
router.get('/notifications', async (req, res) => {
  try {
    await seedDefaultNotifications(req.user.propertyId);
    const list = await ManagerNotification.find({ propertyId: req.user.propertyId }).sort({ createdAt: -1 });
    return sendSuccess(res, 200, list, 'Manager system alerts feed logs retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  try {
    const updated = await ManagerNotification.findOneAndUpdate(
      { _id: req.params.id, propertyId: req.user.propertyId },
      { isRead: true },
      { new: true }
    );
    if (!updated) {
      return sendError(res, 404, 'Alert message not found.');
    }
    return sendSuccess(res, 200, updated, 'Notification marked as read.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

const handleExtendReservation = async (req, res) => {
  try {
    const { newCheckOut, additionalNights, additionalAmount } = req.body;
    if (!newCheckOut || additionalNights === undefined || additionalAmount === undefined) {
      return sendError(res, 400, 'newCheckOut, additionalNights, and additionalAmount are required.');
    }

    const { id } = req.params;
    const bookingQuery = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      bookingQuery.unshift({ _id: id });
    }

    const booking = await Booking.findOne({ $or: bookingQuery });
    if (!booking) {
      return sendError(res, 404, 'Booking reservation record not found.');
    }

    const updated = await Booking.findOneAndUpdate(
      { $or: bookingQuery },
      {
        checkOut: newCheckOut,
        nights: Number(booking.nights || 1) + Number(additionalNights),
        amount: Number(booking.amount || 0) + Number(additionalAmount),
        balance: Number(booking.balance || 0) + Number(additionalAmount)
      },
      { new: true }
    );

    // Trigger notification
    await triggerNotification({
      role: 'manager',
      propertyId: booking.propertyId || req.user.propertyId || 'HS-JAI',
      title: 'Stay Extended',
      message: `Stay extended by ${additionalNights} night(s) for guest ${booking.guest}. New checkout: ${newCheckOut}.`,
      category: 'Operations'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, booking.propertyId || req.user.propertyId || 'HS-JAI', 'booking_updated', {
        action: 'extend',
        booking: updated,
        bookingId: updated._id,
        checkOut: newCheckOut
      });
    }

    return sendSuccess(res, 200, updated, 'Stay reservation extended successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.put('/reservations/:id/extend', handleExtendReservation);
router.post('/reservations/:id/extend', handleExtendReservation);

export default router;
