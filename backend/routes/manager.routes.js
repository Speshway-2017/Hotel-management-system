import express from 'express';
import { sendSuccess } from '../utils/response.js';

const router = express.Router();

router.get('/shifts', (req, res) => {
  return sendSuccess(res, 200, [
    { id: 1, staff: "Aarav Sharma", role: "receptionist", shift: "Morning (06:00 - 14:00)" },
    { id: 2, staff: "Neha Patel", role: "manager", shift: "General (09:00 - 17:00)" }
  ], 'Manager shifts list retrieved');
});

export default router;
