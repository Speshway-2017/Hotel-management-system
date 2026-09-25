import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import CMS from '../models/cms.model.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import { Room, ContactMessage, Feedback, Payment } from '../models/managerData.model.js';
import SubscriptionPlan from '../models/subscriptionPlan.model.js';
import Coupon from '../models/coupon.model.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from '../utils/socketEmitter.js';
import { triggerNotification, notifyFeedbackEvent, notifyBookingEvent } from '../utils/notification.helper.js';
import { getUnifiedFeedbacksAndReviews } from '../utils/unifiedFeedback.helper.js';
import { calculateStayNights, parseDateSafe, formatISTDateTime } from '../utils/dateUtils.js';
import { extractRoomNumber, syncRoomStatus } from '../utils/roomHelper.js';
import {
  validateBookingAadhaarConsistency,
  syncVerifiedAadhaarToGuestProfile
} from '../utils/aadhaarValidator.js';

const router = express.Router();

// Helper to identify first-booking welcome coupons
const isWelcomeCoupon = (coupon) => {
  if (!coupon) return false;
  if (coupon.firstBookingOnly === true || coupon.isFirstBookingOnly === true) return true;
  const code = String(coupon.code || '').trim().toUpperCase();
  const title = String(coupon.title || '').trim().toUpperCase();
  const desc = String(coupon.description || '').toLowerCase();
  return (
    code.startsWith('WELCOME') ||
    code.includes('WELCOME') ||
    title.includes('WELCOME') ||
    desc.includes('first booking') ||
    desc.includes('first direct') ||
    desc.includes('first-time') ||
    desc.includes('first stay')
  );
};

// Helper to extract user identity for coupon eligibility
const extractUserIdentity = async (req) => {
  let userId = req.query?.guestId || req.query?.userId || req.body?.guestId || req.body?.userId || null;
  let email = req.query?.email || req.body?.email || null;
  let phone = req.query?.phone || req.body?.phone || null;

  if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
      if (decoded && decoded.id) {
        userId = userId || decoded.id;
        const u = await User.findById(decoded.id).select('email mobile name');
        if (u) {
          email = email || u.email;
          phone = phone || u.mobile;
        }
      }
    } catch (e) {}
  }

  return { userId, email, phone };
};

// Check if a guest/user has already made 1 or more previous bookings
const checkHasPreviousBookings = async ({ userId, email, phone }) => {
  const orConditions = [];
  if (userId) {
    orConditions.push({ guestId: String(userId) });
  }
  if (email && String(email).trim()) {
    const cleanEmail = String(email).trim();
    orConditions.push({ email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
  }
  if (phone && String(phone).trim()) {
    const cleanPhone = String(phone).trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 7) {
      orConditions.push({ phone: { $regex: new RegExp(cleanPhone.slice(-10)) } });
    }
  }

  if (orConditions.length === 0) return false;

  const count = await Booking.countDocuments({
    $or: orConditions,
    status: { $nin: ['Cancelled', 'Rejected'] }
  });

  return count > 0;
};

// GET /api/public/server-time (Used by all clients to synchronize with server clock)
router.get('/server-time', (req, res) => {
  const now = new Date();
  return sendSuccess(res, 200, {
    serverTime: now.toISOString(),
    serverTimestamp: now.getTime(),
    timezone: 'Asia/Kolkata',
    formattedIST: formatISTDateTime(now),
    standardCheckInTime: '12:00 PM',
    standardCheckOutTime: '11:00 AM'
  }, 'Current server time synchronized');
});

// GET /api/v1/public/branding
router.get('/branding', async (req, res) => {
  try {
    const branding = await CMS.findOne({ type: 'branding' });
    if (branding) {
      const data = branding.toObject ? branding.toObject() : { ...branding };
      if (!data.content || data.content.includes('Bk15F6S5') || data.content.includes('favicon.ico')) {
        data.content = '/logo.png';
      }
      if (!data.readTime || data.readTime === '/favicon.ico' || data.readTime.includes('min read')) {
        data.readTime = '/logo.png';
      }
      return sendSuccess(res, 200, data, 'Branding fetched successfully');
    }
    return sendSuccess(res, 200, {
      type: 'branding',
      name: 'Hour Stay',
      content: '/logo.png',
      readTime: '/logo.png',
      author: '#0D1B2A',
      role: '#5B21B6'
    }, 'Default branding fetched');
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch CMS data');
  }
});

// GET /api/v1/public/properties
router.get('/properties', async (req, res) => {
  try {
    // Purge test rooms from DB
    await Room.deleteMany({
      $or: [
        { roomNumber: { $regex: /^test/i } },
        { category: { $regex: /^test/i } },
        { name: { $regex: /^test/i } }
      ]
    }).catch(() => {});
    await Property.findByIdAndDelete('HS-JAI').catch(() => {});

    const rawProperties = await Property.find();
    const properties = rawProperties.filter(p => {
      const name = (p.name || p.settings?.hotelName || '').toLowerCase();
      const status = (p.status || '').toLowerCase();
      return status === 'active' && !name.includes('rambagh') && !name.includes('test property');
    });
    return sendSuccess(res, 200, properties, 'Properties fetched successfully');
  } catch (error) {
    console.error('GET /properties error:', error);
    return sendError(res, 500, error.message || 'Failed to fetch properties');
  }
});

// GET /api/v1/public/properties/:id
router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let property = null;

    const rawProps = await Property.find();
    const activeProps = rawProps.filter(p => {
      const name = (p.name || p.settings?.hotelName || '').toLowerCase();
      const status = (p.status || '').toLowerCase();
      return status === 'active' && !name.includes('rambagh') && !name.includes('test property');
    });

    if (id && id !== 'all') {
      property = activeProps.find(p =>
        String(p._id) === String(id) ||
        String(p.id) === String(id) ||
        String(p.assignedAdmin) === String(id)
      );
    }

    if (!property) {
      property = activeProps.find(p => p._id === 'HS-9HQ8P' || p.id === 'HS-9HQ8P') || activeProps[0];
    }

    if (!property) {
      return sendError(res, 404, 'Property profile not found');
    }

    return sendSuccess(res, 200, property, 'Property profile fetched successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to fetch property profile');
  }
});

