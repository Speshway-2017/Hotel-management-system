import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import Property from '../models/property.model.js';
import bcrypt from 'bcryptjs';
import Notification from '../models/notification.model.js';
import {
  Room,
  Payment,
  ReceptionistNotification,
  Feedback
} from '../models/managerData.model.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from '../utils/socketEmitter.js';
import { findPropertySafely } from '../utils/propertyCache.js';
import { isToday, calculateStayNights } from '../utils/dateUtils.js';
import { getUnifiedFeedbacksAndReviews } from '../utils/unifiedFeedback.helper.js';
import { extractRoomNumber, syncRoomStatus } from '../utils/roomHelper.js';
import { triggerNotification, notifyBookingEvent } from '../utils/notification.helper.js';

import mongoose from 'mongoose';

const router = express.Router();

// Helper to query booking by ObjectId, bookingId string, or id string safely
const findBookingById = async (id, propertyId) => {
  if (!id) return null;
  const queries = [
    { bookingId: id },
    { id: id }
  ];
  if (mongoose.Types.ObjectId.isValid(id)) {
    queries.unshift({ _id: id });
  }
  const propQuery = propertyId ? { propertyId } : {};
  return await Booking.findOne({ $and: [{ $or: queries }, propQuery] });
};

// All receptionist routes are protected and restricted to receptionist / admin / manager role
router.use(protect);
router.use(authorize('receptionist', 'admin', 'super-admin', 'manager'));

