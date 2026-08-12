import express from 'express';
import { sendSuccess } from '../utils/response.js';

const router = express.Router();

router.get('/dashboard', (req, res) => {
  return sendSuccess(res, 200, {
    occupancyRate: "78%",
    activeReservations: 142,
    todayCheckIns: 48,
    revenueToday: 124500
  }, 'Admin dashboard metrics retrieved');
});

export default router;
