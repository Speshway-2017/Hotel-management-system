import express from 'express';
import { sendSuccess } from '../utils/response.js';

const router = express.Router();

router.get('/check-ins', (req, res) => {
  return sendSuccess(res, 200, [
    { id: "res_001", guestName: "Rajesh Kumar", roomType: "Premium Deluxe", roomNo: "302", status: "Checked In" }
  ], 'Pending check-ins retrieved');
});

export default router;
