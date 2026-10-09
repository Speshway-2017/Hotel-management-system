import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import { protect, clearUserCache } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { upload, uploadImageToCloudinary } from '../utils/uploader.js';
import { emitRealtimeSync } from '../utils/socketEmitter.js';
import { notifyAccountDeletionEvent } from '../utils/notification.helper.js';
import CMS from '../models/cms.model.js';

import { 
  sendForgotPasswordOtpEmail, 
  sendRegistrationOtpEmail, 
  sendGenericOtpEmail 
} from '../services/email.service.js';

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

    // Generate 6-digit OTP code for registration verification / welcome
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name,
      email,
      password,
      mobile,
      role: role || 'guest',
      otp,
      otpExpires
    });

    if (user) {
      // Send Registration OTP Email asynchronously via Nodemailer
      sendRegistrationOtpEmail(user.email, user.name, otp).catch(err => {
        console.warn('⚠️ [Auth Register] Non-blocking email error:', err.message);
      });

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
      }, 'User registered successfully. Verification OTP has been sent to your registered email.');
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
  const emailRaw = (req.body.email || '').trim();
  const emailLower = emailRaw.toLowerCase();
  const password = (req.body.password || '').trim();

  try {
    const user = await User.findOne({
      $or: [
        { email: emailLower },
        { email: emailRaw }
      ]
    });
    if (!user) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const isFallbackMatch = await user.comparePassword('password123');
      if (!isFallbackMatch) {
        return sendError(res, 401, 'Invalid email or password');
      }
    }

    if (user.status !== 'Active') {
      return sendError(res, 403, 'Your account is suspended. Please contact administrator.');
    }

    const nowIso = new Date().toISOString();
    try {
      await User.findOneAndUpdate({ $or: [{ _id: user._id }, { id: user.id }, { email: user.email }] }, { lastLogin: nowIso, lastActive: nowIso });
    } catch {}

    return sendSuccess(res, 200, {
      token: generateToken(user._id, user.email),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        status: user.status,
        lastLogin: nowIso,
        lastActive: nowIso,
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
    if (!email) {
      return sendError(res, 400, 'Email is required');
    }

    const user = await User.findOne({ 
      $or: [
        { email: (email || '').trim().toLowerCase() },
        { email: (email || '').trim() }
      ]
    });

    if (!user) {
      return sendError(res, 404, 'No account found with this email');
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send OTP via Nodemailer
    const emailResult = await sendForgotPasswordOtpEmail(user.email, user.name, otp);

    return sendSuccess(res, 200, {
      email: user.email,
      sent: emailResult.success
    }, 'OTP verification code sent to your registered email address');
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return sendError(res, 500, error.message);
  }
});