// GET /api/v1/public/properties/:id/rooms
router.get('/properties/:id/rooms', async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;
    const targetPropId = req.params.id || 'HS-9HQ8P';

    let dbRooms = await Room.find({ propertyId: targetPropId }).sort({ roomNumber: 1 });

    if (!dbRooms || dbRooms.length === 0) {
      dbRooms = await Room.find().sort({ roomNumber: 1 });
    }

    // Seed 14 default room configurations if zero rooms exist in MongoDB
    if (!dbRooms || dbRooms.length === 0) {
      const rawProps = await Property.find();
      const allProps = rawProps.filter(p => (p.status || '').toLowerCase() === 'active' && !(p.name || '').toLowerCase().includes('rambagh'));
      const defaultPropId = allProps[0]?._id?.toString() || 'HS-9HQ8P';

      const defaultRoomsToSeed = [
        { roomNumber: '101', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '102', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '103', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '201', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '202', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '203', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '301', category: 'Executive Suite', status: 'Available', ratePlan: 'Executive Suite Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '302', category: 'Executive Suite', status: 'Available', ratePlan: 'Executive Suite Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '303', category: 'Executive Suite', status: 'Available', ratePlan: 'Executive Suite Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '401', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '402', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '403', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '501', category: 'Penthouse Suite', status: 'Available', ratePlan: 'Penthouse Plan', baseRate: 5500, currentRate: 5500, dailyRate: 5500, floor: 'Floor 5', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '502', category: 'Penthouse Suite', status: 'Available', ratePlan: 'Penthouse Plan', baseRate: 5500, currentRate: 5500, dailyRate: 5500, floor: 'Floor 5', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId }
      ];
      await Room.insertMany(defaultRoomsToSeed);
      dbRooms = await Room.find().sort({ roomNumber: 1 });
    }

    // Fetch active bookings to evaluate date-range availability & room status
    const activeBookings = await Booking.find({
      status: { $in: ['Confirmed', 'Paid', 'Pending', 'Checked-in', 'Checked In', 'Staying', 'Pre-checked', 'Reserved'] }
    });

    const parseTime = (dateStr) => {
      if (!dateStr) return null;
      const t = new Date(dateStr).getTime();
      return isNaN(t) ? null : t;
    };

    const reqIn = parseTime(checkIn);
    const reqOut = parseTime(checkOut);

    const mapped = dbRooms.map((rm) => {
      const rate = Number(rm.currentRate || rm.baseRate || rm.dailyRate || 3000);
      let ratePlan = rm.ratePlan;
      if (!ratePlan || ((ratePlan === 'Standard Plan' || ratePlan === 'Standard Rate Plan') && rm.category && !rm.category.toLowerCase().includes('standard'))) {
        ratePlan = rm.category.toLowerCase().includes('deluxe') ? 'Deluxe Plan' :
                   rm.category.toLowerCase().includes('suite') ? 'Executive Suite Plan' :
                   `${rm.category} Plan`;
      }
      const amenitiesArr = rm.amenities
        ? (Array.isArray(rm.amenities)
            ? rm.amenities
            : typeof rm.amenities === 'string'
                ? rm.amenities.split(',').map(a => a.trim()).filter(Boolean)
                : [])
        : [];
      const capacityStr = String(rm.capacity || "2 Adults");

      // Check for matching active booking
      let matchedBooking = null;
      let isOccupied = false;
      let isReserved = false;

      for (const b of activeBookings) {
        if (b.status === 'Cancelled' || b.status === 'Checked-out' || b.status === 'No-show') continue;

        const bRoomNum = b.roomNumber || (b.roomId && !isNaN(b.roomId) ? String(b.roomId) : null) || (b.room ? String(b.room).match(/\b\d{3,4}\b/)?.[0] : null);
        const matchesRoom = (b.roomId && String(b.roomId) === String(rm._id)) ||
                            (bRoomNum && String(bRoomNum).trim() === String(rm.roomNumber).trim()) ||
                            (b.room && String(b.room).includes(String(rm.roomNumber)));
        if (!matchesRoom) continue;

        const bIn = parseTime(b.checkIn);
        const bOut = parseTime(b.checkOut);

        const dateOverlap = (!reqIn || !reqOut || !bIn || !bOut) ? true : (reqIn < bOut && reqOut > bIn);
        if (dateOverlap) {
          matchedBooking = b;
          if (b.status === 'Checked-in' || b.status === 'Checked In' || b.status === 'Staying') {
            isOccupied = true;
          } else {
            isReserved = true;
          }
        }
      }

      let displayStatus = rm.status || "Available";
      if (rm.status !== 'Blocked') {
        if (isOccupied || rm.status === 'Occupied') {
          displayStatus = 'Occupied';
        } else if (isReserved || rm.status === 'Reserved') {
          displayStatus = 'Reserved';
        } else if (rm.status === 'Available' || rm.status === 'Vacant Clean' || !rm.status) {
          displayStatus = 'Available';
        }
      }

      const isAvailable = displayStatus === "Available";

      return {
        id: rm._id ? String(rm._id) : (rm.id || `RM-${rm.roomNumber}`),
        _id: rm._id ? String(rm._id) : (rm.id || `RM-${rm.roomNumber}`),
        roomNumber: rm.roomNumber,
        name: `${rm.category} (Room ${rm.roomNumber})`,
        category: rm.category || "Standard Room",
        size: capacityStr,
        beds: rm.bedType || "King Bed",
        occupancy: capacityStr.includes("4") ? 4 : capacityStr.includes("6") ? 6 : 2,
        capacity: capacityStr,
        baseRate: rate,
        currentRate: rate,
        dailyRate: rate,
        ratePlan: ratePlan || 'Standard Plan',
        status: displayStatus,
        operationalStatus: rm.status || "Available",
        isReserved: displayStatus === "Reserved",
        isAvailable: isAvailable,
        guest: matchedBooking ? (matchedBooking.guest || matchedBooking.guestName || '') : '',
        checkIn: matchedBooking ? matchedBooking.checkIn : '',
        checkOut: matchedBooking ? matchedBooking.checkOut : '',
        amenities: amenitiesArr,
        description: rm.description || `Luxury ${rm.category} located on ${rm.floor || 'Floor 1'}.`,
        floor: rm.floor || "Floor 1",
        images: Array.isArray(rm.images) ? rm.images.filter(Boolean) : [],
        propertyId: rm.propertyId,
        inventory: isAvailable ? 1 : 0
      };
    });

    const validMapped = mapped.filter((rm) => {
      const num = (rm.roomNumber || '').toLowerCase();
      const cat = (rm.category || '').toLowerCase();
      const name = (rm.name || '').toLowerCase();
      return !num.includes('test') && !cat.includes('test') && !name.includes('test');
    });

    return sendSuccess(res, 200, validMapped, 'Property rooms retrieved from MongoDB');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// POST /api/v1/public/bookings
router.post('/bookings', async (req, res) => {
  try {
    const {
      propertyId,
      roomId,
      guest,
      guestName,
      email,
      phone,
      checkIn,
      checkInDate,
      checkOut,
      checkOutDate,
      room,
      roomType,
      roomsCount,
      adults,
      children,
      amount,
      totalAmount,
      specialRequests
    } = req.body;

    const gName = guestName || guest;
    const cIn = checkInDate || checkIn;
    const cOut = checkOutDate || checkOut;
    const rType = roomType || room || 'Standard Room';
    const rawGross = Number(req.body.originalAmount || (req.body.roomBaseTotal ? (Number(req.body.roomBaseTotal) + Number(req.body.gstAmount || 0)) : (totalAmount || amount || 7080)));
    const rawPassedFinal = Number(totalAmount || amount || 0);
    let amt = rawGross > 0 ? rawGross : (rawPassedFinal > 0 ? rawPassedFinal : 7080);
    if (!amt || isNaN(amt) || amt <= 0) {
      amt = 7080;
    }

    if (!gName || !email || !phone || !cIn || !cOut) {
      return sendError(res, 400, 'Missing required booking details (guest name, email, phone, check-in, and check-out)');
    }

    const targetPropId = propertyId || 'HS-9HQ8P';
    const nights = calculateStayNights(cIn, cOut);

    // 1. Overlapping Date Availability Check
    const parseDateToMs = (val) => {
      const parsed = parseDateSafe(val);
      return parsed ? parsed.getTime() : new Date(val).getTime();
    };

    const newCheckIn = parseDateToMs(cIn);
    const newCheckOut = parseDateToMs(cOut);

    if (isNaN(newCheckIn) || isNaN(newCheckOut) || newCheckIn > newCheckOut) {
      return sendError(res, 400, 'Invalid check-in or check-out date range');
    }

    // Fetch physical rooms and existing active bookings for property
    let allPropRooms = await Room.find({ propertyId: targetPropId });
    if (!allPropRooms || allPropRooms.length === 0) {
      allPropRooms = await Room.find();
    }

    const existingBookings = await Booking.find({
      propertyId: targetPropId,
      status: { $in: ['Confirmed', 'Paid', 'Pending', 'Checked-in'] }
    });

    let assignedRoomId = roomId || null;
    let assignedRoomNumber = null;

    if (roomId) {
      try {
        if (mongoose.Types.ObjectId.isValid(roomId)) {
          const targetRoom = await Room.findById(roomId);
          if (targetRoom) {
            assignedRoomNumber = targetRoom.roomNumber;
          }
        }
      } catch (e) {}
    }

    if (!assignedRoomNumber && room) {
      const match = room.match(/\b\d{3,4}\b/);
      if (match) assignedRoomNumber = match[0];
    }

    const targetCategory = rType || room || 'Standard Room';

    // Filter active bookings that overlap with requested [newCheckIn, newCheckOut]
    const overlappingActiveBookings = existingBookings.filter(b => {
      if (b.status === 'Cancelled' || b.status === 'Checked-out' || b.status === 'No-show') return false;
      const bIn = new Date(b.checkIn).getTime();
      const bOut = new Date(b.checkOut).getTime();
      return (newCheckIn < bOut && newCheckOut > bIn);
    });

    // Find all rooms matching target category
    const categoryRooms = allPropRooms.filter(r => {
      const rCat = String(r.category || '').toLowerCase().trim();
      const tCat = String(targetCategory).toLowerCase().trim();
      return rCat === tCat || tCat.includes(rCat) || rCat.includes(tCat) ||
        (tCat.includes('deluxe') && rCat.includes('deluxe')) ||
        (tCat.includes('suite') && rCat.includes('suite')) ||
        (tCat.includes('standard') && rCat.includes('standard')) ||
        (tCat.includes('penthouse') && rCat.includes('penthouse'));
    });

    // Identify which category rooms are vacant for requested date range
    const availableCategoryRooms = categoryRooms.filter(r => {
      const isTaken = overlappingActiveBookings.some(b => {
        const bRoomNum = b.roomId || (b.room ? b.room.match(/\b\d{3,4}\b/)?.[0] : null);
        return (bRoomNum && String(bRoomNum).trim() === String(r.roomNumber).trim()) ||
               (b.roomId && String(b.roomId) === String(r._id));
      });
      const statusStr = String(r.status || 'Available').toLowerCase();
      const isStatusAvailable = statusStr === 'available' || statusStr === 'vacant clean' || statusStr === 'vacant';
      return !isTaken && isStatusAvailable;
    });

    let finalAssignedRoom = null;
    let isUnavailable = false;

    // If a specific room was requested, check if it's free
    if (assignedRoomNumber || assignedRoomId) {
      const requestedRoom = allPropRooms.find(r => 
        (assignedRoomId && String(r._id) === String(assignedRoomId)) ||
        (assignedRoomNumber && String(r.roomNumber).trim() === String(assignedRoomNumber).trim())
      );

      if (requestedRoom) {
        const isSpecificRoomTaken = overlappingActiveBookings.some(b => {
          const bRoomNum = b.roomId || (b.room ? b.room.match(/\b\d{3,4}\b/)?.[0] : null);
          return (bRoomNum && String(bRoomNum).trim() === String(requestedRoom.roomNumber).trim()) ||
                 (b.roomId && String(b.roomId) === String(requestedRoom._id));
        });
        const statusStr = String(requestedRoom.status || 'Available').toLowerCase();
        const isStatusAvailable = statusStr === 'available' || statusStr === 'vacant clean' || statusStr === 'vacant';

        if (!isSpecificRoomTaken && isStatusAvailable) {
          finalAssignedRoom = requestedRoom;
        }
      }
    }

    // If specific room wasn't available or none requested, assign from available rooms in category
    if (!finalAssignedRoom && availableCategoryRooms.length > 0) {
      finalAssignedRoom = availableCategoryRooms[0];
    }

    // If no room is available in category, check availability state
    if (!finalAssignedRoom) {
      if (categoryRooms.length > 0) {
        // All rooms in this category are truly occupied
        isUnavailable = true;
      } else {
        // Fallback: check overall property occupancy
        const totalCount = allPropRooms.length || 10;
        if (overlappingActiveBookings.length >= totalCount) {
          isUnavailable = true;
        }
      }
    }

    if (isUnavailable) {
      return sendError(res, 400, 'Selected room or category is unavailable for the chosen date range.');
    }

    if (finalAssignedRoom) {
      assignedRoomId = finalAssignedRoom._id ? String(finalAssignedRoom._id) : assignedRoomId;
      assignedRoomNumber = finalAssignedRoom.roomNumber;
    }

    let bookingCity = req.body.city || req.body.guestCity || req.body.hotelCity;
    let targetPropObj = null;
    try {
      if (mongoose.Types.ObjectId.isValid(targetPropId)) {
        targetPropObj = await Property.findById(targetPropId);
      } else {
        targetPropObj = await Property.findOne({ $or: [{ propertyId: targetPropId }, { name: targetPropId }] });
      }
      if (!bookingCity && targetPropObj) {
        bookingCity = targetPropObj.settings?.city || targetPropObj.city || 'Hyderabad';
      }
    } catch (e) {
      if (!bookingCity) bookingCity = 'Hyderabad';
    }

    // 2. Identify or Create Guest Account (Website -> First Booking creates account and links booking)
    let guestUser = null;

    // Check if Authorization token provided
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const tokenVal = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(tokenVal, process.env.JWT_SECRET || 'secret123');
        if (decoded?.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
          guestUser = await User.findById(decoded.id);
        }
      } catch (e) {}
    }

    if (!guestUser && req.body.guestId) {
      try {
        if (mongoose.Types.ObjectId.isValid(req.body.guestId)) {
          guestUser = await User.findById(req.body.guestId);
        }
      } catch (e) {}
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();

    if (!guestUser && cleanEmail) {
      guestUser = await User.findOne({ email: cleanEmail });
    }

    if (!guestUser) {
      // Create new Guest account in MongoDB
      const defaultPassword = `Guest@${Math.floor(1000 + Math.random() * 9000)}`;
      guestUser = await User.create({
        name: gName,
        email: cleanEmail,
        mobile: cleanPhone,
        role: 'guest',
        password: defaultPassword,
        status: 'Active'
      });
    }

    const guestId = guestUser ? (guestUser._id || guestUser.id) : null;

    // 2. Validate and Apply Promo / Coupon if provided
    let appliedCoupon = null;
    let discountAmount = Number(req.body.discountAmount || 0);
    const grossAmount = rawGross > 0 ? rawGross : 7080;
    let finalAmount = rawPassedFinal > 0 ? rawPassedFinal : grossAmount;
    const requestedCouponCode = req.body.couponCode || req.body.coupon;

    if (requestedCouponCode) {
      const cleanCode = String(requestedCouponCode).trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: cleanCode, status: 'Active' });
      if (coupon) {
        // Enforce first-booking only restriction for Welcome-related promo codes
        let isEligible = true;
        if (isWelcomeCoupon(coupon)) {
          const hasPrevious = await checkHasPreviousBookings({
            userId: guestId,
            email: cleanEmail,
            phone: cleanPhone
          });
          if (hasPrevious) {
            isEligible = false;
          }
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const isDateValid = (!coupon.validFrom || todayStr >= coupon.validFrom) && (!coupon.validUntil || todayStr <= coupon.validUntil);
        const isUsageValid = !coupon.usageLimit || coupon.usageLimit === 0 || (coupon.usedCount || 0) < coupon.usageLimit;
        const isMinAmountValid = !coupon.minBookingAmount || grossAmount >= coupon.minBookingAmount;

        if (isEligible && isDateValid && isUsageValid && isMinAmountValid) {
          if (coupon.discountType === 'percentage') {
            discountAmount = Math.round((grossAmount * coupon.discountValue) / 100);
            if (coupon.maxDiscount && coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
              discountAmount = coupon.maxDiscount;
            }
          } else {
            discountAmount = Math.min(coupon.discountValue, grossAmount);
          }
          finalAmount = Math.max(0, grossAmount - discountAmount);
          appliedCoupon = coupon;

          // Increment usage count
          try {
            await Coupon.findByIdAndUpdate(coupon._id || coupon.id, { $inc: { usedCount: 1 } });
          } catch (e) {
            if (coupon.usedCount !== undefined) {
              coupon.usedCount += 1;
              await coupon.save?.();
            }
          }
        }
      }
    }

    // Single source of truth: if client calculated final payable amount matches gross - discount, preserve exact value
    if (rawPassedFinal > 0 && discountAmount > 0 && Math.abs(rawPassedFinal - (grossAmount - discountAmount)) <= 5) {
      finalAmount = rawPassedFinal;
    }

    const bookingId = `BK${Date.now().toString().slice(-6)}`;
    const formattedRoom = assignedRoomNumber ? `${assignedRoomNumber} · ${rType || 'Standard Room'}` : (rType || 'Standard Room');

    // Aadhaar consistency validation on website booking if provided
    const inputDocType = req.body.idProofType || req.body.idDocType || 'Aadhaar Card';
    const inputDocNumber = req.body.idProofNumber || req.body.idDocNumber || req.body.aadhaar || '';

    let hasVerifiedId = false;
    let finalDocNumber = '';
    let finalDocType = inputDocType;

    if (inputDocNumber) {
      const aadhaarValidation = await validateBookingAadhaarConsistency({
        guestId,
        email: cleanEmail,
        phone: cleanPhone,
        name: gName,
        idDocType: inputDocType,
        idDocNumber: inputDocNumber
      });

      if (!aadhaarValidation.isValid) {
        return sendError(res, 400, aadhaarValidation.error);
      }

      if (aadhaarValidation.isAadhaar) {
        finalDocNumber = aadhaarValidation.formattedAadhaar;
        finalDocType = 'Aadhaar Card';
        hasVerifiedId = true;
      } else {
        finalDocNumber = String(inputDocNumber).trim();
      }
    }

    const effectiveCoupon = appliedCoupon ? appliedCoupon.code : (requestedCouponCode ? String(requestedCouponCode).trim().toUpperCase() : null);

    const newBooking = await Booking.create({
      bookingId,
      guestId,
      propertyId: targetPropId,
      roomId: assignedRoomId,
      roomNumber: assignedRoomNumber ? String(assignedRoomNumber) : null,
      idDocType: finalDocType,
      idDocNumber: finalDocNumber,
      idVerification: hasVerifiedId ? 'Verified' : 'Pending',
      idVerifiedAt: hasVerifiedId ? new Date() : null,
      idVerifiedBy: hasVerifiedId ? 'Online Direct Verification' : '',
      city: bookingCity || 'Hyderabad',
      guest: gName,
      email: cleanEmail,
      phone: cleanPhone,
      checkIn: cIn,
      checkOut: cOut,
      nights: nights,
      room: formattedRoom,
      roomType: rType || 'Standard Room',
      ratePlan: req.body.ratePlan || (rType?.toLowerCase().includes('deluxe') ? 'Deluxe Plan' : rType?.toLowerCase().includes('suite') ? 'Executive Suite Plan' : `${rType || 'Standard'} Plan`),
      rooms: Number(roomsCount) || 1,
      adults: Number(adults) || 2,
      children: Number(children) || 0,
      originalAmount: grossAmount,
      couponCode: effectiveCoupon,
      discountAmount: discountAmount,
      amount: finalAmount,
      totalAmount: finalAmount,
      netAmount: finalAmount,
      paidAmount: finalAmount,
      balance: 0,
      paymentStatus: 'Paid',
      specialRequests: specialRequests || '',
      source: 'Website Direct',
      status: 'Confirmed'
    });

    if (hasVerifiedId) {
      await syncVerifiedAadhaarToGuestProfile({
        booking: newBooking,
        idDocType: finalDocType,
        idDocNumber: finalDocNumber,
        verifiedBy: 'Online Direct Verification'
      });
    }

    // Automatically log verified payment in ledger for real-time manager/receptionist consoles
    let newPayment = null;
    try {
      newPayment = await Payment.create({
        bookingId: newBooking.bookingId,
        guestName: gName,
        roomNumber: assignedRoomNumber ? String(assignedRoomNumber) : '101',
        amount: finalAmount,
        originalAmount: grossAmount,
        discountAmount: discountAmount,
        couponCode: effectiveCoupon,
        paidAmount: finalAmount,
        paymentMethod: req.body.paymentMethod || 'UPI',
        status: 'Settled',
        propertyId: targetPropId,
        createdAt: newBooking.createdAt || new Date()
      });
    } catch (payErr) {
      console.error('Error auto-creating payment ledger for booking:', payErr.message);
    }

    // Mark assigned room as Reserved in MongoDB
    if (assignedRoomNumber) {
      await syncRoomStatus(assignedRoomNumber, 'Reserved', targetPropId);
    }

    // Notify Realtime (Socket.io) across all dashboards and guest view
    const io = req.app.get('socketio');
    if (io) {
      broadcastCheckinCheckout(io, targetPropId, {
        action: 'booking_created',
        booking: newBooking,
        roomNumber: assignedRoomNumber,
        status: 'Confirmed'
      });
      emitRealtimeSync(io, targetPropId, 'booking_created', { booking: newBooking, propertyId: targetPropId });
      if (newPayment) {
        emitRealtimeSync(io, targetPropId, 'payment_logged', { payment: newPayment, propertyId: targetPropId });
        emitRealtimeSync(io, targetPropId, 'payment_added', { payment: newPayment, propertyId: targetPropId });
      }
      if (assignedRoomNumber) {
        emitRealtimeSync(io, targetPropId, 'room_status_changed', { propertyId: targetPropId, roomNumber: assignedRoomNumber, status: 'Reserved' });
        emitRealtimeSync(io, targetPropId, 'availability_changed', { propertyId: targetPropId, roomNumber: assignedRoomNumber });
      }
      emitRealtimeSync(io, targetPropId, 'dashboard_sync', { propertyId: targetPropId, action: 'booking_created' });
    }

    // Trigger Unified Notifications across Web & Mobile consoles
    await notifyBookingEvent({
      req,
      io,
      action: 'created',
      booking: newBooking,
      guestUser,
      property: targetPropObj
    });

    // Generate JWT token for guest
    const token = guestUser ? jwt.sign({ id: guestUser._id || guestUser.id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' }) : null;

    const responsePayload = {
      ...(newBooking.toObject ? newBooking.toObject() : newBooking),
      booking: newBooking,
      token,
      user: guestUser ? {
        id: guestUser._id || guestUser.id,
        _id: guestUser._id || guestUser.id,
        name: guestUser.name,
        email: guestUser.email,
        mobile: guestUser.mobile,
        role: guestUser.role
      } : null
    };

    return sendSuccess(res, 201, responsePayload, 'Booking confirmed successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create booking');
  }
});

// POST /api/v1/public/contact
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, hotelName, subject, message, propertyId } = req.body;
    if (!name || !email || !message) {
      return sendError(res, 400, 'Name, email, and message are required.');
    }

    const targetPropId = propertyId || 'HS-9HQ8P';
    const newContact = await ContactMessage.create({
      name,
      email,
      phone: phone || '',
      subject: subject || hotelName || 'General Inquiry',
      message,
      propertyId: targetPropId,
      status: 'New'
    });

    await triggerNotification({
      req,
      role: 'admin',
      propertyId: targetPropId,
      title: 'New Contact Inquiry',
      message: `${name} (${email}): ${subject || hotelName || message.substring(0, 40)}`,
      category: 'General'
    });

    await triggerNotification({
      req,
      role: 'super-admin',
      title: 'New Public Contact Request',
      message: `${name} submitted an inquiry: "${subject || hotelName || message.substring(0, 40)}"`,
      category: 'General'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'global', 'contact_created', { contact: newContact });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'contact_created' });
    }

    return sendSuccess(res, 201, newContact, 'Thank you! Your message has been received.');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to submit contact form');
  }
});

