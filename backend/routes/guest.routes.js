import express from 'express';
import { sendSuccess } from '../utils/response.js';

const router = express.Router();

router.get('/bookings', (req, res) => {
  return sendSuccess(res, 200, [
    { id: "res_009", hotelName: "Hour Stay Palace", checkIn: "2026-08-12 12:00", checkOut: "2026-08-12 18:00", rate: 2400 }
  ], 'Guest bookings history retrieved');
});

export default router;