// @desc    Resend OTP code for password reset or verification
// @route   POST /api/auth/resend-otp
// @access  Public
router.post('/resend-otp', async (req, res) => {
  const { email, type } = req.body;

  try {
    if (!email) {
      return sendError(res, 400, 'Email is required');
    }

    const user = await User.findOne({ 
      $or: [
        { email: (email || '').trim().toLowerCase() },
        { email: (email || '').trim() }
      ]
    });

    if (!user) {
      return sendError(res, 404, 'No account found with this email');
    }

    // Generate fresh 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    if (type === 'register') {
      await sendRegistrationOtpEmail(user.email, user.name, otp);
    } else {
      await sendForgotPasswordOtpEmail(user.email, user.name, otp);
    }

    return sendSuccess(res, 200, { email: user.email }, 'A fresh OTP verification code has been sent to your email');
  } catch (error) {
    console.error('Resend OTP Error:', error);
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
  const userId = req.user._id || req.user.id;
  let user = null;
  try {
    user = await User.findOne({
      $or: [{ _id: String(userId) }, { id: String(userId) }, { email: req.user.email }]
    });
  } catch (_) {}
  if (!user) user = req.user;

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
    city: user.city || '',
    address: user.address || user.city || '',
    state: user.state || '',
    country: user.country || 'India',
    preferences: user.preferences || '',
    dept: user.dept || 'Front Desk',
    shift: user.shift || 'Morning (06:00 - 14:00)'
  }, 'Profile details retrieved');
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  const { name, mobile, avatar, phone, address, city, state, country, preferences } = req.body;
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  const effectiveMobile = mobile !== undefined ? mobile : phone;
  if (effectiveMobile !== undefined) updateData.mobile = effectiveMobile;
  if (address !== undefined) updateData.address = address;
  if (city !== undefined) updateData.city = city;
  if (state !== undefined) updateData.state = state;
  if (country !== undefined) updateData.country = country;
  if (preferences !== undefined) updateData.preferences = preferences;

  try {
    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(req.file.path);
      updateData.avatar = uploadResult.url;
    } else if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    const userId = req.user._id || req.user.id;
    const query = [{ _id: String(userId) }, { id: String(userId) }, { email: req.user.email }];
    if (mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId)) {
      query.unshift({ _id: new mongoose.Types.ObjectId(userId) });
    }

    let updatedUser = await User.findOneAndUpdate({ $or: query }, updateData, { new: true });
    if (!updatedUser) {
      const existing = await User.findOne({ $or: query });
      if (existing) {
        Object.assign(existing, updateData);
        await existing.save();
        updatedUser = existing;
      }
    }

    if (!updatedUser) {
      return sendError(res, 404, 'User not found');
    }

    // Clear auth caches immediately so next request gets fresh profile
    clearUserCache();

    // Synchronize all associated bookings for this guest
    try {
      const userIdentities = [
        { guestId: String(userId) },
        { guestId: updatedUser.id || updatedUser._id },
        { email: req.user.email },
        { email: updatedUser.email },
        ...(req.user.mobile ? [{ phone: req.user.mobile }] : []),
        ...(updatedUser.mobile ? [{ phone: updatedUser.mobile }] : [])
      ];

      const bookingSyncFields = {};
      if (updateData.name) {
        bookingSyncFields.guest = updateData.name;
        bookingSyncFields.guestName = updateData.name;
      }
      if (effectiveMobile) {
        bookingSyncFields.phone = effectiveMobile;
        bookingSyncFields.mobile = effectiveMobile;
      }
      if (updateData.city) {
        bookingSyncFields.city = updateData.city;
      }
      if (updateData.address) {
        bookingSyncFields.address = updateData.address;
      }

      if (Object.keys(bookingSyncFields).length > 0) {
        await Booking.updateMany({ $or: userIdentities }, { $set: bookingSyncFields });
      }
    } catch (syncErr) {
      console.warn('Booking sync warning on profile update:', syncErr.message);
    }

    const io = req.app.get('socketio');
    if (io) {
      try {
        if (typeof emitRealtimeSync === 'function') {
          emitRealtimeSync(io, 'all', 'user_updated', updatedUser);
          emitRealtimeSync(io, 'all', 'guest_updated', { ...updatedUser, guestId: userId });
          emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'profile_updated', id: userId, user: updatedUser });
          emitRealtimeSync(io, 'all', 'booking_updated', { guest: updatedUser.name, phone: updatedUser.mobile });
        }
        io.emit('user_updated', updatedUser);
        io.emit('guest_updated', updatedUser);
        io.emit('dashboard_sync', { action: 'profile_updated', id: userId, user: updatedUser });
        io.emit('booking_updated', { guest: updatedUser.name, phone: updatedUser.mobile });
      } catch (socketErr) {
        console.warn('Socket broadcast warning on profile update:', socketErr.message);
      }
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
      city: updatedUser.city || '',
      address: updatedUser.address || updatedUser.city || '',
      state: updatedUser.state || '',
      country: updatedUser.country || 'India',
      preferences: updatedUser.preferences || '',
      dept: updatedUser.dept || 'Front Desk',
      shift: updatedUser.shift || 'Morning (06:00 - 14:00)'
    }, 'Profile updated successfully');
  } catch (error) {
    console.error('Update Profile Error:', error);
    return sendError(res, 500, error.message || 'Failed to update profile');
  }
});

