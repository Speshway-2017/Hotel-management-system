import express from 'express';
import { sendSuccess } from '../utils/response.js';

const router = express.Router();

router.get('/properties', (req, res) => {
  return sendSuccess(res, 200, [
    { id: "prop_1", name: "Hour Stay Palace Jaipur", city: "Jaipur", rooms: 120 },
    { id: "prop_2", name: "Hour Stay Vista Mumbai", city: "Mumbai", rooms: 80 }
  ], 'Global properties list retrieved');
});

export default router;
