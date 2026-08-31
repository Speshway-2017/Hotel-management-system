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
    let dbRooms = await Room.find().sort({ roomNumber: 1 });

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
            status: r === 2 ? 'Occupied' : r === 3 ? 'Blocked' : 'Available',
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
        status: rm.status || "Available",
        isAvailable: rm.status === "Available" || rm.status === "Vacant Clean",
        amenities: amenitiesArr,
        description: rm.description || `Luxury ${rm.category} located on ${rm.floor || 'Floor 1'}.`,
        floor: rm.floor || "Floor 1",
        images: Array.isArray(rm.images) ? rm.images.filter(Boolean) : [],
        propertyId: rm.propertyId,
        inventory: 1
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

    let bookingCity = req.body.city || req.body.guestCity || req.body.hotelCity;
    if (!bookingCity) {
      const targetProp = await Property.findOne({ _id: propertyId || 'HS-9HQ8P' }).catch(() => null);
      bookingCity = targetProp?.settings?.city || targetProp?.city || 'Hyderabad';
    }

    const bookingId = `BK${Date.now().toString().slice(-6)}`;

    const newBooking = await Booking.create({
      bookingId,
      propertyId: propertyId || 'HS-9HQ8P',
      city: bookingCity,
      guest: gName,
      email,
      phone,
      checkIn: cIn,
      checkOut: cOut,
      room: rType || 'Standard Room',
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

    return sendSuccess(res, 201, newBooking, 'Booking confirmed successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create booking');
  }
});

export default router;