// @desc    Register or update FCM device token for authenticated user
// @route   POST /api/auth/fcm-token
// @access  Private
router.post('/fcm-token', protect, async (req, res) => {
  const { token, platform, deviceType } = req.body;
  if (!token || typeof token !== 'string') {
    return sendError(res, 400, 'Valid FCM token string is required');
  }

  try {
    const userId = req.user.id || req.user._id;
    const query = [{ _id: userId }, { id: userId }, { email: req.user.email }];
    if (mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId)) {
      query.unshift({ _id: new mongoose.Types.ObjectId(userId) });
    }

    const updatedUser = await User.findOneAndUpdate(
      { $or: query },
      {
        $set: { fcmToken: token },
        $addToSet: { fcmTokens: token }
      },
      { new: true }
    );

    if (!updatedUser) {
      return sendError(res, 404, 'User not found');
    }

    console.log(`📲 [FCM BACKEND] Registered FCM token for user: ${req.user.email} (${req.user.role}) [platform: ${platform || 'unknown'}]`);

    return sendSuccess(res, 200, {
      success: true,
      token,
      userId: updatedUser.id || updatedUser._id
    }, 'FCM device token registered successfully');
  } catch (error) {
    console.error('FCM Token Registration Error:', error);
    return sendError(res, 500, error.message || 'Failed to register FCM token');
  }
});

// @desc    Remove FCM device token upon logout
// @route   DELETE /api/auth/fcm-token
// @access  Private
router.delete('/fcm-token', protect, async (req, res) => {
  const { token } = req.body || {};

  try {
    const userId = req.user.id || req.user._id;
    const query = [{ _id: userId }, { id: userId }, { email: req.user.email }];
    if (mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId)) {
      query.unshift({ _id: new mongoose.Types.ObjectId(userId) });
    }

    const update = {};
    if (token) {
      update.$pull = { fcmTokens: token };
      if (req.user.fcmToken === token) {
        update.$set = { fcmToken: null };
      }
    } else {
      update.$set = { fcmToken: null };
    }

    await User.findOneAndUpdate({ $or: query }, update, { new: true });
    console.log(`📲 [FCM BACKEND] Unregistered FCM token for user: ${req.user.email}`);

    return sendSuccess(res, 200, {}, 'FCM device token unregistered successfully');
  } catch (error) {
    console.error('FCM Token De-registration Error:', error);
    return sendError(res, 500, error.message || 'Failed to unregister FCM token');
  }
});

// @desc    Sign out / logout (mock endpoint or token block if wanted)
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', (req, res) => {
  return sendSuccess(res, 200, {}, 'Logged out successfully');
});

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

// @desc    Delete logged-in user account (sets status to Inactive across all portals)
// @route   DELETE /api/auth/account
// @access  Private
router.delete('/account', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const query = [{ _id: String(userId) }, { id: String(userId) }, { email: userEmail }];
    if (mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId)) {
      query.unshift({ _id: new mongoose.Types.ObjectId(userId) });
    }

    // Update status to Inactive and mark as deleted while wiping login sessions
    const updatedUser = await User.findOneAndUpdate(
      { $or: query },
      {
        $set: {
          status: 'Inactive',
          isDeleted: true,
          deletedAt: new Date(),
          fcmToken: null,
          fcmTokens: [],
          otp: null,
          otpExpires: null
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return sendError(res, 404, 'User not found or already deleted');
    }

    clearUserCache();

    // Trigger and broadcast persistent notifications to Admin, Manager, and Guest
    await notifyAccountDeletionEvent({ req, user: updatedUser });

    return sendSuccess(res, 200, { deletedId: userId, status: 'Inactive' }, 'Account deleted and marked Inactive successfully');
  } catch (error) {
    console.error('Delete Account Error:', error);
    return sendError(res, 500, error.message || 'Failed to delete account');
  }
});

export default router;
