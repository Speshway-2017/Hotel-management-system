import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Booking from '../models/booking.model.js';
import Property from '../models/property.model.js';

const router = express.Router();

router.use(protect);

router.get('/bookings', async (req, res) => {
  try {
    const properties = await Property.find({});
    const userMobile = req.user.mobile || '';
    const userName = req.user.name || '';
    
    const bookings = await Booking.find({
      $or: [
        { guest: userName },
        { phone: userMobile }
      ]
    }).sort({ createdAt: -1 });

    const mapped = bookings.map(b => {
      const prop = properties.find(p => p._id === b.propertyId || p.id === b.propertyId);
      return {
        id: b._id || b.id,
        hotel: prop ? prop.name : 'Assigned Property',
        city: prop ? prop.city : 'Jaipur',
        room: b.room || '—',
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        dates: `${b.checkIn} → ${b.checkOut}`,
        amount: b.amount || 0,
        status: b.status || 'Confirmed'
      };
    });

    return sendSuccess(res, 200, mapped, 'Guest bookings history retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load guest bookings');
  }
});

export default router;
