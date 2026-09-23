import express from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import Property from '../models/property.model.js';
import Notification from '../models/notification.model.js';
import {
  Room,
  Shift,
  Attendance,
  Approval,
  Feedback,
  ManagerNotification,
  Payment
} from '../models/managerData.model.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from '../utils/socketEmitter.js';
import { findPropertySafely, invalidatePropertyCache } from '../utils/propertyCache.js';
import { getUnifiedFeedbacksAndReviews } from '../utils/unifiedFeedback.helper.js';
import { extractRoomNumber, syncRoomStatus } from '../utils/roomHelper.js';
import { triggerNotification, notifyBookingEvent } from '../utils/notification.helper.js';
import { isCheckInAllowed, formatISTDateTime } from '../utils/dateUtils.js';
import { processAutoCheckouts } from '../services/autoCheckout.service.js';
import {
  validateAadhaarConsistency,
  validateBookingAadhaarConsistency,
  syncVerifiedAadhaarToGuestProfile,
  findExistingVerifiedAadhaar,
  formatAadhaar
} from '../utils/aadhaarValidator.js';

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

// Helper to seed default attendance logs if empty or outdated (August)
const seedDefaultAttendance = async (propertyId, staffMembers) => {
  if (!staffMembers || staffMembers.length === 0) return;
  const propId = propertyId || 'HS-9HQ8P';

  // Delete legacy hardcoded August records
  await Attendance.deleteMany({
    date: { $regex: '^2026-08' }
  }).catch(() => null);

  const now = new Date();
  const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = formatYMD(now);

  const hasToday = await Attendance.findOne({
    $or: [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }],
    date: todayStr
  });

  if (!hasToday) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(formatYMD(d));
    }

    const defaultAttendance = [];
    dates.forEach((date, dateIdx) => {
      staffMembers.forEach((s, idx) => {
        const shiftStr = (s.shift || '').toLowerCase();
        let checkIn = "09:00";
        let checkOut = "18:00";
        let workingHours = 9;

        if (shiftStr.includes('morning')) {
          checkIn = "06:00";
          checkOut = "14:00";
          workingHours = 8;
        } else if (shiftStr.includes('afternoon') || shiftStr.includes('evening')) {
          checkIn = "14:00";
          checkOut = "22:00";
          workingHours = 8;
        } else if (shiftStr.includes('night')) {
          checkIn = "22:00";
          checkOut = "06:00";
          workingHours = 8;
        }

        const status = (dateIdx === 3 && idx === 1) ? 'On Leave' : (idx % 6 === 5 ? 'Absent' : 'Present');

        defaultAttendance.push({
          userId: String(s._id || s.id),
          username: s.name,
          date,
          checkIn: status === 'Present' ? checkIn : '--:--',
          checkOut: status === 'Present' ? checkOut : '--:--',
          workingHours: status === 'Present' ? workingHours : 0,
          status,
          propertyId: s.propertyId || propId
        });
      });
    });

    try {
      await Attendance.insertMany(defaultAttendance);
    } catch (err) {
      console.warn('Attendance seed error:', err.message);
    }
  }
};

// Helper to seed default approvals if empty
const seedDefaultApprovals = async (propertyId) => {
  const count = await Approval.countDocuments({});
  if (count === 0) {
    const defaults = [
      {
        id: "APR-9101",
        category: "Discount Override",
        requestedBy: "Amit Verma (Receptionist)",
        guest: "Abhi",
        bookingId: "BKG-7821",
        room: "102",
        amount: 2500,
        value: "₹2,500 Discount",
        reason: "Repeat corporate guest tariff override request.",
        description: "Guest requested standard corporate tariff discount match for 3-night stay in Room 102.",
        status: "Pending",
        propertyId: propertyId || "HS-9HQ8P"
      },
      {
        id: "APR-9102",
        category: "Refund Request",
        requestedBy: "Sunita Rao (Receptionist)",
        guest: "Ramesh",
        bookingId: "BKG-4491",
        room: "103",
        amount: 3500,
        value: "₹3,500 Refund",
        reason: "AC malfunctioning in Room 103 during stay.",
        description: "Front desk processed room swap; guest requested refund waiver for first night inconvenience.",
        status: "Pending",
        propertyId: propertyId || "HS-9HQ8P"
      },
      {
        id: "APR-9103",
        category: "Room Upgrade",
        requestedBy: "Amit Verma (Receptionist)",
        guest: "Surya",
        bookingId: "BKG-3104",
        room: "301",
        amount: 0,
        value: "Complimentary Upgrade",
        reason: "Standard Room overbooked. Complimentary Deluxe upgrade proposal.",
        description: "High occupancy tier override: upgraded guest to Executive Suite 301 at standard room rate.",
        status: "Approved",
        propertyId: propertyId || "HS-9HQ8P",
        decisionReason: "Standard overbooking resolved with guest satisfaction.",
        decidedBy: "Vikram Rathore",
        decidedAt: new Date()
      },
      {
        id: "APR-9104",
        category: "Cancellation Waiver",
        requestedBy: "Neha Patel (Front Desk)",
        guest: "Mounika",
        bookingId: "BKG-2098",
        room: "103",
        amount: 1800,
        value: "100% Fee Waiver",
        reason: "Medical emergency cancellation.",
        description: "Guest provided medical proof for travel disruption and emergency hospital admission.",
        status: "Approved",
        propertyId: propertyId || "HS-9HQ8P",
        decisionReason: "Medical documentation verified.",
        decidedBy: "Vikram Rathore",
        decidedAt: new Date()
      },
      {
        id: "APR-9105",
        category: "Late Check-out Waiver",
        requestedBy: "Amit Verma (Receptionist)",
        guest: "Aswini",
        bookingId: "BKG-6502",
        room: "401",
        amount: 1200,
        value: "₹1,200 Fee Waiver",
        reason: "Late checkout until 4:00 PM without additional fee.",
        description: "Flight departure delayed by 5 hours. Requested complimentary late check-out authorization.",
        status: "Rejected",
        propertyId: propertyId || "HS-9HQ8P",
        decisionReason: "Room needed immediately for 2:00 PM incoming check-in arrival.",
        decidedBy: "Vikram Rathore",
        decidedAt: new Date()
      },
      {
        id: "APR-9106",
        category: "Early Check-in Waiver",
        requestedBy: "Sunita Rao (Receptionist)",
        guest: "Vamsi",
        bookingId: "BKG-5120",
        room: "101",
        amount: 800,
        value: "₹800 Fee Waiver",
        reason: "Early arrival at 8:00 AM requesting complimentary room access.",
        description: "Room 101 was vacant and inspected since yesterday; requested early key release.",
        status: "Pending",
        propertyId: propertyId || "HS-9HQ8P"
      }
    ];
    await Approval.insertMany(defaults);
  }
};

let lastManagerSyncTime = 0;
let managerSeeded = false;