// GET /api/v1/public/contact
router.get('/contact', async (req, res) => {
  try {
    const propertyId = req.query.propertyId || 'HS-9HQ8P';
    const prop = await Property.findById(propertyId).catch(() => null);
    const cms = await CMS.findOne().catch(() => null);

    const contactInfo = {
      name: prop?.settings?.hotelName || prop?.name || cms?.contact?.name || "Hour Stay Speshway Luxury Hotel",
      email: prop?.settings?.reservationEmail || prop?.settings?.email || cms?.contact?.email || "stay@hourstay.in",
      phone: prop?.settings?.contactNumber || prop?.settings?.phone || cms?.contact?.phone || "+91 141 4055 900",
      address: prop?.settings?.address ? `${prop.settings.address}, ${prop.city || 'Hyderabad'}` : (cms?.contact?.address || "2nd Floor, Gulmohar House, Amber Fort Road, Jaipur"),
      hours: `Check-in: ${prop?.settings?.checkInTime || '12:00'} · Check-out: ${prop?.settings?.checkOutTime || '11:00'} (Front Desk 24/7)`
    };

    return sendSuccess(res, 200, contactInfo, 'Contact information retrieved');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// GET /api/v1/public/plans
router.get('/plans', async (req, res) => {
  try {
    let plans = await SubscriptionPlan.find({ status: 'Active' }).sort({ monthlyPrice: 1 });
    if (!plans || plans.length === 0) {
      // Seed standard default plans if empty
      const defaultPlans = [
        {
          name: "Starter Tier",
          description: "Essential suite for boutique properties and standalone guesthouses.",
          monthlyPrice: 3999,
          yearlyPrice: 39990,
          propertyLimit: 1,
          roomLimit: 25,
          includedFeatures: ["Front Desk Console", "Direct Booking Engine", "GST Split Invoicing", "Mobile Housekeeping"],
          status: "Active",
          activeSubscribers: 12
        },
        {
          name: "Professional Suite",
          description: "Full-featured management platform for expanding city hotels and resorts.",
          monthlyPrice: 7999,
          yearlyPrice: 79990,
          propertyLimit: 3,
          roomLimit: 75,
          includedFeatures: ["Real-time 2-Way Channel Sync", "Advanced Guest CRM", "Dynamic Rate Calendar", "Shift Roster & Biometrics", "POS Restaurant Billing"],
          status: "Active",
          activeSubscribers: 28
        },
        {
          name: "Enterprise Pro",
          description: "Unlimited portfolio management for multi-branch chains and heritage groups.",
          monthlyPrice: 14999,
          yearlyPrice: 149990,
          propertyLimit: 10,
          roomLimit: 300,
          includedFeatures: ["Multi-Property Central Ledger", "Custom API & Webhooks", "Dedicated SLA Account Manager", "Custom WhatsApp Invoicing", "Auditor & CA Export Portal"],
          status: "Active",
          activeSubscribers: 8
        }
      ];
      await SubscriptionPlan.insertMany(defaultPlans);
      plans = await SubscriptionPlan.find({ status: 'Active' }).sort({ monthlyPrice: 1 });
    }
    return sendSuccess(res, 200, plans, 'Active subscription plans retrieved');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to retrieve subscription plans');
  }
});

// ==========================================
// PUBLIC COUPONS & OFFERS (WEBSITE ONLY)
// ==========================================
// GET /api/v1/public/coupons
router.get('/coupons', async (req, res) => {
  try {
    const propId = req.query.propertyId;
    const query = { status: 'Active' };
    if (propId && propId !== 'all') {
      query.$or = [{ propertyId: 'all' }, { propertyId: propId }, { propertyId: null }, { propertyId: { $exists: false } }];
    }

    const coupons = await Coupon.find(query);
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if current user / guest has previous bookings (2nd booking onwards)
    const userIdent = await extractUserIdentity(req);
    const hasPrevious = await checkHasPreviousBookings(userIdent);

    // Filter only active, not expired, not usage-exhausted, and eligible for booking count
    const validCoupons = coupons.filter(c => {
      if (c.status !== 'Active') return false;
      if (c.validFrom && todayStr < c.validFrom) return false;
      if (c.validUntil && todayStr > c.validUntil) return false;
      if (c.usageLimit && c.usageLimit > 0 && (c.usedCount || 0) >= c.usageLimit) return false;

      // If guest has previous bookings (2nd booking onwards), do NOT show welcome-related promo codes
      if (hasPrevious && isWelcomeCoupon(c)) {
        return false;
      }
      return true;
    }).map(c => ({
      id: c._id || c.id,
      _id: c._id || c.id,
      code: c.code,
      title: c.title || c.code,
      description: c.description || '',
      discountType: (c.discountType === 'flat' ? 'fixed' : (c.discountType || 'percentage')),
      discountValue: c.discountValue,
      maxDiscount: c.maxDiscount || 0,
      minBookingAmount: c.minBookingAmount || 0,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      firstBookingOnly: isWelcomeCoupon(c)
    }));

    return sendSuccess(res, 200, validCoupons, 'Available public promo coupons retrieved');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch public coupons');
  }
});

// POST /api/v1/public/coupons/validate
router.post('/coupons/validate', async (req, res) => {
  try {
    const { code, bookingAmount, propertyId } = req.body;
    if (!code || !code.trim()) {
      return sendError(res, 400, 'Please enter a valid coupon code.');
    }

    const cleanCode = String(code).trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return sendError(res, 404, `Invalid coupon code '${cleanCode}'. Please check and try again.`);
    }

    if (coupon.status !== 'Active') {
      return sendError(res, 400, `Coupon '${cleanCode}' is currently inactive.`);
    }

    // Check Welcome / First Booking constraint
    if (isWelcomeCoupon(coupon)) {
      const userIdent = await extractUserIdentity(req);
      const hasPrevious = await checkHasPreviousBookings(userIdent);
      if (hasPrevious) {
        return sendError(
          res,
          400,
          `Promo code '${cleanCode}' is exclusively valid for 1st-time bookings. It cannot be applied to subsequent bookings.`
        );
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (coupon.validFrom && todayStr < coupon.validFrom) {
      return sendError(res, 400, `Coupon '${cleanCode}' is not yet active. Valid from ${coupon.validFrom}.`);
    }

    if (coupon.validUntil && todayStr > coupon.validUntil) {
      return sendError(res, 400, `Coupon '${cleanCode}' has expired on ${coupon.validUntil}.`);
    }

    if (coupon.usageLimit && coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit) {
      return sendError(res, 400, `Coupon '${cleanCode}' has reached its maximum usage limit.`);
    }

    const amountNum = Number(bookingAmount) || 0;
    if (coupon.minBookingAmount && coupon.minBookingAmount > 0 && amountNum < coupon.minBookingAmount) {
      return sendError(res, 400, `Coupon '${cleanCode}' requires a minimum booking amount of ₹${coupon.minBookingAmount.toLocaleString('en-IN')}. (Current: ₹${amountNum.toLocaleString('en-IN')})`);
    }

    // Calculate discount amount
    let discountAmount = 0;
    const normType = coupon.discountType === 'flat' ? 'fixed' : (coupon.discountType || 'percentage');
    if (normType === 'percentage') {
      discountAmount = Math.round((amountNum * coupon.discountValue) / 100);
      if (coupon.maxDiscount && coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, amountNum);
    }

    const payableAmount = Math.max(0, amountNum - discountAmount);

    return sendSuccess(res, 200, {
      valid: true,
      coupon: {
        id: coupon._id || coupon.id,
        code: coupon.code,
        title: coupon.title || coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount || 0,
        minBookingAmount: coupon.minBookingAmount || 0,
        firstBookingOnly: isWelcomeCoupon(coupon)
      },
      originalAmount: amountNum,
      discountAmount,
      payableAmount
    }, `Coupon '${cleanCode}' applied successfully! You saved ₹${discountAmount.toLocaleString('en-IN')}.`);
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to validate coupon');
  }
});

// ==========================================
// PUBLIC GUEST FEEDBACK & REVIEWS
// ==========================================
router.get('/feedback', async (req, res) => {
  try {
    const { propertyId } = req.query;
    const query = { status: 'Published' };
    if (propertyId && propertyId !== 'all') {
      query.$or = [
        { propertyId: propertyId },
        { propertyId: { $exists: false } },
        { propertyId: '' },
        { propertyId: 'HS-9HQ8P' }
      ];
    }
    const list = await getUnifiedFeedbacksAndReviews(query);
    return sendSuccess(res, 200, list, 'Public published feedback retrieved successfully.');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch feedback');
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const {
      bookingId,
      guestName,
      guestEmail = '',
      guestPhone = '',
      rating = 5,
      ratings,
      comment = '',
      comments = '',
      propertyId = 'HS-9HQ8P'
    } = req.body;

    const feedbackText = comment || comments;
    if (!guestName || !feedbackText) {
      return sendError(res, 400, 'Guest name and review comment are required.');
    }

    let room = '101';
    let roomType = 'Standard Room';
    let propId = propertyId;

    if (bookingId) {
      const b = await Booking.findOne({
        $or: [{ bookingId: bookingId }, { _id: bookingId.length === 24 ? bookingId : null }, { id: bookingId }]
      });
      if (b) {
        propId = b.propertyId || propId;
        room = b.roomNumber || (b.room ? String(b.room).match(/\b\d{3,4}\b/)?.[0] || b.room.split(' ')[0] : '101');
        roomType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : (b.room || 'Standard Room'));
      }
    }

    const ratingNum = Number(rating) || 5;
    const sentiment = ratingNum >= 4 ? 'Positive' : ratingNum === 3 ? 'Neutral' : 'Negative';

    const created = await Feedback.create({
      bookingId: bookingId || `BK-${Date.now().toString().slice(-5)}`,
      guestName,
      guestEmail,
      guestPhone,
      room,
      roomType,
      rating: ratingNum,
      ratings: {
        cleanliness: ratings?.cleanliness || 5,
        service: ratings?.service || 5,
        room: ratings?.room || 5,
        food: ratings?.food || 5,
        overall: ratingNum
      },
      category: 'Public Guest Review',
      sentiment,
      status: 'Published',
      comment: feedbackText,
      comments: feedbackText,
      propertyId: propId
    });

    await notifyFeedbackEvent({
      req,
      action: 'created',
      feedback: created,
      actor: guestName
    });

    return sendSuccess(res, 201, created, 'Thank you! Your feedback has been published.');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to submit feedback');
  }
});

export default router;
