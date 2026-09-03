import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import CMS from '../models/cms.model.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import { Room, ContactMessage } from '../models/managerData.model.js';
import SubscriptionPlan from '../models/subscriptionPlan.model.js';
import { emitRealtimeSync, broadcastCheckinCheckout } from '../utils/socketEmitter.js';
import { triggerNotification } from '../utils/notification.helper.js';

const router = express.Router();

// GET /api/v1/public/branding
router.get('/branding', async (req, res) => {
  try {
    const cms = await CMS.find();
    return sendSuccess(res, 200, cms, 'CMS data fetched successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch CMS data');
  }
});

// GET /api/v1/public/properties
router.get('/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    return sendSuccess(res, 200, properties, 'Properties fetched successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch properties');
  }
});

// GET /api/v1/public/properties/:id
router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let property = null;

    if (id && id !== 'all') {
      property = await Property.findOne({
        $or: [
          { _id: id },
          { id: id },
          { assignedAdmin: id }
        ]
      }).catch(() => null);

      if (!property) {
        property = await Property.findById(id).catch(() => null);
      }
    }

    if (!property) {
      const all = await Property.find();
      if (all.length > 0) {
        property = all.find(p => p._id === id || p.id === id) || all[0];
      }
    }

    if (!property) {
      return sendError(res, 404, 'Property profile not found');
    }

    return sendSuccess(res, 200, property, 'Property profile fetched successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch property profile');
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
      const allProps = await Property.find();
      const defaultPropId = allProps[0]?._id?.toString() || 'HS-9HQ8P';

      const defaultRoomsToSeed = [
        { roomNumber: '101', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '102', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '103', category: 'Standard Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 3000, currentRate: 3000, dailyRate: 3000, floor: 'Floor 1', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '201', category: 'Deluxe Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '202', category: 'Deluxe Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '203', category: 'Deluxe Room', status: 'Available', ratePlan: 'Standard Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 2', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '301', category: 'Executive Suite', status: 'Available', ratePlan: 'Standard Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '302', category: 'Executive Suite', status: 'Available', ratePlan: 'Standard Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '303', category: 'Executive Suite', status: 'Available', ratePlan: 'Standard Plan', baseRate: 6500, currentRate: 6500, dailyRate: 6500, floor: 'Floor 3', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '401', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '402', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '403', category: 'Deluxe Room', status: 'Available', ratePlan: 'Deluxe Plan', baseRate: 4500, currentRate: 4500, dailyRate: 4500, floor: 'Floor 4', capacity: '2 Adults + 1 Child', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '501', category: 'Penthouse Suite', status: 'Available', ratePlan: 'Penthouse Plan', baseRate: 5500, currentRate: 5500, dailyRate: 5500, floor: 'Floor 5', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId },
        { roomNumber: '502', category: 'Penthouse Suite', status: 'Available', ratePlan: 'Penthouse Plan', baseRate: 5500, currentRate: 5500, dailyRate: 5500, floor: 'Floor 5', capacity: '2 Adults', bedType: 'King Bed', propertyId: defaultPropId }
      ];
      await Room.insertMany(defaultRoomsToSeed);
      dbRooms = await Room.find().sort({ roomNumber: 1 });
    }

    // Fetch active bookings to evaluate date-range availability
    const activeBookings = await Booking.find({
      status: { $in: ['Confirmed', 'Paid', 'Pending', 'Checked-in'] }
    });

    const mapped = dbRooms.map((rm) => {
      const rate = Number(rm.currentRate || rm.baseRate || rm.dailyRate || 3000);
      const ratePlan = rm.ratePlan || 'Standard Plan';
      const amenitiesArr = rm.amenities
        ? (Array.isArray(rm.amenities)
            ? rm.amenities
            : typeof rm.amenities === 'string'
                ? rm.amenities.split(',').map(a => a.trim()).filter(Boolean)
                : [])
        : [];
      const capacityStr = String(rm.capacity || "2 Adults");

      // Check if room is reserved for requested date range
      let reservedForDates = false;
      if (checkIn && checkOut) {
        const reqIn = new Date(checkIn).getTime();
        const reqOut = new Date(checkOut).getTime();

        reservedForDates = activeBookings.some(b => {
          const bRoomNum = b.roomId || (b.room ? b.room.match(/\b\d{3,4}\b/)?.[0] : null);
          const matchesRoom = (b.roomId && String(b.roomId) === String(rm._id)) || (bRoomNum === rm.roomNumber);
          if (!matchesRoom) return false;

          const bIn = new Date(b.checkIn).getTime();
          const bOut = new Date(b.checkOut).getTime();

          return (reqIn < bOut && reqOut > bIn);
        });
      }

      const isAvailable = (rm.status === "Available" || rm.status === "Vacant Clean") && !reservedForDates;

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
        ratePlan: ratePlan,
        status: reservedForDates ? "Reserved" : rm.status || "Available",
        isAvailable: isAvailable,
        amenities: amenitiesArr,
        description: rm.description || `Luxury ${rm.category} located on ${rm.floor || 'Floor 1'}.`,
        floor: rm.floor || "Floor 1",
        images: Array.isArray(rm.images) ? rm.images.filter(Boolean) : [],
        propertyId: rm.propertyId,
        inventory: isAvailable ? 1 : 0
      };
    });

    return sendSuccess(res, 200, mapped, 'Property rooms retrieved from MongoDB');
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
    const rType = roomType || room;
    let amt = Number(totalAmount || amount || 0);
    if (!amt || isNaN(amt) || amt <= 0) {
      amt = 7080;
    }

    if (!gName || !email || !phone || !cIn || !cOut) {
      return sendError(res, 400, 'Missing required booking details (guest name, email, phone, check-in, and check-out)');
    }

    const targetPropId = propertyId || 'HS-9HQ8P';

    // 1. Overlapping Date Availability Check
    const newCheckIn = new Date(cIn).getTime();
    const newCheckOut = new Date(cOut).getTime();

    if (isNaN(newCheckIn) || isNaN(newCheckOut) || newCheckIn >= newCheckOut) {
      return sendError(res, 400, 'Invalid check-in or check-out date range');
    }

    // Fetch physical rooms and existing active bookings for property
    const allPropRooms = await Room.find({ propertyId: targetPropId });
    const existingBookings = await Booking.find({
      propertyId: targetPropId,
      status: { $in: ['Confirmed', 'Paid', 'Pending', 'Checked-in'] }
    });

    // If a specific roomId / room was selected, verify room availability for date range
    let assignedRoomId = roomId || null;
    let assignedRoomNumber = null;

    if (roomId) {
      const targetRoom = await Room.findById(roomId).catch(() => null);
      if (targetRoom) {
        assignedRoomNumber = targetRoom.roomNumber;
      }
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

    let isUnavailable = false;

    if (assignedRoomNumber) {
      // Case A: A specific room number (e.g. Room 103) was selected
      const isSpecificRoomTaken = overlappingActiveBookings.some(b => {
        const bRoomNum = b.roomId || (b.room ? b.room.match(/\b\d{3,4}\b/)?.[0] : null);
        return (bRoomNum && String(bRoomNum).trim() === String(assignedRoomNumber).trim()) ||
               (b.roomId && String(b.roomId) === String(assignedRoomId));
      });
      if (isSpecificRoomTaken) {
        isUnavailable = true;
      }
    } else {
      // Case B: A room category (e.g. "Standard Room") was selected without a specific room number
      const categoryRooms = allPropRooms.filter(r => {
        const rCat = String(r.category || '').toLowerCase();
        const tCat = String(targetCategory).toLowerCase();
        return rCat === tCat || tCat.includes(rCat) || rCat.includes(tCat);
      });

      const totalCategoryRoomCount = categoryRooms.length || 3; // Default 3 physical rooms per category if not seeded

      // Count overlapping bookings for this category
      const categoryBookingsCount = overlappingActiveBookings.filter(b => {
        const bCat = String(b.roomType || b.category || b.room || '').toLowerCase();
        const tCat = String(targetCategory).toLowerCase();
        return bCat === tCat || tCat.includes(bCat) || bCat.includes(tCat);
      }).length;

      if (categoryBookingsCount >= totalCategoryRoomCount) {
        isUnavailable = true;
      }
    }

    if (isUnavailable) {
      return sendError(res, 400, 'Selected room or category is unavailable for the chosen date range.');
    }

    let bookingCity = req.body.city || req.body.guestCity || req.body.hotelCity;
    if (!bookingCity) {
      const targetProp = await Property.findOne({ _id: targetPropId }).catch(() => null);
      bookingCity = targetProp?.settings?.city || targetProp?.city || 'Hyderabad';
    }

    // 2. Identify or Create Guest Account (Website -> First Booking creates account and links booking)
    let guestUser = null;

    // Check if Authorization token provided
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const tokenVal = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(tokenVal, process.env.JWT_SECRET || 'secret123');
        if (decoded?.id) {
          guestUser = await User.findById(decoded.id);
        }
      } catch (e) {}
    }

    if (!guestUser && req.body.guestId) {
      guestUser = await User.findById(req.body.guestId).catch(() => null);
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

    const bookingId = `BK${Date.now().toString().slice(-6)}`;

    const newBooking = await Booking.create({
      bookingId,
      guestId,
      propertyId: targetPropId,
      roomId: assignedRoomId,
      city: bookingCity,
      guest: gName,
      email: cleanEmail,
      phone: cleanPhone,
      checkIn: cIn,
      checkOut: cOut,
      room: assignedRoomNumber ? `${rType || 'Room'} (Room ${assignedRoomNumber})` : (rType || 'Standard Room'),
      roomType: rType || 'Standard Room',
      rooms: Number(roomsCount) || 1,
      adults: Number(adults) || 2,
      children: Number(children) || 0,
      amount: amt,
      totalAmount: amt,
      specialRequests: specialRequests || '',
      source: 'Website Direct',
      status: 'Confirmed'
    });

    // Notify Realtime (Socket.io) across all dashboards and guest view
    const io = req.app.get('socketio');
    if (io) {
      broadcastCheckinCheckout(io, targetPropId, {
        action: 'status_change',
        booking: newBooking,
        roomNumber: assignedRoomNumber,
        status: 'Confirmed'
      });
    }

    // Trigger Notifications
    await triggerNotification({
      req,
      propertyId: targetPropId,
      title: 'New Online Reservation',
      message: `Guest ${gName} booked ${rType || 'Room'} (${checkIn} → ${checkOut}) for ₹${amt}.`,
      category: 'New Reservation'
    });

    if (guestUser) {
      await triggerNotification({
        req,
        userId: guestUser._id || guestUser.id,
        role: 'guest',
        title: 'Booking Confirmed!',
        message: `Your reservation at ${prop?.name || 'Hotel'} is confirmed for ${checkIn} - ${checkOut}. Ref: #${newBooking.bookingId || newBooking._id}`,
        category: 'Booking Confirmation'
      });
    }

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

export default router;