// ==========================================
// PROPERTY DETAILS
// ==========================================
router.get('/property', async (req, res) => {
  try {
    const property = await findPropertySafely(req.user?.propertyId, req.user);
    if (!property) {
      return sendError(res, 404, 'Property profile not found');
    }
    return sendSuccess(res, 200, property, 'Assigned property profile retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// Helper to seed default receptionist notifications if empty
const seedDefaultReceptionistNotifications = async (propertyId) => {
  const count = await ReceptionistNotification.countDocuments({});
  if (count === 0) {
    const defaults = [
      {
        title: "New Reservation Received",
        message: "Booking BK-10101 confirmed via MakeMyTrip for Standard Room.",
        category: "New reservations",
        isRead: false,
        propertyId: propertyId || 'HS-JAI'
      },
      {
        title: "Room Overdue Check-out",
        message: "Room 101 occupied by Mounika is scheduled for departure check-out.",
        category: "Upcoming check-ins/check-outs",
        isRead: false,
        propertyId: propertyId || 'HS-JAI'
      },
      {
        title: "Incidentals Surcharge Added",
        message: "Recorded ₹450 laundry service POS charge to Room 101.",
        category: "Payment updates",
        isRead: false,
        propertyId: propertyId || 'HS-JAI'
      }
    ];
    await ReceptionistNotification.insertMany(defaults);
  }
};

// Permanent synchronizer: ensures all bookings in database have matching receptionist notifications
const syncReceptionistBookingNotifications = async (propertyId) => {
  try {
    const allBookings = await Booking.find({}).sort({ createdAt: -1 });
    for (const b of allBookings) {
      const bId = b.bookingId || String(b._id) || b.id;
      const guestName = b.guest || b.guestName || b.customerName || 'Guest';
      const roomInfo = b.room || b.roomType || 'Standard Room';
      const checkIn = b.checkIn || b.checkInDate || 'Today';
      const checkOut = b.checkOut || b.checkOutDate || 'Tomorrow';
      const amount = b.totalAmount || b.amount || 0;
      const targetProp = b.propertyId || propertyId || 'HS-9HQ8P';

      const title = 'New Online Reservation';
      const message = `Guest ${guestName} booked ${roomInfo} (${checkIn} → ${checkOut}) for ₹${amount}. [Ref: #${bId}]`;

      let existsInReceptionist = null;
      try {
        existsInReceptionist = await ReceptionistNotification.findOne({
          $or: [
            { message: { $regex: bId, $options: 'i' } },
            { title: { $regex: bId, $options: 'i' } }
          ]
        });
      } catch (_) {}

      if (!existsInReceptionist) {
        try {
          await ReceptionistNotification.create({
            title,
            message,
            category: 'New reservations',
            isRead: false,
            propertyId: targetProp,
            createdAt: b.createdAt || new Date()
          });
        } catch (_) {}
      }

      let existsInNotif = null;
      try {
        existsInNotif = await Notification.findOne({
          role: 'receptionist',
          $or: [
            { message: { $regex: bId, $options: 'i' } },
            { title: { $regex: bId, $options: 'i' } }
          ]
        });
      } catch (_) {}

      if (!existsInNotif) {
        try {
          await Notification.create({
            role: 'receptionist',
            propertyId: targetProp,
            title,
            message,
            category: 'Reservations',
            isRead: false,
            createdAt: b.createdAt || new Date()
          });
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('Error syncing receptionist booking notifications:', err.message);
  }
};

// ==========================================
// 1. DASHBOARD ANALYTICS & LISTS
// ==========================================
router.get('/dashboard', async (req, res) => {
  try {
    const propertyId = req.user.propertyId || 'HS-JAI';
    const propFilter = { $or: [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }] };

    // 1. Fetch rooms and compile room counts
    const rooms = await Room.find(propFilter);

    // 2. Fetch arrivals and departures from bookings
    const bookings = await Booking.find(propFilter).sort({ createdAt: -1 });

    const totalRevenue = bookings
      .filter(b => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (Number(b.amount) || Number(b.totalAmount) || 0), 0);

    // Arrivals: Incoming stays for today / pending check-in (check-in date is today)
    const arrivals = bookings.filter(b => isToday(b.checkIn) && (b.status === 'Confirmed' || b.status === 'Paid' || b.status === 'Pending' || b.status === 'Pre-checked'));
    const arrivalsList = arrivals.map(b => {
      const match = String(b.room || "").match(/\b\d{3,4}\b/);
      const rmNum = b.roomNumber || (match ? match[0] : (b.roomId && !isNaN(b.roomId) ? String(b.roomId) : 'Unassigned'));
      const rmType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : 'Standard Room');
      return {
        id: b.bookingId || b.id || b._id,
        _id: b._id || b.id || b.bookingId,
        bookingId: b.bookingId || b.id || b._id,
        name: b.guest || b.name || 'Guest',
        guest: b.guest || b.name || 'Guest',
        phone: b.phone || '--',
        email: b.email || `${(b.guest || 'guest').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        room: rmNum,
        roomNumber: rmNum,
        type: rmType,
        roomType: rmType,
        time: b.checkIn || 'Today',
        checkIn: b.checkIn || 'Today',
        checkOut: b.checkOut || 'Tomorrow',
        source: b.source || 'Direct Web',
        status: b.status === 'Confirmed' ? 'Pre-checked' : b.status,
        amount: Number(b.amount || b.totalAmount || 0),
        balance: Number(b.balance || 0)
      };
    });

    // Departures: Stays scheduled for departure today (check-out date is today)
    const departures = bookings.filter(b => isToday(b.checkOut) && (b.status === 'Checked-in' || b.status === 'Checked In' || b.status === 'Staying' || b.status === 'Checked-out' || b.status === 'Checked Out'));
    const departuresList = departures.map(b => {
      const match = String(b.room || "").match(/\b\d{3,4}\b/);
      const rmNum = b.roomNumber || (match ? match[0] : (b.roomId && !isNaN(b.roomId) ? String(b.roomId) : 'Unassigned'));
      const rmType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : 'Standard Room');
      return {
        id: b.bookingId || b.id || b._id,
        _id: b._id || b.id || b.bookingId,
        bookingId: b.bookingId || b.id || b._id,
        name: b.guest || b.name || 'Guest',
        guest: b.guest || b.name || 'Guest',
        phone: b.phone || '--',
        email: b.email || `${(b.guest || 'guest').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        room: rmNum,
        roomNumber: rmNum,
        type: rmType,
        roomType: rmType,
        time: b.checkOut || 'Today',
        checkOut: b.checkOut || 'Today',
        checkIn: b.checkIn || 'Today',
        balance: b.balance !== undefined ? Number(b.balance) : 0,
        amount: Number(b.amount || b.totalAmount || 0),
        status: (b.status === 'Checked-out' || b.status === 'Checked Out') ? 'Checked Out' : (Number(b.balance || 0) > 0 ? 'Pending Balance' : 'Ready')
      };
    });

    const inStayCount = bookings.filter(b => b.status === 'Checked-in' || b.status === 'Checked In' || b.status === 'Staying').length;
    const occupiedCount = inStayCount;
    const reservedCount = bookings.filter(b => (b.status === 'Confirmed' || b.status === 'Paid' || b.status === 'Pending' || b.status === 'Pre-checked') && b.status !== 'Checked-in' && b.status !== 'Checked-out' && b.status !== 'Cancelled').length;
    const dirtyCount = rooms.filter(r => r.status === 'Dirty').length;
    const cleaningCount = rooms.filter(r => r.status === 'Cleaning').length;
    const oooCount = rooms.filter(r => r.status === 'Out of Order').length;
    const blockedCount = rooms.filter(r => r.status === 'Blocked').length;
    const totalRoomsCount = rooms.length > 0 ? rooms.length : 14;
    const availableCount = Math.max(0, totalRoomsCount - occupiedCount - reservedCount - oooCount - blockedCount);

    const stats = {
      available: availableCount,
      occupied: occupiedCount,
      reserved: reservedCount,
      inStay: inStayCount,
      dirty: dirtyCount,
      cleaning: cleaningCount,
      ooo: oooCount,
      blocked: blockedCount,
      totalRevenue: totalRevenue
    };

    return sendSuccess(res, 200, {
      stats,
      arrivals: arrivalsList,
      departures: departuresList
    }, 'Receptionist Dashboard metrics loaded.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 2. IN-HOUSE GUESTS CRM
// ==========================================
router.get('/guests', async (req, res) => {
  try {
    const propId = req.user?.propertyId;
    let query = {
      $or: [{ propertyId: propId || 'HS-JAI' }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }],
      status: { $in: ['Checked-in', 'Checked In', 'Staying'] }
    };
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    
    const guestList = bookings.map(b => {
      const match = String(b.room || "").match(/\b\d{3,4}\b/);
      const rmNum = b.roomNumber || (match ? match[0] : (b.roomId && !isNaN(b.roomId) ? String(b.roomId) : 'Unassigned'));
      const rmCategory = b.roomType || b.category || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : 'Standard Room');
      const guestName = b.guest || b.guestName || 'Guest';

      return {
        id: b.bookingId || b.id || b._id,
        _id: b._id || b.id || b.bookingId,
        bookingId: b.bookingId || b.id || b._id,
        name: guestName,
        guest: guestName,
        phone: b.phone || '--',
        email: b.email || `${guestName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        room: rmNum,
        roomNumber: rmNum,
        roomType: rmCategory,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        duration: `${b.nights || 1} Nights`,
        pax: b.pax || `${b.adults || 2} Adults`,
        balance: b.balance !== undefined ? Number(b.balance) : 0,
        amount: Number(b.amount || b.totalAmount || 0),
        paymentStatus: Number(b.balance || 0) === 0 || b.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
        status: b.status === 'Checked-in' || b.status === 'Checked In' ? 'Staying' : (b.status || 'Staying'),
        vipTier: 'Gold Elite',
        specialRequests: b.specialRequests || b.notes || 'None',
        timeline: [
          { time: b.checkIn || 'Recent', action: `Guest booking status: ${b.status}` }
        ]
      };
    });

    return sendSuccess(res, 200, guestList, 'In-house guests list compiled.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Post incidentals charge
router.post('/guests/:id/charge', async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || isNaN(amount)) {
      return sendError(res, 400, 'Valid numeric charge amount required.');
    }
    
    const booking = await findBookingById(req.params.id, req.user.propertyId || 'HS-JAI');
    if (!booking) {
      return sendError(res, 404, 'Guest stay record not found.');
    }

    const updated = await Booking.findByIdAndUpdate(booking.id || booking._id, {
      amount: Number(booking.amount) + Number(amount),
      balance: Number(booking.balance) + Number(amount)
    }, { new: true });

    // Trigger notification
    await triggerNotification({
      role: 'manager',
      propertyId: req.user.propertyId || 'HS-JAI',
      title: 'Incidental Charge Posted',
      message: `Charge of ₹${amount} (${description || 'laundry/restaurant service'}) posted to guest ${booking.guest}'s folio.`,
      category: 'General'
    });

    return sendSuccess(res, 200, updated, `Incidentals charge of ₹${amount} posted successfully.`);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Extend guest stay
const handleReceptionistExtendStay = async (req, res) => {
  try {
    const { days, newCheckOut, additionalNights, additionalAmount } = req.body;
    
    const booking = await findBookingById(req.params.id, req.user.propertyId || 'HS-JAI');
    if (!booking) {
      return sendError(res, 404, 'Guest stay record not found.');
    }

    let calculatedNights = additionalNights !== undefined ? Number(additionalNights) : Number(days);
    if (!calculatedNights || isNaN(calculatedNights) || calculatedNights <= 0) {
      return sendError(res, 400, 'Valid stay extension nights/days required.');
    }

    let calculatedCheckOut = newCheckOut;
    if (!calculatedCheckOut) {
      const currentOut = new Date(booking.checkOut);
      const nextDate = new Date(currentOut.getTime() + (calculatedNights * 24 * 60 * 60 * 1000));
      calculatedCheckOut = nextDate.toDateString();
    }

    const addAmount = additionalAmount !== undefined ? Number(additionalAmount) : 0;

    const updated = await Booking.findByIdAndUpdate(booking.id || booking._id, {
      nights: Number(booking.nights || 1) + calculatedNights,
      checkOut: calculatedCheckOut,
      amount: Number(booking.amount || 0) + addAmount,
      balance: Number(booking.balance || 0) + addAmount
    }, { new: true });

    // Trigger notification
    await triggerNotification({
      role: 'manager',
      propertyId: booking.propertyId || req.user.propertyId || 'HS-JAI',
      title: 'Stay Extended',
      message: `Stay extended by ${calculatedNights} night(s) for guest ${booking.guest}. New checkout: ${updated.checkOut}.`,
      category: 'Operations'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, booking.propertyId || req.user.propertyId || 'HS-JAI', 'booking_updated', {
        action: 'extend',
        booking: updated,
        bookingId: updated._id,
        checkOut: updated.checkOut
      });
    }

    return sendSuccess(res, 200, updated, 'Stay duration extended successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.post('/guests/:id/extend', handleReceptionistExtendStay);
router.put('/reservations/:id/extend', handleReceptionistExtendStay);
router.post('/reservations/:id/extend', handleReceptionistExtendStay);

// ==========================================
// 3. ROOM STATUS
// ==========================================
router.get('/rooms', async (req, res) => {
  try {
    const propertyId = req.user.propertyId || 'HS-JAI';
    const { checkIn, checkOut } = req.query;
    let rooms = await Room.find({ $or: [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }] }).sort({ roomNumber: 1 });
    if (!rooms || rooms.length === 0) {
      rooms = await Room.find().sort({ roomNumber: 1 });
    }
    
    // Fetch all active bookings across propertyId or global
    const bookings = await Booking.find({
      $or: [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }],
      status: { $in: ['Confirmed', 'Paid', 'Pending', 'Checked-in'] }
    });
    
    const parseTime = (dateStr) => {
      if (!dateStr) return null;
      const t = new Date(dateStr).getTime();
      return isNaN(t) ? null : t;
    };

    const reqIn = parseTime(checkIn);
    const reqOut = parseTime(checkOut);

    const roomsList = rooms.map(r => {
      const activeCheckIn = bookings.find(b => (b.status === 'Checked-in' || b.status === 'Checked In' || b.status === 'Staying') && (
        (b.roomId && (String(b.roomId) === String(r._id) || String(b.roomId) === String(r.roomNumber))) ||
        (b.roomNumber && String(b.roomNumber).trim() === String(r.roomNumber).trim()) ||
        (b.room && String(b.room).match(/\b\d{3,4}\b/)?.[0] === String(r.roomNumber).trim()) ||
        (b.room && String(b.room).includes(String(r.roomNumber)))
      ));
      
      let isReservedForDates = false;
      let reservedBooking = null;

      // Find any confirmed reservation linked to this room
      reservedBooking = bookings.find(b => {
        if (b.status === 'Cancelled' || b.status === 'Checked-out' || b.status === 'No-show') return false;
        
        const bRoomNum = b.roomNumber || (b.roomId && !isNaN(b.roomId) ? String(b.roomId) : null) || (b.room ? b.room.match(/\b\d{3,4}\b/)?.[0] : null);
        const matchesRoom = (b.roomId && String(b.roomId) === String(r._id)) || 
                            (bRoomNum && String(bRoomNum).trim() === String(r.roomNumber).trim()) ||
                            (b.room && String(b.room).includes(String(r.roomNumber)));
        if (!matchesRoom) return false;

        const bIn = parseTime(b.checkIn);
        const bOut = parseTime(b.checkOut);

        if (reqIn && reqOut && bIn && bOut) {
          return (reqIn < bOut && reqOut > bIn);
        }

        return true;
      });

      if (reservedBooking && !activeCheckIn) {
        isReservedForDates = true;
      }

      // Compute display status
      let displayStatus = r.status || 'Available';
      if (activeCheckIn) {
        displayStatus = 'Occupied';
      } else if (isReservedForDates || r.status === 'Reserved' || (reservedBooking && ['Confirmed', 'Paid', 'Pending', 'Pre-checked'].includes(reservedBooking.status))) {
        displayStatus = 'Reserved';
      }

      return {
        id: r._id ? String(r._id) : r.id,
        _id: r._id ? String(r._id) : r.id,
        room: r.roomNumber,
        roomNumber: r.roomNumber,
        floor: `Floor ${r.roomNumber ? String(r.roomNumber)[0] : '1'}`,
        roomType: r.category,
        category: r.category,
        status: displayStatus,
        operationalStatus: r.status || 'Available',
        isReserved: isReservedForDates,
        isAvailable: (r.status === 'Available' || !r.status) && !isReservedForDates && !activeCheckIn,
        housekeeping: r.status === 'Dirty' ? 'Dirty' : 'Inspected',
        guest: activeCheckIn ? activeCheckIn.guest : (reservedBooking ? reservedBooking.guest : ''),
        checkIn: activeCheckIn ? activeCheckIn.checkIn : (reservedBooking ? reservedBooking.checkIn : ''),
        checkOut: activeCheckIn ? activeCheckIn.checkOut : (reservedBooking ? reservedBooking.checkOut : ''),
        bookingRef: activeCheckIn ? (activeCheckIn.bookingId || activeCheckIn._id) : (reservedBooking ? (reservedBooking.bookingId || reservedBooking._id) : null),
        notes: activeCheckIn ? `Occupied by guest ${activeCheckIn.guest} (Checkout: ${activeCheckIn.checkOut}).` : (isReservedForDates ? `Reserved for guest ${reservedBooking?.guest} (${reservedBooking?.checkIn} → ${reservedBooking?.checkOut}).` : 'No special alerts.')
      };
    });

    return sendSuccess(res, 200, roomsList, 'Room status rack lists loaded.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Update room status
router.put('/rooms/:roomNumber/status', async (req, res) => {
  try {
    const { status, housekeeping } = req.body;
    const propertyId = req.user.propertyId || 'HS-JAI';

    const updateData = {};
    if (status) updateData.status = status;
    if (housekeeping) {
      if (housekeeping === 'Dirty') updateData.status = 'Dirty';
      else if (housekeeping === 'Inspected') updateData.status = 'Available';
    }

    const updated = await Room.findOneAndUpdate(
      { roomNumber: req.params.roomNumber, propertyId },
      updateData,
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Room not found.');
    }

    // Trigger notifications
    await triggerNotification({
      role: 'manager',
      propertyId,
      title: 'Room Status Changed',
      message: `Room ${req.params.roomNumber} status updated to: ${status || housekeeping}.`,
      category: 'Maintenance'
    });
    await triggerNotification({
      role: 'receptionist',
      propertyId,
      title: 'Room Status Changed',
      message: `Room ${req.params.roomNumber} status updated to: ${status || housekeeping}.`,
      category: 'Maintenance'
    });

    // Notify Realtime (Socket.io)
    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propertyId, 'room_status_changed', { propertyId, roomNumber: req.params.roomNumber, status: updated.status });
      emitRealtimeSync(io, propertyId, 'availability_changed', { propertyId, roomNumber: req.params.roomNumber });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'room_status_changed' });
    }

    return sendSuccess(res, 200, updated, 'Room status updated successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 4. RESERVATIONS
// ==========================================
router.get('/reservations', async (req, res) => {
  try {
    const propertyId = req.user.propertyId || 'HS-JAI';
    const bookings = await Booking.find({
      $or: [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }]
    }).sort({ createdAt: -1 });

    const list = bookings.map(b => ({
      id: b.bookingId || b.id || b._id,
      _id: b._id || b.id || b.bookingId,
      bookingId: b.bookingId || b.id || b._id,
      name: b.guest,
      guest: b.guest,
      phone: b.phone || '--',
      email: b.email || `${b.guest.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      room: b.room ? b.room.split(' ')[0] : 'TBD',
      roomType: b.roomType || (b.room ? b.room.split('·')[1]?.trim() || 'Deluxe Room' : 'Deluxe Room'),
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      nights: b.nights || 1,
      pax: b.pax || '2 Adults',
      source: b.source || 'Direct Web',
      status: b.status,
      amount: b.amount,
      balance: b.balance,
      paymentStatus: b.balance === 0 ? 'Paid' : 'Pending',
      specialRequests: b.specialRequests || 'High floor preference.',
      timeline: [
        { time: b.createdAt, action: 'Reservation created successfully.' }
      ]
    }));

    return sendSuccess(res, 200, list, 'Reservations retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Create new reservation
router.post('/reservations', async (req, res) => {
  try {
    const { guest, phone, email, room, roomId, checkIn, checkOut, nights, pax, source, amount, balance } = req.body;
    const propertyId = req.user.propertyId || 'HS-JAI';

    if (!guest || !checkIn || !checkOut || !amount) {
      return sendError(res, 400, 'Guest, checkIn, checkOut, and amount are required.');
    }

    // Overlapping Date Availability Check
    const newCheckIn = new Date(checkIn).getTime();
    const newCheckOut = new Date(checkOut).getTime();

    let assignedRoomId = roomId || null;
    const roomNum = req.body.roomNumber || (room ? String(room).match(/\b\d{3,4}\b/)?.[0] : null);
    const roomType = req.body.roomType || (room && room.includes('·') ? room.split('·')[1]?.trim() : (room || 'Standard Room'));
    const roomString = roomNum ? `${roomNum} · ${roomType}` : (room || `${roomType}`);
    const bookingStatus = req.body.status || (source === 'Walk-in' && isToday(checkIn) ? 'Checked-in' : 'Confirmed');

    if (roomNum || assignedRoomId) {
      const existingBookings = await Booking.find({
        propertyId,
        status: { $in: ['Confirmed', 'Paid', 'Pending', 'Checked-in'] }
      });

      const isOverlapping = existingBookings.some(b => {
        if (b.status === 'Cancelled' || b.status === 'Checked-out' || b.status === 'No-show') return false;
        const bRoomNum = b.roomId || (b.room ? b.room.match(/\b\d{3,4}\b/)?.[0] : null);
        const sameRoom = (roomNum && bRoomNum === roomNum) || (assignedRoomId && b.roomId === assignedRoomId);
        if (!sameRoom) return false;

        const bIn = new Date(b.checkIn).getTime();
        const bOut = new Date(b.checkOut).getTime();
        return (newCheckIn < bOut && newCheckOut > bIn);
      });

      if (isOverlapping) {
        return sendError(res, 400, `Room ${roomNum || ''} is already reserved for the selected dates.`);
      }
    }

    // Check if an existing Guest Account already exists for this guest
    let guestId = null;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();

    if (cleanEmail || cleanPhone) {
      const query = [];
      if (cleanEmail) query.push({ email: cleanEmail });
      if (cleanPhone) query.push({ mobile: cleanPhone });
      const existingGuest = await User.findOne({ $or: query, role: 'guest' });
      if (existingGuest) {
        guestId = existingGuest._id || existingGuest.id;
      }
    }

    const newBooking = await Booking.create({
      guest,
      guestId,
      phone: cleanPhone,
      email: cleanEmail,
      room: roomString,
      roomNumber: roomNum,
      roomType: roomType,
      roomId: assignedRoomId,
      checkIn,
      checkOut,
      nights: calculateStayNights(checkIn, checkOut),
      pax: pax || '2 Adults',
      source: source || 'Walk-in',
      status: bookingStatus,
      amount: Number(amount),
      balance: Number(balance !== undefined ? balance : amount),
      propertyId
    });

    // Update assigned room status in MongoDB
    if (roomNum) {
      const rmStatus = (bookingStatus === 'Checked-in' || bookingStatus === 'Checked In') ? 'Occupied' : 'Reserved';
      await syncRoomStatus(roomNum, rmStatus, propertyId);
    }

    // Trigger Unified Notifications across Web & Mobile consoles
    await notifyBookingEvent({
      req,
      io,
      action: 'created',
      booking: newBooking
    });

    // Notify Realtime (Socket.io)
    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propertyId, 'booking_created', { booking: newBooking, propertyId });
      emitRealtimeSync(io, propertyId, 'booking_updated', { type: 'CREATED', booking: newBooking, propertyId });
      if (roomNum) {
        emitRealtimeSync(io, propertyId, 'room_status_changed', { propertyId, roomNumber: roomNum, status: (bookingStatus === 'Checked-in' || bookingStatus === 'Checked In') ? 'Occupied' : 'Reserved' });
        emitRealtimeSync(io, propertyId, 'availability_changed', { propertyId, roomNumber: roomNum });
      }
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'booking_created' });
    }

    return sendSuccess(res, 201, newBooking, 'Reservation created successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Verify ID proof details for a reservation
router.post('/reservations/:id/verify-id', async (req, res) => {
  try {
    const { idDocType, idDocNumber, idDocImage, idVerification, notes } = req.body;
    const propertyId = req.user.propertyId || 'HS-JAI';

    if (!idDocNumber || !idDocNumber.trim()) {
      return sendError(res, 400, 'ID Document Number is required for verification.');
    }

    const booking = await findBookingById(req.params.id, propertyId);
    if (!booking) {
      return sendError(res, 404, 'Booking not found.');
    }

    const verificationData = {
      idDocType: idDocType || booking.idDocType || 'Aadhaar Card',
      idDocNumber: idDocNumber.trim(),
      idDocImage: idDocImage || booking.idDocImage || '',
      idVerification: idVerification || 'Verified',
      idVerifiedAt: new Date(),
      idVerifiedBy: req.user?.name || req.user?.username || 'Staff'
    };

    const updated = await Booking.findByIdAndUpdate(booking.id || booking._id, verificationData, { new: true });

    // Sync guest profile in User collection if guestId or email matches
    try {
      if (booking.guestId) {
        await User.findByIdAndUpdate(booking.guestId, {
          idDocType: verificationData.idDocType,
          idDocNumber: verificationData.idDocNumber
        });
      } else if (booking.email) {
        await User.findOneAndUpdate({ email: booking.email.toLowerCase() }, {
          idDocType: verificationData.idDocType,
          idDocNumber: verificationData.idDocNumber
        });
      }
    } catch (e) {
      console.warn('Could not sync guest user document:', e.message);
    }

    return sendSuccess(res, 200, updated, 'ID proof successfully verified.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Update status (e.g. check-in, check-out, cancel, no-show)
router.put('/reservations/:id/status', async (req, res) => {
  try {
    const { status, room, idDocType, idDocNumber, idDocImage, idVerification } = req.body;
    const propertyId = req.user.propertyId || 'HS-JAI';

    const booking = await findBookingById(req.params.id, propertyId);
    if (!booking) {
      return sendError(res, 404, 'Booking not found.');
    }

    const isWebsiteBooking = booking.source && booking.source !== 'Walk-in' && !booking.source.toLowerCase().includes('walk-in');

    // Enforce ID proof for website bookings on check-in
    if (status === 'Checked-in' && isWebsiteBooking) {
      const isAlreadyVerified = booking.idVerification === 'Verified';
      const isProvidedNow = (idVerification === 'Verified' || idDocNumber);
      if (!isAlreadyVerified && !isProvidedNow && !req.body.bypassVerification) {
        return sendError(res, 400, 'ID Proof Verification is required before checking in a website booking.');
      }
    }

    const updateData = { status };
    if (idDocNumber) {
      updateData.idDocNumber = idDocNumber.trim();
      updateData.idDocType = idDocType || booking.idDocType || 'Aadhaar Card';
      updateData.idDocImage = idDocImage || booking.idDocImage || '';
      updateData.idVerification = 'Verified';
      updateData.idVerifiedAt = new Date();
      updateData.idVerifiedBy = req.user?.name || req.user?.username || 'Staff';
    } else if (idVerification) {
      updateData.idVerification = idVerification;
    }

    const roomNum = extractRoomNumber(room) || extractRoomNumber(booking);
    if (roomNum) {
      updateData.roomNumber = roomNum;
      updateData.room = room && room.includes('·') ? room : `${roomNum} · ${booking.roomType || 'Standard Room'}`;
    }
    if (status === 'Checked-in' && (!booking.balance || booking.balance === 0)) {
      updateData.paymentStatus = 'Paid';
    }

    const updated = await Booking.findByIdAndUpdate(booking.id || booking._id, updateData, { new: true });

    // Sync operational room status on check-in, check-out, cancel, or no-show
    if (roomNum) {
      let rmStatus = 'Available';
      if (status === 'Checked-in') rmStatus = 'Occupied';
      else if (status === 'Confirmed' || status === 'Pending') rmStatus = 'Reserved';
      else if (status === 'Checked-out') rmStatus = 'Available';
      else if (status === 'Cancelled' || status === 'No-show') rmStatus = 'Available';

      await syncRoomStatus(roomNum, rmStatus, propertyId);
    }

    // Trigger notifications
    await triggerNotification({
      req,
      role: 'manager',
      propertyId,
      title: `Reservation ${status}`,
      message: `Reservation for guest ${booking.guest} has been updated to: ${status} in Room ${roomNum || 'TBD'}.`,
      category: status === 'Cancelled' || status === 'No-show' ? 'Alerts' : 'Operations'
    });
    await triggerNotification({
      req,
      role: 'receptionist',
      propertyId,
      title: `Reservation ${status}`,
      message: `Reservation for guest ${booking.guest} has been updated to: ${status} in Room ${roomNum || 'TBD'}.`,
      category: status === 'Cancelled' || status === 'No-show' ? 'Alerts' : 'Operations'
    });

    if (booking.guestId) {
      await triggerNotification({
        req,
        userId: booking.guestId,
        role: 'guest',
        title: status === 'Checked-in' ? 'Check-in Confirmed!' : (status === 'Checked-out' ? 'Check-out Completed' : `Booking Status: ${status}`),
        message: status === 'Checked-in' 
          ? `Welcome! You have checked in to Room ${roomNum || 'assigned room'}. Enjoy your stay!`
          : (status === 'Checked-out' 
            ? 'Thank you for choosing Hour Stay. We hope you had a pleasant experience!' 
            : `Your reservation status is now ${status}.`),
        category: status === 'Checked-in' || status === 'Checked-out' ? 'Booking Confirmation' : 'General'
      });
    }

    // Notify Realtime (Socket.io) across all dashboards
    const io = req.app.get('socketio');
    if (io) {
      const action = status === 'Checked-in' ? 'checkin' : status === 'Checked-out' ? 'checkout' : 'status_change';
      broadcastCheckinCheckout(io, propertyId, {
        action,
        booking: updated,
        roomNumber: roomNum,
        status
      });
    }

    return sendSuccess(res, 200, updated, `Reservation status marked as ${status}.`);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 5. INVOICES & FOLIOS
// ==========================================
router.get('/folios', async (req, res) => {
  try {
    const propertyId = req.user.propertyId || 'HS-JAI';
    const bookings = await Booking.find({ propertyId });
    
    const folios = bookings.map(b => ({
      id: `FOL-${b.id || b._id}`,
      guestName: b.guest,
      roomNo: b.room ? b.room.split(' ')[0] : 'TBD',
      bookingId: b.id || b._id,
      stayDates: `${b.checkIn} - ${b.checkOut}`,
      totalCharges: b.amount,
      amountPaid: b.amount - b.balance,
      balanceDue: b.balance,
      paymentStatus: b.balance === 0 ? 'Paid' : 'Pending',
      status: b.status === 'Checked-out' ? 'Closed' : 'Active'
    }));

    return sendSuccess(res, 200, folios, 'Guest billing folios index loaded.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.get('/folios/:id', async (req, res) => {
  try {
    const propertyId = req.user.propertyId || 'HS-JAI';
    const booking = await findBookingById(req.params.id, propertyId);
    if (!booking) {
      return sendError(res, 404, 'Folio record not found.');
    }

    const totalPaid = booking.amount - booking.balance;
    const baseTariff = Math.round(booking.amount / 1.18);
    const taxAmount = booking.amount - baseTariff;

    const folioDetail = {
      id: `FOL-${booking.id || booking._id}`,
      guestName: booking.guest,
      roomNo: booking.room ? booking.room.split(' ')[0] : 'TBD',
      roomType: booking.room ? booking.room.split('·')[1]?.trim() || 'Standard' : 'Standard',
      bookingId: booking.id || booking._id,
      stayDates: `${booking.checkIn} - ${booking.checkOut}`,
      totalCharges: booking.amount,
      amountPaid: totalPaid,
      balanceDue: booking.balance,
      paymentStatus: booking.balance === 0 ? 'Paid' : 'Pending',
      status: booking.status === 'Checked-out' ? 'Closed' : 'Active',
      items: [
        { category: "Room Tariff", desc: `${booking.nights} Night stay tariff`, qty: 1, price: baseTariff, tax: taxAmount, total: booking.amount }
      ]
    };

    return sendSuccess(res, 200, folioDetail, 'Folio billing items loaded.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Post charges to folio
router.post('/folios/:id/charges', async (req, res) => {
  try {
    const { amount, description, category } = req.body;
    const propertyId = req.user.propertyId || 'HS-JAI';

    const booking = await findBookingById(req.params.id, propertyId);
    if (!booking) return sendError(res, 404, 'Folio not found.');

    const updated = await Booking.findByIdAndUpdate(booking.id || booking._id, {
      amount: Number(booking.amount) + Number(amount),
      balance: Number(booking.balance) + Number(amount)
    }, { new: true });

    // Trigger notification
    await triggerNotification({
      role: 'manager',
      propertyId,
      title: 'Incidental Charge Posted',
      message: `Charge of ₹${amount} (${description || 'service charge'}) posted to folio for guest ${booking.guest}.`,
      category: 'General'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propertyId, 'booking_updated', { booking: updated, propertyId, action: 'charge_added' });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'charge_added' });
    }

    return sendSuccess(res, 200, updated, 'Incidental charge posted successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// Post payment to folio
router.post('/folios/:id/payments', async (req, res) => {
  try {
    const { amount, method } = req.body;
    const propertyId = req.user.propertyId || 'HS-JAI';

    const booking = await findBookingById(req.params.id, propertyId);
    if (!booking) return sendError(res, 404, 'Folio not found.');

    const newBalance = Math.max(0, booking.balance - amount);
    const updated = await Booking.findByIdAndUpdate(booking.id || booking._id, {
      balance: newBalance
    }, { new: true });

    // Log payment transaction record
    await Payment.create({
      bookingId: booking.id || booking._id,
      guestName: booking.guest,
      amount: Number(amount),
      paymentMethod: method || 'UPI',
      status: 'Settled',
      propertyId
    });

    // Trigger notifications
    await triggerNotification({
      req,
      role: 'manager',
      propertyId,
      title: 'Payment Received',
      message: `Payment of ₹${amount} received from guest ${booking.guest} via ${method || 'UPI'}.`,
      category: 'Payments'
    });
    await triggerNotification({
      req,
      role: 'receptionist',
      propertyId,
      title: 'Payment Received',
      message: `Payment of ₹${amount} received from guest ${booking.guest} via ${method || 'UPI'}.`,
      category: 'Payments'
    });

    if (booking.guestId) {
      await triggerNotification({
        req,
        userId: booking.guestId,
        role: 'guest',
        title: 'Payment Received',
        message: `Payment of ₹${amount} processed successfully via ${method || 'UPI'}.`,
        category: 'Payment Update'
      });
    }

    // Notify Realtime (Socket.io)
    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propertyId, 'payment_logged', { bookingId: booking.id || booking._id, amount, propertyId });
      emitRealtimeSync(io, propertyId, 'booking_updated', { booking: updated, propertyId, action: 'payment' });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'payment_logged' });
    }

    return sendSuccess(res, 200, updated, 'Payment recorded successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 6. PAYMENTS LEDGER
// ==========================================
const ensureRealPayments = async (propId) => {
  try {
    const bookings = await Booking.find({});
    for (const b of bookings) {
      const bId = b.bookingId || (b._id ? String(b._id) : null);
      if (!bId) continue;
      const guestName = b.guest || b.customerName || b.guestName || 'Guest';

      let roomNumber = extractRoomNumber(b) || '101';
      const amount = Number(b.totalAmount || b.amount || 0);
      const paymentMethod = b.paymentMethod || 'UPI';
      const isRefunded = b.paymentStatus === 'Refunded' || b.refundStatus === 'Refunded' || b.refundRequest?.status === 'Refunded';
      const status = isRefunded
        ? 'Refunded'
        : ((b.paymentStatus === 'Paid' || b.status === 'Checked-in' || b.status === 'Checked-out' || Number(b.balance || 0) === 0)
        ? 'Settled'
        : 'Pending');

      const query = {
        $or: [
          { bookingId: bId },
          ...(b.bookingId ? [{ bookingId: b.bookingId }] : []),
          { guestName: guestName, roomNumber: roomNumber }
        ]
      };
      const existingList = await Payment.find(query);

      if (!existingList || existingList.length === 0) {
        await Payment.create({
          bookingId: bId,
          guestName,
          roomNumber,
          amount: amount > 0 ? amount : 3500,
          paymentMethod,
          status,
          propertyId: b.propertyId || propId || 'HS-9HQ8P',
          createdAt: b.createdAt || new Date()
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
        if (amount > 0 && existing.amount !== amount) { existing.amount = amount; needsUpdate = true; }
        if (roomNumber && existing.roomNumber !== roomNumber) { existing.roomNumber = roomNumber; needsUpdate = true; }
        if (guestName && guestName !== 'Guest' && existing.guestName !== guestName) { existing.guestName = guestName; needsUpdate = true; }
        if (status && existing.status !== status) { existing.status = status; needsUpdate = true; }
        if (b.createdAt && existing.createdAt && Math.abs(new Date(existing.createdAt).getTime() - new Date(b.createdAt).getTime()) > 1000) {
          existing.createdAt = b.createdAt;
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
    const propertyId = req.user.propertyId || 'HS-9HQ8P';
    await ensureRealPayments(propertyId);
    let payments = await Payment.find({
      $or: [{ propertyId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }]
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
    const propertyId = req.user.propertyId || 'HS-9HQ8P';
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
      emitRealtimeSync(io, propertyId, 'payment_added', { payment: newPayment, propertyId });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'payment_added' });
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
// 7. NOTIFICATIONS
// ==========================================
router.get('/notifications', async (req, res) => {
  try {
    const propertyId = req.user.propertyId || 'HS-JAI';
    await seedDefaultReceptionistNotifications(propertyId);
    await syncReceptionistBookingNotifications(propertyId);

    const propQuery = [
      { role: 'receptionist' },
      { role: 'all' },
      { role: null },
      { role: { $exists: false } },
      { userId: req.user.id || req.user._id },
      { propertyId },
      { propertyId: 'HS-JAI' },
      { propertyId: 'HS-9HQ8P' },
      { propertyId: { $exists: false } },
      { propertyId: null },
      { propertyId: '' }
    ];

    const [standardList, receptionistList] = await Promise.all([
      Notification.find({ $or: propQuery }),
      ReceptionistNotification.find()
    ]);

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
    for (const it of receptionistList || []) {
      const norm = normalize(it);
      const key = norm._dedupKey || norm.id;
      if (itemsMap.has(key)) {
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

    return sendSuccess(res, 200, mergedList, 'Receptionist system alerts feed retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

const handleMarkReceptionistNotifRead = async (req, res) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    const [updated1, updated2] = await Promise.all([
      ReceptionistNotification.findOneAndUpdate(
        { $or: idQuery },
        { isRead: true },
        { new: true }
      ).catch(() => null),
      Notification.findOneAndUpdate(
        { $or: idQuery },
        { isRead: true },
        { new: true }
      ).catch(() => null)
    ]);

    const updated = updated1 || updated2;
    if (updated?.title && updated?.message) {
      await Promise.all([
        ReceptionistNotification.updateMany({ title: updated.title, message: updated.message }, { isRead: true }).catch(() => null),
        Notification.updateMany({ title: updated.title, message: updated.message }, { isRead: true }).catch(() => null)
      ]);
    }

    const io = req.app.get('socketio');
    if (io) {
      const propertyId = req.user.propertyId || 'HS-JAI';
      emitRealtimeSync(io, propertyId, 'unread_notifications_count_updated', { propertyId });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'receptionist_notification_read', id });
    }

    return sendSuccess(res, 200, updated || { id, isRead: true }, 'Notification marked as read.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.post('/notifications/:id/read', handleMarkReceptionistNotifRead);
router.patch('/notifications/:id/read', handleMarkReceptionistNotifRead);
router.put('/notifications/:id/read', handleMarkReceptionistNotifRead);

const handleMarkReceptionistNotifUnread = async (req, res) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    const [updated1, updated2] = await Promise.all([
      ReceptionistNotification.findOneAndUpdate(
        { $or: idQuery },
        { isRead: false },
        { new: true }
      ).catch(() => null),
      Notification.findOneAndUpdate(
        { $or: idQuery },
        { isRead: false },
        { new: true }
      ).catch(() => null)
    ]);

    const updated = updated1 || updated2;
    if (updated?.title && updated?.message) {
      await Promise.all([
        ReceptionistNotification.updateMany({ title: updated.title, message: updated.message }, { isRead: false }).catch(() => null),
        Notification.updateMany({ title: updated.title, message: updated.message }, { isRead: false }).catch(() => null)
      ]);
    }

    const io = req.app.get('socketio');
    if (io) {
      const propertyId = req.user.propertyId || 'HS-JAI';
      emitRealtimeSync(io, propertyId, 'unread_notifications_count_updated', { propertyId });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'receptionist_notification_unread', id });
    }

    return sendSuccess(res, 200, updated || { id, isRead: false }, 'Notification marked as unread.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.post('/notifications/:id/unread', handleMarkReceptionistNotifUnread);
router.patch('/notifications/:id/unread', handleMarkReceptionistNotifUnread);
router.put('/notifications/:id/unread', handleMarkReceptionistNotifUnread);

const handleMarkAllReceptionistNotifsRead = async (req, res) => {
  try {
    const propertyId = req.user.propertyId || 'HS-JAI';
    await Promise.all([
      ReceptionistNotification.updateMany(
        { isRead: false },
        { isRead: true }
      ),
      Notification.updateMany(
        {
          isRead: false,
          $or: [
            { propertyId },
            { role: 'receptionist' },
            { userId: req.user.id || req.user._id }
          ]
        },
        { isRead: true }
      ).catch(() => null)
    ]);

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propertyId, 'unread_notifications_count_updated', { propertyId });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'all_receptionist_notifications_read' });
    }

    return sendSuccess(res, 200, {}, 'All notifications marked as read.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

router.post('/notifications/read-all', handleMarkAllReceptionistNotifsRead);
router.patch('/notifications/read-all', handleMarkAllReceptionistNotifsRead);
router.put('/notifications/read-all', handleMarkAllReceptionistNotifsRead);

// ==========================================
// 8. PROFILE / CHANGE PASSWORD
// ==========================================
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current password and new password are required.');
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User profile not found.');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 401, 'Current password is incorrect.');
    }

    // Set new password (pre-save hook hashes it automatically)
    user.password = newPassword;
    await user.save();

    return sendSuccess(res, 200, {}, 'Password changed successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// 9. GUEST FEEDBACK / REVIEWS (FRONT DESK)
// ==========================================
router.get('/feedback', async (req, res) => {
  try {
    const propId = req.query.propertyId || req.user?.propertyId;
    const query = (propId && propId !== 'all')
      ? { $or: [{ propertyId: propId }, { propertyId: { $exists: false } }, { propertyId: '' }, { propertyId: 'HS-JAI' }] }
      : {};
    const list = await getUnifiedFeedbacksAndReviews(query);
    return sendSuccess(res, 200, list, 'Guest feedback retrieved successfully from MongoDB.');
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
      category = 'Front Desk Service',
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
      respondedBy: response ? (req.user?.name || 'Front Desk Staff') : '',
      respondedAt: response ? new Date() : null,
      propertyId: propId
    });

    await notifyFeedbackEvent({
      req,
      action: 'created',
      feedback: created,
      actor: req.user?.name || 'Receptionist'
    });

    return sendSuccess(res, 201, created, 'Guest feedback recorded at reception successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/feedback/:id/respond', async (req, res) => {
  try {
    const { response, status } = req.body;
    if (!response) {
      return sendError(res, 400, 'Response message is required.');
    }

    const updateData = {
      response,
      respondedBy: req.user?.name || 'Front Desk Staff',
      respondedAt: new Date(),
      status: status || 'Resolved'
    };

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Feedback record not found.');
    }

    await notifyFeedbackEvent({
      req,
      action: 'responded',
      feedback: updated,
      actor: req.user?.name || 'Front Desk Staff'
    });

    return sendSuccess(res, 200, updated, 'Reception response published successfully.');
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
      actor: req.user?.name || 'Receptionist'
    });

    return sendSuccess(res, 200, updated, `Feedback status updated to ${status}.`);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

export default router;
