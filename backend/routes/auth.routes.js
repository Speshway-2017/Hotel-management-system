import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { protect } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { upload, uploadImageToCloudinary } from '../utils/uploader.js';

const router = express.Router();

// Helper to generate JWT Token
const generateToken = (id, email = '') => {
  const payload = typeof id === 'object' ? id : { id, email };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, mobile, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return sendError(res, 400, 'User with this email already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      mobile,
      role: role || 'guest'
    });

    if (user) {
      return sendSuccess(res, 201, {
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          mobile: user.mobile,
          propertyId: user.propertyId || null
        }
      }, 'User registered successfully');
    } else {
      return sendError(res, 400, 'Invalid user data');
    }
  } catch (error) {
    console.error('Register Error:', error);
    return sendError(res, 500, error.message);
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password');
    }

    if (user.status !== 'Active') {
      return sendError(res, 403, 'Your account is suspended. Please contact administrator.');
    }

    return sendSuccess(res, 200, {
      token: generateToken(user._id, user.email),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        status: user.status,
        propertyId: user.propertyId || null
      }
    }, 'Logged in successfully');
  } catch (error) {
    console.error('Login Error:', error);
    return sendError(res, 500, error.message);
  }
});

// @desc    Request forgot password OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 404, 'No account found with this email');
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    // Print OTP in backend terminal for testing/development
    console.log('\n----------------------------------------');
    console.log(`🔐 [OTP DEV ONLY] OTP code for ${email} is: ${otp}`);
    console.log('----------------------------------------\n');

    return sendSuccess(res, 200, {}, 'OTP verification code generated and printed to console');
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return sendError(res, 500, error.message);
  }
});

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return sendError(res, 400, 'Invalid or expired OTP code');
    }

    return sendSuccess(res, 200, {}, 'OTP verified successfully');
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return sendError(res, 500, error.message);
  }
});

// @desc    Reset password with verified OTP
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { email, otp, password } = req.body;

  try {
    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return sendError(res, 400, 'Invalid or expired OTP code');
    }

    // Set new password (pre-save hook will hash this)
    user.password = password;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return sendSuccess(res, 200, {}, 'Password reset successfully');
  } catch (error) {
    console.error('Reset Password Error:', error);
    return sendError(res, 500, error.message);
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  const user = req.user;
  return sendSuccess(res, 200, {
    id: user.id || user._id,
    _id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    mobile: user.mobile || user.phone || '',
    phone: user.mobile || user.phone || '',
    status: user.status || 'Active',
    propertyId: user.propertyId || null,
    avatar: user.avatar || null,
    dept: user.dept || 'Front Desk',
    shift: user.shift || 'Morning (06:00 - 14:00)'
  }, 'Profile details retrieved');
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  const { name, mobile, avatar, phone } = req.body;
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (mobile !== undefined) updateData.mobile = mobile;
  if (phone !== undefined && mobile === undefined) updateData.mobile = phone;

  try {
    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(req.file.path);
      updateData.avatar = uploadResult.url;
    } else if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    const userId = req.user._id || req.user.id;
    const query = [{ _id: userId }, { id: userId }, { email: req.user.email }];
    if (mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId)) {
      query.unshift({ _id: new mongoose.Types.ObjectId(userId) });
    }

    const updatedUser = await User.findOneAndUpdate({ $or: query }, updateData, { new: true });
    if (!updatedUser) {
      return sendError(res, 404, 'User not found');
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_updated', updatedUser);
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'profile_updated', id: userId });
    }

    return sendSuccess(res, 200, {
      id: updatedUser.id || updatedUser._id,
      _id: updatedUser.id || updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      mobile: updatedUser.mobile || '',
      phone: updatedUser.mobile || '',
      status: updatedUser.status,
      propertyId: updatedUser.propertyId || null,
      avatar: updatedUser.avatar || null,
      dept: updatedUser.dept || 'Front Desk',
      shift: updatedUser.shift || 'Morning (06:00 - 14:00)'
    }, 'Profile updated successfully');
  } catch (error) {
    console.error('Update Profile Error:', error);
    return sendError(res, 500, error.message || 'Failed to update profile');
  }
});

// @desc    Sign out / logout (mock endpoint or token block if wanted)
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', (req, res) => {
  return sendSuccess(res, 200, {}, 'Logged out successfully');
});

import CMS from '../models/cms.model.js';

// @desc    Get public CMS settings and branding
// @route   GET /api/auth/cms
// @access  Public
router.get('/cms', async (req, res) => {
  try {
    const cmsItems = await CMS.find({});
    return sendSuccess(res, 200, cmsItems, 'Public CMS items retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to fetch public CMS');
  }
});

export default router;
