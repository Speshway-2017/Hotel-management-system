import express from 'express';
import { sendSuccess } from '../utils/response.js';

const router = express.Router();

// Mock endpoints for testing / development
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log(`🔐 Auth Login requested: ${email}`);
  
  // Return mock session
  return sendSuccess(res, 200, {
    token: "mock_jwt_token_for_hms_admin",
    user: {
      id: "admin_id_001",
      email: email || "admin@hourstay.com",
      role: email && email.includes("manager") ? "manager" : "admin",
      name: "Super Owner"
    }
  }, 'Logged in successfully');
});

router.post('/logout', (req, res) => {
  return sendSuccess(res, 200, {}, 'Logged out successfully');
});

router.get('/profile', (req, res) => {
  return sendSuccess(res, 200, {
    id: "admin_id_001",
    email: "admin@hourstay.com",
    role: "admin",
    name: "Super Owner"
  }, 'Profile details retrieved');
});

export default router;