// Helper to seed default notifications
const seedDefaultNotifications = async (propertyId) => {
  if (managerSeeded) return;
  managerSeeded = true;
  try {
    const count = await ManagerNotification.countDocuments({});
    if (count === 0) {
      const defaults = [
        {
          title: "New Reservation Received",
          message: "Booking BK-10101 confirmed via MakeMyTrip for Standard Room.",
          category: "Reservations",
          isRead: false,
          propertyId: propertyId || 'HS-9HQ8P'
        },
        {
          title: "Housekeeping Alert",
          message: "Room 102 reported priority cleaning completed.",
          category: "Operations",
          isRead: false,
          propertyId: propertyId || 'HS-9HQ8P'
        }
      ];
      await ManagerNotification.insertMany(defaults);
    }
  } catch (e) {
    console.error('Error seeding manager notifications:', e.message);
  }
};

// Batch synchronizer: ensures all bookings in database have matching manager notifications
const syncManagerBookingNotifications = async (propertyId) => {
  const now = Date.now();
  if (now - lastManagerSyncTime < 300000) return;
  lastManagerSyncTime = now;

  try {
    const [allBookings, existingMgrNotifs] = await Promise.all([
      Booking.find({}).lean(),
      ManagerNotification.find({}, { message: 1, title: 1 }).lean()
    ]);

    const existingRefs = new Set();
    for (const n of existingMgrNotifs || []) {
      const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
      const matches = text.match(/([a-z0-9_-]{4,})/g);
      if (matches) {
        for (const m of matches) existingRefs.add(m);
      }
    }

    const toInsert = [];
    for (const b of allBookings || []) {
      const bId = String(b.bookingId || b._id || b.id || '').trim();
      if (!bId) continue;
      const bIdLower = bId.toLowerCase();
      if (existingRefs.has(bIdLower)) continue;
      existingRefs.add(bIdLower);

      const guestName = b.guest || b.guestName || b.customerName || 'Guest';
      const roomInfo = b.room || b.roomType || 'Standard Room';
      const checkIn = b.checkIn || b.checkInDate || 'Today';
      const checkOut = b.checkOut || b.checkOutDate || 'Tomorrow';
      const amount = b.totalAmount || b.amount || 0;
      const targetProp = b.propertyId || propertyId || 'HS-9HQ8P';

      toInsert.push({
        title: 'New Online Reservation',
        message: `Guest ${guestName} booked ${roomInfo} (${checkIn} → ${checkOut}) for ₹${amount}. [Ref: #${bId}]`,
        category: 'Reservations',
        isRead: false,
        propertyId: targetProp,
        createdAt: b.createdAt || new Date()
      });
    }

    if (toInsert.length > 0) {
      await ManagerNotification.insertMany(toInsert);
    }
  } catch (err) {
    console.error('Error syncing manager booking notifications:', err.message);
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
    await processAutoCheckouts(req.app.get('socketio'));
    const propId = req.user?.propertyId || 'HS-9HQ8P';
    let query = {};
    if (req.user?.role !== 'super-admin' && propId) {
      query = { $or: [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { hotelId: 'HS-9HQ8P' }, { hotelId: propId }, { propertyId: { $exists: false } }, { propertyId: null }, { propertyId: '' }] };
    }
    const bookings = await Booking.find(query).sort({ createdAt: -1, checkIn: -1, updatedAt: -1, _id: -1 });
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
    const propId = req.user?.propertyId || 'HS-9HQ8P';
    const bookingId = req.body.bookingId || req.body.id || `BK-${Date.now().toString().slice(-5)}`;
    
    let roomNum = extractRoomNumber(req.body);

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

    // Aadhaar consistency validation on reservation creation / confirmation
    const inputDocType = req.body.idProofType || req.body.idDocType || 'Aadhaar Card';
    const inputDocNumber = req.body.idProofNumber || req.body.idDocNumber || '';

    const aadhaarValidation = await validateBookingAadhaarConsistency({
      guestId,
      email: cleanEmail,
      phone: cleanPhone,
      name: req.body.guest || req.body.name,
      idDocType: inputDocType,
      idDocNumber: inputDocNumber
    });

    if (!aadhaarValidation.isValid) {
      return sendError(res, 400, aadhaarValidation.error);
    }

    const isAadhaar = aadhaarValidation.isAadhaar;
    const finalDocNumber = isAadhaar ? aadhaarValidation.formattedAadhaar : (inputDocNumber ? String(inputDocNumber).trim() : '');
    const finalDocType = isAadhaar ? 'Aadhaar Card' : inputDocType;
    const hasVerifiedId = Boolean(finalDocNumber && (isAadhaar || (req.body.source === 'Walk-in' && req.body.status === 'Checked-in')));

    const payload = {
      ...req.body,
      bookingId,
      guestId,
      id: bookingId,
      propertyId: propId,
      email: cleanEmail,
      phone: cleanPhone,
      idDocType: finalDocType,
      idDocNumber: finalDocNumber,
      idVerification: hasVerifiedId ? 'Verified' : (req.body.idVerification || 'Pending'),
      idVerifiedAt: hasVerifiedId ? new Date() : (req.body.idVerifiedAt || null),
      idVerifiedBy: hasVerifiedId ? (req.user?.name || 'Property Manager') : (req.body.idVerifiedBy || ''),
      room: req.body.room || (roomNum ? `${roomNum} · ${req.body.roomType || 'Standard Room'}` : ''),
      roomNumber: roomNum,
      roomType: req.body.roomType || 'Standard Room',
      status: req.body.status || (req.body.source === 'Walk-in' ? 'Checked-in' : 'Confirmed'),
      paymentStatus: req.body.paymentStatus || (req.body.balance === 0 ? 'Paid' : 'Pending')
    };

    const newBooking = await Booking.create(payload);

    if (hasVerifiedId && isAadhaar) {
      await syncVerifiedAadhaarToGuestProfile({
        booking: newBooking,
        idDocType: finalDocType,
        idDocNumber: finalDocNumber,
        verifiedBy: req.user?.name || 'Property Manager'
      });
    }

    // If room is assigned, update room status
    if (roomNum) {
      const rmStatus = payload.status === 'Checked-in' ? 'Occupied' : 'Reserved';
      await syncRoomStatus(roomNum, rmStatus, propId);
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

    // Trigger Unified Notifications across Web & Mobile consoles
    await notifyBookingEvent({
      req,
      io,
      action: 'created',
      booking: newBooking
    });

    return sendSuccess(res, 201, newBooking, 'Reservation created successfully');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to create reservation');
  }
});

