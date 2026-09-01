import express from 'express';
import mongoose from 'mongoose';
import CMS from '../models/cms.model.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import { Room } from '../models/managerData.model.js';

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

    // Seed 12 default room configurations if zero rooms exist in MongoDB
    if (!dbRooms || dbRooms.length === 0) {
      const defaultRoomsToSeed = [];
      const roomTypeSpecs = [
        { category: "Standard Room", rate: 3000, plan: "Standard Plan" },
        { category: "Deluxe Room", rate: 4500, plan: "Deluxe Plan" },
        { category: "Executive Suite", rate: 6500, plan: "Deluxe Plan" },
        { category: "Villa Suite", rate: 12500, plan: "Weekend Plan" }
      ];

      const allProps = await Property.find();
      const defaultPropId = allProps[0]?._id?.toString() || 'HS-9HQ8P';

      for (let floor = 1; floor <= 4; floor++) {
        const spec = roomTypeSpecs[floor - 1];
        for (let r = 1; r <= 3; r++) {
          defaultRoomsToSeed.push({
            roomNumber: `${floor}0${r}`,
            category: spec.category,
            status: 'Available',
            ratePlan: spec.plan,
            baseRate: spec.rate,
            currentRate: spec.rate,
            dailyRate: spec.rate,
            floor: `Floor ${floor}`,
            propertyId: defaultPropId
          });
        }
      }
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

    const bookingId = `BK${Date.now().toString().slice(-6)}`;

    const newBooking = await Booking.create({
      bookingId,
      propertyId: targetPropId,
      roomId: assignedRoomId,
      city: bookingCity,
      guest: gName,
      email,
      phone,
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
      status: 'Confirmed',
      paymentStatus: 'Paid'
    });

    // Notify Realtime (Socket.io)
    const io = req.app.get('socketio');
    if (io) {
      io.emit('booking_updated', { type: 'CREATED', booking: newBooking });
      io.emit('availability_changed', { propertyId: targetPropId, roomId: assignedRoomId });
    }

    return sendSuccess(res, 201, newBooking, 'Booking confirmed successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create booking');
  }
});

export default router;