// Verify ID proof details for a reservation
// Check existing Aadhaar verification status for a guest
router.get('/reservations/:id/guest-aadhaar-status', async (req, res) => {
  try {
    const { id } = req.params;
    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    const booking = await Booking.findOne({ $or: query });
    if (!booking) return sendError(res, 404, 'Reservation not found');

    const existingRecord = await findExistingVerifiedAadhaar({
      guestId: booking.guestId,
      email: booking.email,
      phone: booking.phone,
      name: booking.guest
    });

    return sendSuccess(res, 200, {
      hasExistingAadhaar: Boolean(existingRecord.existingAadhaar),
      maskedAadhaar: existingRecord.maskedAadhaar || null,
      source: existingRecord.source,
      guestName: booking.guest,
      currentStatus: booking.idVerification || 'Pending'
    }, 'Guest Aadhaar status retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Lookup Aadhaar status for an existing or prospective guest before booking creation
router.get('/guests/lookup-aadhaar', async (req, res) => {
  try {
    const { phone, email, guestId, name } = req.query;
    if (!phone && !email && !guestId) {
      return sendSuccess(res, 200, { hasExistingAadhaar: false, maskedAadhaar: null });
    }
    const existingRecord = await findExistingVerifiedAadhaar({ phone, email, guestId, name });
    return sendSuccess(res, 200, {
      hasExistingAadhaar: Boolean(existingRecord.existingAadhaar),
      maskedAadhaar: existingRecord.maskedAadhaar || null,
      last4: existingRecord.existingAadhaar ? existingRecord.existingAadhaar.slice(-4) : null,
      source: existingRecord.source,
      guestName: existingRecord.guestUser?.name || name
    }, 'Guest Aadhaar status retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/reservations/:id/verify-id', async (req, res) => {
  try {
    const { id } = req.params;
    const { idDocType, idDocNumber, idDocImage, idVerification, notes } = req.body;

    if (!idDocNumber || !idDocNumber.trim()) {
      return sendError(res, 400, 'ID Document Number is required for verification.');
    }

    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    const booking = await Booking.findOne({ $or: query });
    if (!booking) return sendError(res, 404, 'Reservation not found');

    const effectiveDocType = idDocType || booking.idDocType || 'Aadhaar Card';

    // Authoritative Aadhaar consistency validation
    const validation = await validateAadhaarConsistency({
      booking,
      idDocType: effectiveDocType,
      idDocNumber
    });

    if (!validation.isValid) {
      if (validation.mismatch) {
        await Booking.findByIdAndUpdate(booking.id || booking._id, {
          idVerification: 'Mismatch',
          idDocNumber: idDocNumber.trim(),
          idDocType: effectiveDocType
        });
      }
      return sendError(res, 400, validation.error);
    }

    const updated = await syncVerifiedAadhaarToGuestProfile({
      booking,
      idDocType: effectiveDocType,
      idDocNumber: validation.formattedAadhaar || idDocNumber.trim(),
      idDocImage: idDocImage || booking.idDocImage || '',
      verifiedBy: req.user?.name || req.user?.username || 'Property Manager'
    });

    return sendSuccess(res, 200, updated, 'ID proof successfully verified.');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to verify ID proof');
  }
});

router.put('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const propId = req.user?.propertyId || 'HS-9HQ8P';
    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    const existingBooking = await Booking.findOne({ $or: query });
    if (!existingBooking) return sendError(res, 404, 'Reservation not found');

    const isWebsiteBooking = existingBooking.source && existingBooking.source !== 'Walk-in' && !existingBooking.source.toLowerCase().includes('walk-in');

    // Strict server-time check-in enforcement
    if (req.body.status === 'Checked-in') {
      const serverNow = new Date();
      if (!isCheckInAllowed(existingBooking, serverNow)) {
        const checkInTime = existingBooking.checkInTime || '12:00 PM';
        return sendError(res, 400, `Check-in is only permitted starting at ${checkInTime} on ${existingBooking.checkIn} (Current server time: ${formatISTDateTime(serverNow)}). Early check-in is locked.`);
      }
    }

    // Block check-in if reservation is in Aadhaar mismatch state and no valid override provided
    if (req.body.status === 'Checked-in' && existingBooking.idVerification === 'Mismatch' && !req.body.idDocNumber) {
      return sendError(res, 400, 'Cannot check in guest: ID verification has an Aadhaar mismatch on file. Please complete ID proof verification first.');
    }

    // If ID document is submitted or updated during check-in, run Aadhaar consistency validation
    if (req.body.idDocNumber) {
      const effectiveDocType = req.body.idDocType || existingBooking.idDocType || 'Aadhaar Card';
      const validation = await validateAadhaarConsistency({
        booking: existingBooking,
        idDocType: effectiveDocType,
        idDocNumber: req.body.idDocNumber
      });

      if (!validation.isValid) {
        if (validation.mismatch) {
          await Booking.findByIdAndUpdate(existingBooking.id || existingBooking._id, {
            idVerification: 'Mismatch',
            idDocNumber: req.body.idDocNumber.trim(),
            idDocType: effectiveDocType
          });
        }
        return sendError(res, 400, validation.error);
      }
    }

    if (req.body.status === 'Checked-in' && isWebsiteBooking) {
      const isAlreadyVerified = existingBooking.idVerification === 'Verified';
      const isProvidedNow = (req.body.idVerification === 'Verified' || req.body.idDocNumber);
      if (!isAlreadyVerified && !isProvidedNow && !req.body.bypassVerification) {
        return sendError(res, 400, 'ID Proof Verification is required before checking in a website booking.');
      }
    }

    let roomNum = extractRoomNumber(req.body) || extractRoomNumber(existingBooking);

    const updatePayload = { ...req.body };
    if (roomNum) {
      updatePayload.roomNumber = roomNum;
      updatePayload.room = req.body.room || `${roomNum} · ${req.body.roomType || existingBooking.roomType || 'Standard Room'}`;
    }

    if (req.body.idDocNumber) {
      const effectiveDocType = req.body.idDocType || existingBooking.idDocType || 'Aadhaar Card';
      const isAadhaar = effectiveDocType.toLowerCase().includes('aadhaar');
      updatePayload.idDocNumber = isAadhaar ? formatAadhaar(req.body.idDocNumber) : req.body.idDocNumber.trim();
      updatePayload.idDocType = effectiveDocType;
      updatePayload.idDocImage = req.body.idDocImage || existingBooking.idDocImage || '';
      updatePayload.idVerification = 'Verified';
      updatePayload.idVerifiedAt = new Date();
      updatePayload.idVerifiedBy = req.user?.name || req.user?.username || 'Property Manager';

      // Sync guest profile in User collection
      await syncVerifiedAadhaarToGuestProfile({
        booking: existingBooking,
        idDocType: updatePayload.idDocType,
        idDocNumber: updatePayload.idDocNumber,
        idDocImage: updatePayload.idDocImage,
        verifiedBy: updatePayload.idVerifiedBy
      });
    }

    const updated = await Booking.findOneAndUpdate(
      { $or: query },
      updatePayload,
      { new: true }
    );

    if (!updated) return sendError(res, 404, 'Reservation not found');

    // Update Room table accordingly
    if (roomNum) {
      let rmStatus = 'Available';
      if (updated.status === 'Checked-in') rmStatus = 'Occupied';
      else if (updated.status === 'Confirmed' || updated.status === 'Pending') rmStatus = 'Reserved';
      else if (updated.status === 'Checked-out') rmStatus = 'Available';
      else if (updated.status === 'Cancelled' || updated.status === 'No-show') rmStatus = 'Available';

      await syncRoomStatus(roomNum, rmStatus, propId);
    }

    const action = updated.status === 'Checked-in' ? 'checkin' : updated.status === 'Checked-out' ? 'checkout' : updated.status === 'Cancelled' ? 'cancelled' : 'status_change';

    // Broadcast notifications to all stakeholders including Guest
    await notifyBookingEvent({
      req,
      action,
      booking: updated
    });

    // Realtime broadcast across all dashboards
    const io = req.app.get('socketio');
    if (io) {
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
    const propId = req.user?.propertyId || 'HS-9HQ8P';

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

    const cleanRoomNum = extractRoomNumber(roomNumber);
    const rmStatus = updated.status === 'Checked-in' ? 'Occupied' : 'Reserved';
    if (cleanRoomNum) {
      await syncRoomStatus(cleanRoomNum, rmStatus, propId);
    }

    // Notify guest and dashboards of room assignment
    await notifyBookingEvent({
      req,
      action: 'room_assigned',
      booking: updated
    });

    const io = req.app.get('socketio');
    if (io) {
      broadcastCheckinCheckout(io, propId, {
        action: 'room_assigned',
        booking: updated,
        roomNumber: cleanRoomNum || String(roomNumber),
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
    const propId = req.user?.propertyId || 'HS-9HQ8P';
    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    const deleted = await Booking.findOneAndDelete({ $or: query });
    if (!deleted) return sendError(res, 404, 'Reservation not found');

    const deletedRoomNum = extractRoomNumber(deleted);
    if (deletedRoomNum) {
      await syncRoomStatus(deletedRoomNum, 'Available', propId);
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'booking_deleted', { id, bookingId: deleted.bookingId, propertyId: propId });
      emitRealtimeSync(io, propId, 'room_status_changed', { propertyId: propId, roomNumber: deletedRoomNum, status: 'Available' });
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

    const propId = req.user?.propertyId || 'HS-9HQ8P';
    let rooms = await Room.find({ $or: [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }] }).sort({ roomNumber: 1 });
    if (!rooms || rooms.length === 0) {
      rooms = await Room.find().sort({ roomNumber: 1 });
    }
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

      const bRoomNum = b.roomNumber || (b.roomId && !isNaN(b.roomId) ? String(b.roomId) : null) || (b.room ? String(b.room).match(/\b\d{3,4}\b/)?.[0] : null);
      let matchedRm = null;

      if (b.roomId) {
        matchedRm = rooms.find(r => String(r._id) === String(b.roomId) || String(r.id) === String(b.roomId) || String(r.roomNumber).trim() === String(b.roomId).trim());
      }
      if (!matchedRm && bRoomNum) {
        matchedRm = rooms.find(r => String(r.roomNumber).trim() === String(bRoomNum).trim());
      }
      if (!matchedRm && b.room) {
        matchedRm = rooms.find(r => String(b.room).includes(String(r.roomNumber)));
      }

      if (matchedRm) {
        roomBookingMap.set(String(matchedRm._id), b);
        roomBookingMap.set(String(matchedRm.roomNumber), b);
      }
    }

    const mappedRooms = rooms.map(rm => {
      const matchedBooking = roomBookingMap.get(String(rm._id)) || roomBookingMap.get(String(rm.roomNumber));
      const isReserved = !!matchedBooking;

      let displayStatus = rm.status || 'Available';
      if (rm.status !== 'Blocked' && matchedBooking) {
        if (matchedBooking.status === 'Checked-in' || matchedBooking.status === 'Checked In' || matchedBooking.status === 'Staying') {
          displayStatus = 'Occupied';
        } else if (['Confirmed', 'Paid', 'Pending', 'Pre-checked'].includes(matchedBooking.status)) {
          displayStatus = 'Reserved';
        }
      }

      return {
        ...rm.toObject(),
        status: displayStatus,
        operationalStatus: rm.status || 'Available',
        isReserved,
        isAvailable: displayStatus === 'Available',
        guest: matchedBooking ? (matchedBooking.guest || matchedBooking.guestName || '') : '',
        checkIn: matchedBooking ? matchedBooking.checkIn : '',
        checkOut: matchedBooking ? matchedBooking.checkOut : ''
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
    const propId = req.user?.propertyId;
    let query = {};
    if (req.user?.role !== 'super-admin' && propId) {
      query = { $or: [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }, { propertyId: null }, { propertyId: '' }] };
    }
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    
    // Compile unique guests lists
    const guestsMap = {};
    bookings.forEach(b => {
      const guestName = b.guest || b.guestName || b.customerName;
      if (!guestName) return;
      const key = guestName.trim().toLowerCase();
      
      const match = String(b.room || "").match(/\b\d{3,4}\b/);
      const rmNum = b.roomNumber || (match ? match[0] : (b.roomId && !isNaN(b.roomId) ? String(b.roomId) : (b.room || '--')));
      const statusStr = b.status || 'Confirmed';
      const isCheckedIn = (statusStr.toLowerCase().includes('in') && statusStr.toLowerCase().includes('check')) || statusStr.toLowerCase() === 'staying';
      
      const guestData = {
        id: b._id || b.id || b.bookingId,
        _id: b._id || b.id || b.bookingId,
        name: guestName,
        guest: guestName,
        phone: b.phone || b.mobile || '--',
        email: b.email || `${guestName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        room: rmNum,
        roomNumber: rmNum,
        checkIn: b.checkIn || b.checkInDate || '',
        checkOut: b.checkOut || b.checkOutDate || '',
        status: statusStr,
        paymentStatus: (b.balance === 0 || b.paymentStatus === 'Paid') ? 'Paid' : 'Pending',
        bookingId: b.bookingId || b._id || b.id
      };

      if (!guestsMap[key]) {
        guestsMap[key] = guestData;
      } else if (isCheckedIn) {
        // Active staying guest profile takes priority
        guestsMap[key] = {
          ...guestData,
          phone: guestData.phone !== '--' ? guestData.phone : guestsMap[key].phone,
          email: guestData.email || guestsMap[key].email
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
    const targetPropId = req.user.propertyId || 'HS-9HQ8P';
    await seedDefaultApprovals(targetPropId);
    let query = {};
    if (req.user.role === 'super-admin') {
      query = {};
    } else {
      query = { $or: [{ propertyId: targetPropId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }, { propertyId: null }, { propertyId: { $exists: false } }] };
    }
    const list = await Approval.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, 200, list, 'Approvals desk requests list retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/approvals/:id', async (req, res) => {
  try {
    const { action, decisionReason, transactionId, notes } = req.body;
    if (!action) {
      return sendError(res, 400, 'Decision action is required (Approve, Reject, Processing, Refunded).');
    }
    
    let finalAction = action;
    const actLower = String(action).toLowerCase();
    if (actLower === 'approve' || actLower === 'approved') finalAction = 'Approved';
    else if (actLower === 'reject' || actLower === 'rejected') finalAction = 'Rejected';
    else if (actLower === 'processing' || actLower === 'process') finalAction = 'Processing';
    else if (actLower === 'refunded' || actLower === 'refund') finalAction = 'Refunded';

    if (!['Approved', 'Rejected', 'Processing', 'Refunded'].includes(finalAction)) {
      return sendError(res, 400, 'Invalid decision action. Must be Approve, Reject, Processing, or Refunded.');
    }

    const approvalQuery = [{ id: req.params.id }];
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      approvalQuery.unshift({ _id: req.params.id });
    }

    const updated = await Approval.findOneAndUpdate(
      { $or: approvalQuery },
      {
        status: finalAction,
        decisionReason: decisionReason || notes || (
          finalAction === 'Approved' ? 'Approved by Hotel Staff' :
          finalAction === 'Processing' ? 'Disbursement in processing via bank gateway' :
          finalAction === 'Refunded' ? 'Refund payment successfully disbursed and settled' :
          'Rejected via Approvals Console'
        ),
        decidedBy: req.user.name || req.user.email || 'Administrator',
        decidedAt: new Date()
      },
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Approval request not found.');
    }

    let linkedBooking = null;
    if (updated.category === 'Refund' || updated.bookingId) {
      try {
        const cleanBkId = String(updated.bookingId).replace(/^BK-/, '').replace(/^FOL-/, '');
        const bkQuery = [{ bookingId: updated.bookingId }, { id: updated.bookingId }, { bookingId: cleanBkId }, { id: cleanBkId }];
        if (mongoose.Types.ObjectId.isValid(cleanBkId)) bkQuery.unshift({ _id: cleanBkId });
        if (mongoose.Types.ObjectId.isValid(updated.bookingId)) bkQuery.unshift({ _id: updated.bookingId });

        const updateSet = {
          'refundRequest.status': finalAction,
          'refundRequest.decidedBy': req.user.name || 'Manager',
          'refundRequest.decisionReason': decisionReason || notes || '',
          'refundRequest.decidedAt': new Date(),
          refundStatus: finalAction
        };

        if (finalAction === 'Processing') {
          updateSet['refundRequest.processedAt'] = new Date();
        } else if (finalAction === 'Refunded') {
          updateSet['refundRequest.refundedAt'] = new Date();
          updateSet['refundRequest.transactionId'] = transactionId || `TXN-REF-${Date.now().toString().slice(-6)}`;
          updateSet['paymentStatus'] = 'Refunded';
        }

        linkedBooking = await Booking.findOneAndUpdate(
          { $or: bkQuery },
          { $set: updateSet },
          { new: true }
        );

        if (finalAction === 'Refunded' && linkedBooking) {
          const pQuery = [
            { bookingId: linkedBooking.bookingId },
            { bookingId: String(linkedBooking._id) },
            { guestName: linkedBooking.guest }
          ];
          await Payment.updateMany(
            { $or: pQuery },
            { $set: { status: 'Refunded' } }
          );
        }
      } catch (bkErr) {
        console.warn('Sync refund status to booking error:', bkErr.message);
      }
    }

    const targetPropId = updated.propertyId || req.user.propertyId || 'HS-9HQ8P';

    try {
      // 1. Notify Guest directly
      let targetGuestId = linkedBooking?.guestId || linkedBooking?.userId || null;
      const targetEmail = linkedBooking?.email || linkedBooking?.guestEmail || null;
      if (!targetGuestId && targetEmail) {
        try {
          const u = await User.findOne({ email: targetEmail });
          if (u) targetGuestId = String(u._id || u.id);
        } catch (_) {}
      }
      if (targetGuestId || targetEmail) {
        await triggerNotification({
          req,
          role: 'guest',
          userId: targetGuestId || targetEmail,
          title: `Stay Refund Request: ${finalAction}`,
          message: `Your refund request of ₹${Number(updated.amount || linkedBooking?.refundableAmount || 0).toLocaleString('en-IN')} for Booking ${updated.bookingId || linkedBooking?.bookingId} is now ${finalAction}. ${decisionReason ? '(' + decisionReason + ')' : ''}`,
          category: 'Refund Update',
          data: {
            bookingId: linkedBooking?._id || linkedBooking?.bookingId || updated.bookingId,
            refundStatus: finalAction,
            decisionReason: decisionReason || ''
          }
        });
      }

      // 2. Notify Admin & Manager
      await triggerNotification({
        req,
        role: 'admin',
        propertyId: targetPropId,
        title: `Refund Lifecycle: ${finalAction}`,
        message: `Refund request for ${updated.guest || 'Guest'} (${updated.bookingId || 'Ref'}) was marked as ${finalAction} by ${req.user.name || 'Staff'}.`,
        category: 'Refunds'
      });

      // 3. Notify Receptionist
      await triggerNotification({
        req,
        role: 'receptionist',
        propertyId: targetPropId,
        title: `Refund Lifecycle: ${finalAction}`,
        message: `Refund request for ${updated.guest || 'Guest'} marked as ${finalAction}.`,
        category: 'Refunds'
      });
    } catch (notifErr) {
      console.warn('Notification dispatch failed for approval:', notifErr.message);
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, targetPropId, 'approval_updated', { approval: updated, propertyId: targetPropId });
      emitRealtimeSync(io, targetPropId, 'refund_status_updated', { bookingId: updated.bookingId, status: finalAction, propertyId: targetPropId });
      emitRealtimeSync(io, targetPropId, 'booking_updated', { bookingId: updated.bookingId, refundStatus: finalAction, propertyId: targetPropId });
      emitRealtimeSync(io, targetPropId, 'dashboard_sync', { propertyId: targetPropId, action: 'approval_updated' });
    }

    return sendSuccess(res, 200, updated, `Approval request decision marked as ${finalAction}.`);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 6. STAFF ROSTER & SHIFTS
// ==========================================
router.get('/staff', async (req, res) => {
  try {
    const propId = req.user?.propertyId;
    let query = { role: 'receptionist' };
    if (req.user?.role !== 'super-admin' && propId) {
      query.$or = [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }, { propertyId: null }, { propertyId: '' }];
    }
    const staff = await User.find(query).select('-password');
    
    return sendSuccess(res, 200, staff, 'Property receptionist personnel profiles retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

const buildManagerStaffLookups = (id, bodyEmail, bodyName, bodyAltId) => {
  const queries = [];
  const addQuery = (key, val) => {
    if (val && typeof val === 'string' && val.trim()) {
      const clean = val.trim();
      queries.push({ [key]: clean });
      if (key === 'email') queries.push({ [key]: clean.toLowerCase() });
    }
  };

  const cleanId = String(id || '').trim();
  if (cleanId) {
    addQuery('_id', cleanId);
    addQuery('id', cleanId);
    addQuery('email', cleanId);
    
    // Check if Base64 encoded ID
    try {
      if (cleanId.length % 4 === 0 && !cleanId.includes('-') && !cleanId.includes(' ') && /^[A-Za-z0-9+/=]+$/.test(cleanId)) {
        const decoded = Buffer.from(cleanId, 'base64').toString('utf8');
        if (decoded && decoded !== cleanId && (decoded.includes('-') || decoded.length >= 10 || decoded.includes('@') || decoded.startsWith('USR') || decoded.startsWith('STAFF') || decoded.startsWith('HS-'))) {
          addQuery('_id', decoded);
          addQuery('id', decoded);
          addQuery('email', decoded);
        }
      }
    } catch {}

    if (mongoose.Types.ObjectId.isValid(cleanId) && String(new mongoose.Types.ObjectId(cleanId)) === cleanId) {
      queries.unshift({ _id: new mongoose.Types.ObjectId(cleanId) });
    }
  }

  if (bodyAltId) {
    const cleanAlt = String(bodyAltId).trim();
    if (cleanAlt !== cleanId) {
      addQuery('_id', cleanAlt);
      addQuery('id', cleanAlt);
      addQuery('email', cleanAlt);
      if (mongoose.Types.ObjectId.isValid(cleanAlt) && String(new mongoose.Types.ObjectId(cleanAlt)) === cleanAlt) {
        queries.unshift({ _id: new mongoose.Types.ObjectId(cleanAlt) });
      }
    }
  }

  if (bodyEmail) {
    addQuery('email', bodyEmail);
    addQuery('id', bodyEmail);
  }

  if (bodyName) {
    addQuery('name', bodyName);
  }

  return queries.length > 0 ? queries : [{ _id: cleanId }];
};

router.get('/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildManagerStaffLookups(id, req.query?.email);

    const staffMember = await User.findOne({ $or: query }).select('-password');
    if (!staffMember) {
      return sendError(res, 404, 'Staff member not found.');
    }

    return sendSuccess(res, 200, staffMember, 'Staff profile retrieved successfully.');
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
      return sendError(res, 400, 'Staff user with this email already exists.');
    }

    const newUser = await User.create({
      name,
      email,
      password,
      mobile: mobile || '—',
      role: 'receptionist',
      propertyId: req.user.propertyId,
      dept: dept || 'Front Office',
      shift: shift || 'Morning Shift',
      status: 'Active'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_created', newUser);
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'staff_created', id: newUser._id });
    }

    return sendSuccess(res, 201, newUser, 'Receptionist staff personnel created successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const { name, mobile, dept, shift, role, status, email, _id: altId, id: altId2 } = req.body;
    const { id } = req.params;
    const query = buildManagerStaffLookups(id, email, name, altId || altId2);

    let staffMember = await User.findOne({ $or: query });
    if (!staffMember) {
      return sendError(res, 404, 'Staff member not found.');
    }

    const updateFields = {
      name: name !== undefined ? name : staffMember.name,
      mobile: mobile !== undefined ? mobile : staffMember.mobile,
      dept: dept !== undefined ? dept : staffMember.dept,
      shift: shift !== undefined ? shift : staffMember.shift
    };
    if (role !== undefined) updateFields.role = String(role).toLowerCase();
    if (status !== undefined) updateFields.status = status;

    const updated = await User.findOneAndUpdate(
      { _id: staffMember._id },
      updateFields,
      { new: true }
    ) || staffMember;

    // Dual-sync to Shift collection if shift was updated or provided
    const effectiveShift = shift !== undefined ? shift : updateFields.shift;
    if (effectiveShift) {
      try {
        await Shift.findOneAndUpdate(
          {
            $or: [
              { userId: String(staffMember._id) },
              { userId: String(staffMember.id || '') },
              { username: staffMember.name },
              { username: updated.name }
            ],
            propertyId: req.user.propertyId
          },
          {
            shiftType: effectiveShift,
            username: updated.name,
            userId: String(staffMember._id),
            propertyId: req.user.propertyId
          },
          { upsert: true, new: true }
        );
      } catch (shiftErr) {
        console.warn('Could not sync Shift model in manager PUT /staff/:id', shiftErr.message);
      }
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_updated', updated);
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'staff_updated', id });
    }

    return sendSuccess(res, 200, updated, 'Staff profile updated successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildManagerStaffLookups(id);

    const target = await User.findOne({ $or: query });
    if (!target) {
      return sendError(res, 404, 'Staff member not found.');
    }

    const deleted = await User.findOneAndDelete({ _id: target._id });
    if (!deleted) {
      return sendError(res, 404, 'Staff member not found.');
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_deleted', { id });
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'staff_deleted', id });
    }

    return sendSuccess(res, 200, { id }, 'Staff profile deleted successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.get('/shifts', async (req, res) => {
  try {
    const propId = req.user?.propertyId;
    let staffQuery = { role: 'receptionist' };
    let shiftQuery = {};
    if (req.user?.role !== 'super-admin' && propId) {
      staffQuery.$or = [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }, { propertyId: null }, { propertyId: '' }];
      shiftQuery.$or = [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }, { propertyId: null }, { propertyId: '' }];
    }
    const receptionistStaff = await User.find(staffQuery);
    
    await seedDefaultShifts(propId || 'HS-9HQ8P', receptionistStaff);
    const shifts = await Shift.find(shiftQuery);
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
      {
        $or: [
          { userId: String(userId) },
          { username: username }
        ],
        propertyId: req.user.propertyId
      },
      { shiftType, username, userId: String(userId), propertyId: req.user.propertyId },
      { new: true, upsert: true }
    );

    // Synchronize the User document's shift field
    const userQuery = buildManagerStaffLookups(userId, null, username);
    const updatedUser = await User.findOneAndUpdate(
      { $or: userQuery },
      { shift: shiftType },
      { new: true }
    );

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_updated', updatedUser || { _id: userId, shift: shiftType });
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'staff_updated', id: userId, shift: shiftType });
    }

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
    const propId = req.user?.propertyId;
    let staffQuery = { role: 'receptionist' };
    let attQuery = {};
    if (req.user?.role !== 'super-admin' && propId) {
      staffQuery.$or = [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }, { propertyId: null }, { propertyId: '' }];
      attQuery.$or = [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }, { propertyId: null }, { propertyId: '' }];
    }
    const receptionistStaff = await User.find(staffQuery);

    await seedDefaultAttendance(propId || 'HS-9HQ8P', receptionistStaff);
    const list = await Attendance.find(attQuery).sort({ date: -1 });
    return sendSuccess(res, 200, list, 'Daily attendance records log index retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/attendance', async (req, res) => {
  try {
    const { userId, username, date, checkIn, checkOut, workingHours, status } = req.body;
    if (!userId || !date) {
      return sendError(res, 400, 'userId and date are required.');
    }
    const propId = req.user?.propertyId || 'HS-9HQ8P';
    const record = await Attendance.create({
      userId: String(userId),
      username: username || 'Staff Member',
      date,
      checkIn: checkIn || '--:--',
      checkOut: checkOut || '--:--',
      workingHours: Number(workingHours) || 8,
      status: status || 'Present',
      propertyId: propId
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'attendance_updated', { record, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'attendance_created' });
    }

    return sendSuccess(res, 201, record, 'Attendance record logged successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, workingHours, status } = req.body;
    const propId = req.user?.propertyId || 'HS-9HQ8P';

    const query = [{ id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    const updated = await Attendance.findOneAndUpdate(
      { $or: query, propertyId: propId },
      { checkIn, checkOut, workingHours: Number(workingHours) || 8, status },
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Attendance record not found.');
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'attendance_updated', { record: updated, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'attendance_updated' });
    }

    return sendSuccess(res, 200, updated, 'Attendance record updated successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 8. GUEST FEEDBACK / REVIEWS
// ==========================================
router.get('/feedback', async (req, res) => {
  try {
    const propId = req.query.propertyId || req.user?.propertyId || 'HS-9HQ8P';
    const query = (propId && propId !== 'all')
      ? { $or: [{ propertyId: propId }, { propertyId: { $exists: false } }, { propertyId: '' }, { propertyId: 'HS-9HQ8P' }] }
      : {};
    const list = await getUnifiedFeedbacksAndReviews(query);
    return sendSuccess(res, 200, list, 'Reviews and guest feedback list retrieved from MongoDB.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const propId = req.body?.propertyId || req.user?.propertyId || 'HS-9HQ8P';
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

    // Update folio balance and payment status (do NOT change booking status)
    const newBalance = Math.max(0, booking.balance - amountPaid);
    booking.balance = newBalance;
    booking.paymentStatus = newBalance === 0 ? 'Paid' : 'Partial';
    
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
const ensureRealPayments = async (propId) => {
  try {
    const bookings = await Booking.find({});
    for (const b of bookings) {
      const rawId = b._id ? String(b._id) : null;
      let cleanBookingId = b.bookingId;
      if (!cleanBookingId || cleanBookingId.length === 24) {
        cleanBookingId = b._id ? `BK-${String(b._id).slice(-5).toUpperCase()}` : `BK-1001`;
      }
      const bId = cleanBookingId;
      const guestName = b.guest || b.customerName || b.guestName || 'Guest';

      let roomNumber = b.roomNumber;
      if (!roomNumber || isNaN(roomNumber) || roomNumber === 'Deluxe' || roomNumber === 'Standard') {
        const match = String(b.room || '').match(/\b\d{3,4}\b/)?.[0];
        if (match) {
          roomNumber = match;
        } else {
          const rType = String(b.room || b.roomType || '').toLowerCase();
          if (rType.includes('executive') || rType.includes('suite')) roomNumber = '301';
          else if (rType.includes('deluxe')) roomNumber = '201';
          else if (rType.includes('penthouse')) roomNumber = '501';
          else roomNumber = '101';
        }
      }

      const amount = Number(b.totalAmount || b.amount || 0);
      const discountAmount = Number(b.discountAmount || 0);
      const originalAmount = Number(b.originalAmount || (amount + discountAmount));
      const couponCode = b.couponCode || null;
      const paidAmount = Number(b.paidAmount || (b.paymentStatus === 'Paid' ? amount : Math.max(0, amount - Number(b.balance || 0))));
      const paymentMethod = b.paymentMethod || 'UPI';
      const isRefunded = b.paymentStatus === 'Refunded' || b.refundStatus === 'Refunded' || b.refundRequest?.status === 'Refunded';
      const status = isRefunded
        ? 'Refunded'
        : ((b.paymentStatus === 'Paid' || b.status === 'Checked-in' || b.status === 'Checked-out' || Number(b.balance || 0) === 0)
        ? 'Settled'
        : 'Pending');

      const paymentDate = b.createdAt || (b.checkIn ? new Date(b.checkIn) : new Date());

      const query = {
        $or: [
          { bookingId: cleanBookingId },
          ...(rawId ? [{ bookingId: rawId }] : []),
          ...(b.bookingId ? [{ bookingId: b.bookingId }] : [])
        ]
      };
      const existingList = await Payment.find(query);

      if (!existingList || existingList.length === 0) {
        await Payment.create({
          bookingId: cleanBookingId,
          guestName,
          roomNumber,
          amount: amount > 0 ? amount : 3500,
          originalAmount,
          discountAmount,
          couponCode,
          paidAmount,
          paymentMethod,
          status,
          propertyId: b.propertyId || propId || 'HS-9HQ8P',
          createdAt: paymentDate
        });
      } else {
        const existing = existingList[0];
        // Clean up duplicate payment records if any
        if (existingList.length > 1) {
          for (let i = 1; i < existingList.length; i++) {
            await Payment.findByIdAndDelete(existingList[i]._id);
          }
        }
        let needsUpdate = false;
        if (existing.bookingId !== cleanBookingId) { existing.bookingId = cleanBookingId; needsUpdate = true; }
        if (amount > 0 && existing.amount !== amount) { existing.amount = amount; needsUpdate = true; }
        if (originalAmount > 0 && existing.originalAmount !== originalAmount) { existing.originalAmount = originalAmount; needsUpdate = true; }
        if (discountAmount !== undefined && existing.discountAmount !== discountAmount) { existing.discountAmount = discountAmount; needsUpdate = true; }
        if (couponCode !== undefined && existing.couponCode !== couponCode) { existing.couponCode = couponCode; needsUpdate = true; }
        if (paidAmount !== undefined && existing.paidAmount !== paidAmount) { existing.paidAmount = paidAmount; needsUpdate = true; }
        if (roomNumber && existing.roomNumber !== roomNumber) { existing.roomNumber = roomNumber; needsUpdate = true; }
        if (guestName && guestName !== 'Guest' && existing.guestName !== guestName) { existing.guestName = guestName; needsUpdate = true; }
        if (status && existing.status !== status) { existing.status = status; needsUpdate = true; }
        if (paymentDate && existing.createdAt && Math.abs(new Date(existing.createdAt).getTime() - new Date(paymentDate).getTime()) > 1000) {
          existing.createdAt = paymentDate;
          needsUpdate = true;
        }
        if (needsUpdate) await existing.save();
      }
    }
  } catch (err) {
    console.error("Payment sync error:", err.message);
  }
};

router.get('/payments', async (req, res) => {
  try {
    const propId = req.user?.propertyId || 'HS-9HQ8P';
    await ensureRealPayments(propId);
    let payments = await Payment.find({
      $or: [{ propertyId: propId }, { propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }]
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
    const propertyId = req.user?.propertyId || 'HS-9HQ8P';
    if (!guestName || amount === undefined) {
      return sendError(res, 400, 'guestName and amount are required.');
    }
    const cleanBookingId = bookingId || `BK-${Math.floor(100000 + Math.random() * 900000)}`;
    const newPayment = await Payment.create({
      bookingId: cleanBookingId,
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
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    if (isObjectId) {
      payment = await Payment.findByIdAndUpdate(id, updateData, { new: true });
    } else {
      payment = await Payment.findOneAndUpdate({ bookingId: id }, updateData, { new: true }) ||
                await Payment.findOneAndUpdate({ _id: id }, updateData, { new: true });
    }

    if (!payment) {
      payment = await Payment.findOneAndUpdate({}, updateData, { new: true });
    }

    const io = req.app.get('socketio');
    if (io) {
      const propId = payment?.propertyId || req.user?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, propId, 'payment_updated', { payment, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'payment_updated' });
    }

    return sendSuccess(res, 200, payment, 'Payment record updated successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.delete('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    let deleted;
    if (isObjectId) {
      deleted = await Payment.findByIdAndDelete(id);
    } else {
      deleted = await Payment.findOneAndDelete({ bookingId: id });
    }

    const io = req.app.get('socketio');
    if (io) {
      const propId = req.user?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, propId, 'payment_updated', { id, deleted: true, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'payment_deleted' });
    }

    return sendSuccess(res, 200, deleted, 'Payment record removed.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 10. NOTIFICATIONS
// ==========================================
router.get('/notifications', async (req, res) => {
  try {
    const propertyId = req.user.propertyId || 'HS-9HQ8P';
    setImmediate(() => {
      seedDefaultNotifications(propertyId).catch(() => {});
      syncManagerBookingNotifications(propertyId).catch(() => {});
    });

    // Fetch from both Notification and ManagerNotification with fallback property coverage
    const propQuery = [
      { role: 'manager' },
      { role: 'all' },
      { role: null },
      { userId: req.user.id || req.user._id },
      { propertyId },
      { propertyId: 'HS-9HQ8P' },
      { propertyId: 'HS-9HQ8P' }
    ];

    const [standardList, managerList] = await Promise.all([
      Notification.find({ $or: propQuery }).sort({ createdAt: -1 }).lean().limit(100),
      ManagerNotification.find().sort({ createdAt: -1 }).lean().limit(100)
    ]);

    // Map and merge with robust deduplication
    const itemsMap = new Map();
    const normalize = (it) => {
      const id = it._id ? String(it._id) : (it.id ? String(it.id) : '');
      const cleanTitle = (it.title || '').trim().toLowerCase();
      const cleanMsg = (it.message || '').trim().toLowerCase();
      const key = `${cleanTitle}_${cleanMsg}`;
      return {
        id,
        _id: id,
        title: it.title,
        message: it.message,
        category: it.category || 'General',
        isRead: Boolean(it.isRead),
        propertyId: it.propertyId || propertyId,
        createdAt: it.createdAt || new Date().toISOString(),
        updatedAt: it.updatedAt || new Date().toISOString(),
        _dedupKey: key
      };
    };

    for (const it of standardList || []) {
      const norm = normalize(it);
      itemsMap.set(norm._dedupKey || norm.id, norm);
    }
    for (const it of managerList || []) {
      const norm = normalize(it);
      const key = norm._dedupKey || norm.id;
      if (itemsMap.has(key)) {
        // If either collection marked this notification as read, treat as read!
        const existing = itemsMap.get(key);
        if (norm.isRead || existing.isRead) {
          existing.isRead = true;
        }
      } else {
        itemsMap.set(key, norm);
      }
    }

    const mergedList = Array.from(itemsMap.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sendSuccess(res, 200, mergedList, 'Manager system alerts feed logs retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

const handleMarkNotificationRead = async (req, res) => {
  try {
    const id = req.params.id;
    const { title: reqTitle, message: reqMsg } = req.body || {};
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    // Find in either collection
    const [doc1, doc2] = await Promise.all([
      ManagerNotification.findOne({ $or: idQuery }).catch(() => null),
      Notification.findOne({ $or: idQuery }).catch(() => null)
    ]);

    const targetDoc = doc1 || doc2;
    const title = targetDoc?.title || reqTitle;
    const message = targetDoc?.message || reqMsg;

    // Update in both collections by ID
    const updatePromises = [
      ManagerNotification.updateMany({ $or: idQuery }, { isRead: true }).catch(() => null),
      Notification.updateMany({ $or: idQuery }, { isRead: true }).catch(() => null)
    ];

    // If title & message are known, sync any twin records across both collections
    if (title && message) {
      updatePromises.push(
        ManagerNotification.updateMany({ title, message }, { isRead: true }).catch(() => null),
        Notification.updateMany({ title, message }, { isRead: true }).catch(() => null)
      );
    }

    await Promise.all(updatePromises);

    const io = req.app.get('socketio');
    if (io) {
      const propId = req.user?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, propId, 'unread_notifications_count_updated', { propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'notification_read', id });
    }

    return sendSuccess(res, 200, { id, isRead: true }, 'Notification marked as read.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.post('/notifications/:id/read', handleMarkNotificationRead);
router.patch('/notifications/:id/read', handleMarkNotificationRead);
router.put('/notifications/:id/read', handleMarkNotificationRead);

const handleMarkNotificationUnread = async (req, res) => {
  try {
    const id = req.params.id;
    const { title: reqTitle, message: reqMsg } = req.body || {};
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    const [doc1, doc2] = await Promise.all([
      ManagerNotification.findOne({ $or: idQuery }).catch(() => null),
      Notification.findOne({ $or: idQuery }).catch(() => null)
    ]);

    const targetDoc = doc1 || doc2;
    const title = targetDoc?.title || reqTitle;
    const message = targetDoc?.message || reqMsg;

    const updatePromises = [
      ManagerNotification.updateMany({ $or: idQuery }, { isRead: false }).catch(() => null),
      Notification.updateMany({ $or: idQuery }, { isRead: false }).catch(() => null)
    ];

    if (title && message) {
      updatePromises.push(
        ManagerNotification.updateMany({ title, message }, { isRead: false }).catch(() => null),
        Notification.updateMany({ title, message }, { isRead: false }).catch(() => null)
      );
    }

    await Promise.all(updatePromises);

    const io = req.app.get('socketio');
    if (io) {
      const propId = req.user?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, propId, 'unread_notifications_count_updated', { propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'notification_unread', id });
    }

    return sendSuccess(res, 200, { id, isRead: false }, 'Notification marked as unread.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.post('/notifications/:id/unread', handleMarkNotificationUnread);
router.patch('/notifications/:id/unread', handleMarkNotificationUnread);
router.put('/notifications/:id/unread', handleMarkNotificationUnread);

const handleMarkAllNotificationsRead = async (req, res) => {
  try {
    const propertyId = req.user?.propertyId || 'HS-9HQ8P';
    const propQuery = [
      { propertyId },
      { propertyId: 'HS-9HQ8P' },
      { propertyId: 'HS-9HQ8P' },
      { propertyId: { $exists: false } },
      { propertyId: null },
      { propertyId: '' },
      { role: 'manager' },
      { role: 'admin' },
      { userId: req.user?.id || req.user?._id }
    ];

    await Promise.all([
      ManagerNotification.updateMany(
        { isRead: false },
        { isRead: true }
      ).catch(() => null),
      Notification.updateMany(
        {
          isRead: false,
          $or: propQuery
        },
        { isRead: true }
      ).catch(() => null)
    ]);

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propertyId, 'unread_notifications_count_updated', { propertyId });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'all_notifications_read' });
    }

    return sendSuccess(res, 200, null, 'All notifications marked as read.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.post('/notifications/read-all', handleMarkAllNotificationsRead);
router.patch('/notifications/read-all', handleMarkAllNotificationsRead);
router.put('/notifications/read-all', handleMarkAllNotificationsRead);

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

    const bStatus = String(booking.status || '').toLowerCase().trim();
    if (['checked-out', 'checked out', 'completed', 'cancelled'].includes(bStatus)) {
      return sendError(res, 400, 'Cannot extend stay for a checked-out reservation.');
    }


    const newAmount = Number(booking.totalAmount || booking.amount || 0) + Number(additionalAmount || 0);
    const updated = await Booking.findOneAndUpdate(
      { $or: bookingQuery },
      {
        checkOut: newCheckOut,
        nights: Number(booking.nights || 1) + Number(additionalNights),
        amount: newAmount,
        totalAmount: newAmount,
        netAmount: newAmount,
        balance: Number(booking.balance || 0) + Number(additionalAmount || 0)
      },
      { new: true }
    );

    // Trigger notifications for all stakeholders including guest
    await notifyBookingEvent({
      req,
      action: 'extended',
      booking: updated
    });

    return sendSuccess(res, 200, updated, 'Stay reservation extended successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.put('/reservations/:id/extend', handleExtendReservation);
router.post('/reservations/:id/extend', handleExtendReservation);

export default router;
