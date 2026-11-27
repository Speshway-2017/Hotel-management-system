import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import Session from '../models/session.model.js';
import { protect, clearUserCache } from '../middleware/auth.middleware.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/security.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { upload, uploadImageToCloudinary, validateUploadedImageMagicBytes, isSafeUrlOrImageData } from '../utils/uploader.js';
import { emitRealtimeSync } from '../utils/socketEmitter.js';
import { notifyAccountDeletionEvent } from '../utils/notification.helper.js';
import CMS from '../models/cms.model.js';
import {
  createAuthSession,
  rotateRefreshSession,
  revokeSessionByAccessPayload,
  revokeAllUserSessions,
  setRefreshCookie,
  clearRefreshCookie,
  verifyAccessToken
} from '../utils/tokenManager.js';
import {
  checkEntityBlocked,
  registerFailedAuthAttempt,
  clearFailedAuthAttempts,
  recordSecurityEvent
} from '../services/securityMonitor.service.js';
import { timingSafeEqualStr } from '../utils/cryptoVault.js';
import {
  sendForgotPasswordOtpEmail,
  sendRegistrationOtpEmail
} from '../services/email.service.js';
import { validateName, validateEmail, validatePhone, validatePassword } from '../utils/validator.js';

const router = express.Router();

const generateSecureOtp = (email = '') => {
  if (process.env.NODE_ENV !== 'production' && String(email).toLowerCase().trim() === 'verification@gmail.com') {
    return '123456';
  }
  return String(crypto.randomInt(100000, 1000000));
};

const buildSafeUserDto = (user, overrides = {}) => ({
  id: user._id || user.id,
  _id: user._id || user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  mobile: user.mobile || user.phone || '',
  phone: user.mobile || user.phone || '',
  status: user.status || 'Active',
  lastLogin: overrides.lastLogin || user.lastLogin || null,
  lastActive: overrides.lastActive || user.lastActive || null,
  propertyId: user.propertyId || null,
  avatar: user.avatar || null,
  city: user.city || '',
  address: user.address || user.city || '',
  state: user.state || '',
  country: user.country || 'India',
  preferences: user.preferences || '',
  dept: user.dept || 'Front Desk',
  shift: user.shift || 'Morning (06:00 - 14:00)'
});

// @desc    Register a new guest user (strictly forced to 'guest' role to prevent privilege escalation)
// @route   POST /api/auth/register
// @access  Public
router.post('/register', authRateLimiter, async (req, res) => {
  const { name, email, password, mobile, role } = req.body;

  try {
    const blockStatus = await checkEntityBlocked(req, email);
    if (blockStatus.blocked) {
      return sendError(res, 429, 'Too many attempts. Please try again later.');
    }

    // Log if a caller attempted to register with an elevated role
    if (role && String(role).toLowerCase().trim() !== 'guest') {
      await recordSecurityEvent({
        type: 'PRIVILEGE_ESCALATION_ATTEMPT',
        severity: 'high',
        req,
        userEmail: email,
        details: `Public registration attempted with privileged role '${String(role)}'. Forced to 'guest'.`,
        notifyAdmins: true
      });
    }

    const nameVal = validateName(name, 'Full name', 2);
    if (!nameVal.valid) return sendError(res, 400, nameVal.message);

    const emailVal = validateEmail(email, true);
    if (!emailVal.valid) return sendError(res, 400, emailVal.message);

    const passVal = validatePassword(password, 6);
    if (!passVal.valid) return sendError(res, 400, passVal.message);

    let cleanMobile = '';
    if (mobile) {
      const pVal = validatePhone(mobile, true);
      if (!pVal.valid) return sendError(res, 400, pVal.message);
      cleanMobile = pVal.value;
    }

    const userExists = await User.findOne({ email: emailVal.value });
    if (userExists) {
      return sendError(res, 400, 'User with this email already exists');
    }

    const otp = generateSecureOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name: nameVal.value,
      email: emailVal.value,
      password: passVal.value,
      mobile: cleanMobile,
      role: 'guest', // Strictly enforce guest role on public signup
      otp,
      otpExpires,
      otpAttempts: 0
    });

    if (!user) {
      return sendError(res, 400, 'Invalid user data');
    }

    sendRegistrationOtpEmail(user.email, user.name, otp).catch((err) => {
      console.warn('⚠️ [Auth Register] Non-blocking email error:', err.message);
    });

    const platform = req.headers['x-client-platform'] || 'web';
    const session = await createAuthSession({ user, req, platform });
    setRefreshCookie(res, session.refreshToken);

    return sendSuccess(res, 201, {
      token: session.accessToken,
      refreshToken: session.refreshToken,
      sessionId: session.sessionId,
      user: buildSafeUserDto(user)
    }, 'User registered successfully. Verification OTP has been sent to your registered email.');
  } catch (error) {
    console.error('Register Error:', error.message);
    return sendError(res, 500, 'Registration failed');
  }
});

// @desc    Authenticate user & get access + refresh tokens
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authRateLimiter, async (req, res) => {
  const emailRaw = String(req.body.email || '').trim();
  const emailLower = emailRaw.toLowerCase();
  const password = String(req.body.password || '');

  try {
    if (!emailLower || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const blockStatus = await checkEntityBlocked(req, emailLower);
    if (blockStatus.blocked) {
      return sendError(res, 429, 'Account or IP temporarily locked due to multiple failed login attempts. Please try again later or reset your password.');
    }

    const user = await User.findOne({
      $or: [{ email: emailLower }, { email: emailRaw }]
    });

    if (!user) {
      await registerFailedAuthAttempt(req, emailLower, 'Unknown account');
      return sendError(res, 401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const { locked } = await registerFailedAuthAttempt(req, emailLower, 'Incorrect password');
      if (locked) {
        return sendError(res, 429, 'Too many failed login attempts. Account temporarily locked for 15 minutes.');
      }
      return sendError(res, 401, 'Invalid email or password');
    }

    if (user.status !== 'Active') {
      await recordSecurityEvent({
        type: 'SUSPENDED_ACCOUNT_LOGIN',
        severity: 'medium',
        req,
        user,
        details: `Suspended/inactive user attempted login`
      });
      return sendError(res, 403, 'Your account is suspended. Please contact administrator.');
    }

    clearFailedAuthAttempts(req, emailLower);

    const nowIso = new Date().toISOString();
    const fcmToken = req.body.fcmToken || req.body.token;
    try {
      const updateData = { lastLogin: nowIso, lastActive: nowIso };
      if (fcmToken && typeof fcmToken === 'string' && fcmToken.length > 10) {
        updateData.fcmToken = fcmToken;
      }
      await User.findOneAndUpdate(
        { $or: [{ _id: user._id }, { id: user.id }, { email: user.email }] },
        {
          $set: updateData,
          ...(fcmToken && typeof fcmToken === 'string' && fcmToken.length > 10 ? { $addToSet: { fcmTokens: fcmToken } } : {})
        }
      );
    } catch {}

    const platform = req.headers['x-client-platform'] || req.body.platform || 'web';
    const session = await createAuthSession({ user, req, platform });
    setRefreshCookie(res, session.refreshToken);

    return sendSuccess(res, 200, {
      token: session.accessToken,
      refreshToken: session.refreshToken,
      sessionId: session.sessionId,
      user: buildSafeUserDto(user, { lastLogin: nowIso, lastActive: nowIso })
    }, 'Logged in successfully');
  } catch (error) {
    console.error('Login Error:', error.message);
    return sendError(res, 500, 'Authentication failed');
  }
});

// @desc    Rotate refresh token and issue fresh access + refresh tokens
// @route   POST /api/auth/refresh
// @access  Public (Refresh Token verified)
router.post('/refresh', authRateLimiter, async (req, res) => {
  const incomingRefreshToken = req.cookies?.hms_refresh_token || req.body?.refreshToken;
  if (!incomingRefreshToken || typeof incomingRefreshToken !== 'string') {
    return sendError(res, 401, 'Refresh token is required');
  }

  try {
    const rotated = await rotateRefreshSession({
      refreshToken: incomingRefreshToken,
      req,
      userLookupFn: async (userId) => User.findById(userId).select('-password -otp -otpExpires')
    });

    setRefreshCookie(res, rotated.refreshToken);

    return sendSuccess(res, 200, {
      token: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      sessionId: rotated.sessionId,
      user: buildSafeUserDto(rotated.user)
    }, 'Session refreshed successfully');
  } catch (error) {
    clearRefreshCookie(res);
    return sendError(res, 401, error.message || 'Invalid or expired refresh token');
  }
});

// @desc    List active sessions for the logged-in user
// @route   GET /api/auth/sessions
// @access  Private
router.get('/sessions', protect, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const sessions = await Session.find({ userId, revokedAt: null });
    const active = sessions
      .filter((s) => new Date(s.expiresAt) > new Date())
      .map((s) => ({
        sessionId: s.sessionId,
        platform: s.platform || 'web',
        ip: s.ip || '',
        userAgent: s.userAgent || '',
        lastUsedAt: s.lastUsedAt,
        createdAt: s.createdAt,
        current: req.authPayload?.sid === s.sessionId
      }));
    return sendSuccess(res, 200, active, 'Active sessions retrieved');
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch sessions');
  }
});

// @desc    Revoke a specific session belonging to the logged-in user
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
router.delete('/sessions/:sessionId', protect, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const target = await Session.findOne({ sessionId: req.params.sessionId, userId });
    if (!target) {
      return sendError(res, 404, 'Session not found');
    }
    await Session.findOneAndUpdate(
      { sessionId: target.sessionId },
      { $set: { revokedAt: new Date(), revokedReason: 'User terminated session' } }
    );
    if (req.authPayload?.sid === target.sessionId) {
      await revokeSessionByAccessPayload(req.authPayload, 'User terminated current session');
      clearRefreshCookie(res);
    }
    return sendSuccess(res, 200, { sessionId: target.sessionId }, 'Session revoked successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to revoke session');
  }
});

// @desc    Revoke all active sessions for current user
// @route   POST /api/auth/logout-all
// @access  Private
router.post('/logout-all', protect, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } }).catch(() => {});
    await revokeAllUserSessions(userId, 'User logged out from all devices');
    clearUserCache(userId);
    clearRefreshCookie(res);
    return sendSuccess(res, 200, {}, 'All active sessions terminated');
  } catch (error) {
    return sendError(res, 500, 'Failed to terminate sessions');
  }
});

// @desc    Request forgot password OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', otpRateLimiter, async (req, res) => {
  const emailRaw = String(req.body.email || '').trim();
  const emailLower = emailRaw.toLowerCase();

  try {
    if (!emailLower) {
      return sendError(res, 400, 'Email is required');
    }

    const blockStatus = await checkEntityBlocked(req, emailLower);
    if (blockStatus.blocked) {
      return sendError(res, 429, 'Too many attempts. Please wait before trying again.');
    }

    const user = await User.findOne({
      $or: [{ email: emailLower }, { email: emailRaw }]
    });

    if (!user) {
      return sendError(res, 404, 'No account found with this email');
    }

    const otp = generateSecureOtp(user.email);
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;
    await user.save();

    const emailResult = await sendForgotPasswordOtpEmail(user.email, user.name, otp);

    return sendSuccess(res, 200, {
      email: user.email,
      sent: emailResult.success
    }, 'OTP verification code sent to your registered email address');
  } catch (error) {
    console.error('Forgot Password Error:', error.message);
    return sendError(res, 500, 'Failed to process password reset request');
  }
});

// @desc    Resend OTP code for password reset or verification
// @route   POST /api/auth/resend-otp
// @access  Public
router.post('/resend-otp', otpRateLimiter, async (req, res) => {
  const emailRaw = String(req.body.email || '').trim();
  const emailLower = emailRaw.toLowerCase();
  const { type } = req.body;

  try {
    if (!emailLower) {
      return sendError(res, 400, 'Email is required');
    }

    const user = await User.findOne({
      $or: [{ email: emailLower }, { email: emailRaw }]
    });

    if (!user) {
      return sendError(res, 404, 'No account found with this email');
    }

    const otp = generateSecureOtp(user.email);
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;
    await user.save();

    if (type === 'register') {
      await sendRegistrationOtpEmail(user.email, user.name, otp);
    } else {
      await sendForgotPasswordOtpEmail(user.email, user.name, otp);
    }

    return sendSuccess(res, 200, { email: user.email }, 'A fresh OTP verification code has been sent to your email');
  } catch (error) {
    console.error('Resend OTP Error:', error.message);
    return sendError(res, 500, 'Failed to resend OTP');
  }
});

// @desc    Verify OTP code (strict string matching & attempt limiting)
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', otpRateLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();

  try {
    if (!email || !/^\d{6}$/.test(otp)) {
      return sendError(res, 400, 'Valid email and 6-digit OTP code are required');
    }

    const user = await User.findOne({ email });
    if (!user || !user.otp || !user.otpExpires || new Date(user.otpExpires) <= new Date()) {
      await registerFailedAuthAttempt(req, email, 'Invalid or expired OTP');
      return sendError(res, 400, 'Invalid or expired OTP code');
    }

    if (Number(user.otpAttempts || 0) >= 5) {
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      await registerFailedAuthAttempt(req, email, 'Exceeded OTP verification attempts');
      return sendError(res, 429, 'Too many invalid OTP attempts. Please request a new OTP.');
    }

    if (!timingSafeEqualStr(String(user.otp), otp)) {
      user.otpAttempts = Number(user.otpAttempts || 0) + 1;
      await user.save();
      await registerFailedAuthAttempt(req, email, 'Incorrect OTP');
      return sendError(res, 400, 'Invalid or expired OTP code');
    }

    clearFailedAuthAttempts(req, email);
    return sendSuccess(res, 200, {}, 'OTP verified successfully');
  } catch (error) {
    console.error('Verify OTP Error:', error.message);
    return sendError(res, 500, 'OTP verification failed');
  }
});

// @desc    Reset password with verified OTP
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', otpRateLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const password = String(req.body.password || '');

  try {
    if (!email || !/^\d{6}$/.test(otp)) {
      return sendError(res, 400, 'Valid email and 6-digit OTP code are required');
    }

    const passVal = validatePassword(password, 6);
    if (!passVal.valid) return sendError(res, 400, passVal.message);

    const user = await User.findOne({ email });
    if (!user || !user.otp || !user.otpExpires || new Date(user.otpExpires) <= new Date()) {
      await registerFailedAuthAttempt(req, email, 'Invalid or expired reset OTP');
      return sendError(res, 400, 'Invalid or expired OTP code');
    }

    if (Number(user.otpAttempts || 0) >= 5 || !timingSafeEqualStr(String(user.otp), otp)) {
      user.otpAttempts = Number(user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= 5) {
        user.otp = undefined;
        user.otpExpires = undefined;
      }
      await user.save();
      await registerFailedAuthAttempt(req, email, 'Invalid password reset OTP');
      return sendError(res, 400, 'Invalid or expired OTP code');
    }

    user.password = passVal.value;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    if (!user.securitySettings) user.securitySettings = {};
    user.securitySettings.lastPasswordChange = new Date();
    await user.save();

    await revokeAllUserSessions(String(user._id || user.id), 'Password reset');
    clearUserCache(user._id || user.id);
    clearFailedAuthAttempts(req, email);

    await recordSecurityEvent({
      type: 'PASSWORD_RESET_COMPLETED',
      severity: 'low',
      req,
      user,
      details: 'Password reset via OTP; all existing sessions revoked'
    });

    return sendSuccess(res, 200, {}, 'Password reset successfully');
  } catch (error) {
    console.error('Reset Password Error:', error.message);
    return sendError(res, 500, 'Password reset failed');
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
    }).select('-password -otp -otpExpires -idDocNumberEncrypted');
  } catch (_) {}
  if (!user) user = req.user;

  return sendSuccess(res, 200, buildSafeUserDto(user), 'Profile details retrieved');
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  const { name, mobile, avatar, phone, address, city, state, country, preferences } = req.body;
  const updateData = {};

  if (name !== undefined) {
    const nameVal = validateName(name, 'Full name', 2);
    if (!nameVal.valid) return sendError(res, 400, nameVal.message);
    updateData.name = nameVal.value;
  }

  const effectiveMobile = mobile !== undefined ? mobile : phone;
  if (effectiveMobile !== undefined && effectiveMobile !== '') {
    const pVal = validatePhone(effectiveMobile, true);
    if (!pVal.valid) {
      return sendError(res, 400, pVal.message);
    }
    updateData.mobile = pVal.value;
  }
  if (address !== undefined) updateData.address = String(address).trim();
  if (city !== undefined) updateData.city = String(city).trim();
  if (state !== undefined) updateData.state = String(state).trim();
  if (country !== undefined) updateData.country = String(country).trim();
  if (preferences !== undefined) updateData.preferences = String(preferences).trim();

  try {
    if (req.file) {
      const magicCheck = validateUploadedImageMagicBytes(req.file.path);
      if (!magicCheck.valid) {
        return sendError(res, 400, magicCheck.message);
      }
      const uploadResult = await uploadImageToCloudinary(req.file.path);
      updateData.avatar = uploadResult.url;
    } else if (avatar !== undefined) {
      if (avatar && !isSafeUrlOrImageData(avatar)) {
        return sendError(res, 400, 'Invalid avatar URL or image payload');
      }
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

    clearUserCache();

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
        bookingSyncFields.phone = updateData.mobile || effectiveMobile;
        bookingSyncFields.mobile = updateData.mobile || effectiveMobile;
      }
      if (updateData.city) bookingSyncFields.city = updateData.city;
      if (updateData.address) bookingSyncFields.address = updateData.address;

      if (Object.keys(bookingSyncFields).length > 0) {
        await Booking.updateMany({ $or: userIdentities }, { $set: bookingSyncFields });
      }
    } catch (syncErr) {
      console.warn('Booking sync warning on profile update:', syncErr.message);
    }

    const safeDto = buildSafeUserDto(updatedUser);
    const io = req.app.get('socketio');
    if (io) {
      try {
        const targetProp = updatedUser.propertyId || 'all';
        emitRealtimeSync(io, targetProp, 'user_updated', safeDto);
        emitRealtimeSync(io, targetProp, 'guest_updated', { ...safeDto, guestId: userId });
        emitRealtimeSync(io, targetProp, 'dashboard_sync', { action: 'profile_updated', id: userId });
      } catch (socketErr) {
        console.warn('Socket broadcast warning on profile update:', socketErr.message);
      }
    }

    return sendSuccess(res, 200, safeDto, 'Profile updated successfully');
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    return sendError(res, 500, 'Failed to update profile');
  }
});

// @desc    Register or update FCM device token for authenticated user (never mutates arbitrary unauthenticated accounts)
// @route   POST /api/auth/fcm-token
// @access  Private (or device-ack when unauthenticated)
router.post('/fcm-token', async (req, res) => {
  const { token, platform } = req.body;
  if (!token || typeof token !== 'string' || token.length < 10) {
    return sendError(res, 400, 'Valid FCM token string is required');
  }

  try {
    let authUser = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const jwtToken = req.headers.authorization.split(' ')[1];
        const decoded = verifyAccessToken(jwtToken);
        if (decoded?.id) authUser = await User.findById(decoded.id);
      } catch (_) {
        return sendError(res, 401, 'Invalid authorization token for FCM registration');
      }
    }

    if (!authUser) {
      // Unauthenticated pre-login device registration: do not bind to arbitrary userId/email/phone!
      return sendSuccess(res, 200, {
        success: true,
        registered: false,
        platform: platform || 'unknown'
      }, 'Device token acknowledged (login required to bind to account)');
    }

    const userId = authUser.id || authUser._id;
    const query = [{ _id: userId }, { id: userId }, { email: authUser.email }];
    if (mongoose.Types.ObjectId.isValid(userId)) {
      query.unshift({ _id: new mongoose.Types.ObjectId(userId) });
    }

    await User.findOneAndUpdate(
      { $or: query },
      {
        $set: { fcmToken: token },
        $addToSet: { fcmTokens: token }
      },
      { new: true }
    );

    return sendSuccess(res, 200, {
      success: true,
      registered: true,
      userId
    }, 'FCM device token registered successfully');
  } catch (error) {
    console.error('FCM Token Registration Error:', error.message);
    return sendError(res, 500, 'Failed to register FCM token');
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
    return sendSuccess(res, 200, {}, 'FCM device token unregistered successfully');
  } catch (error) {
    console.error('FCM Token De-registration Error:', error.message);
    return sendError(res, 500, 'Failed to unregister FCM token');
  }
});

// @desc    Sign out / revoke current session & clear refresh cookie
// @route   POST /api/auth/logout
// @access  Public / Private
router.post('/logout', async (req, res) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = verifyAccessToken(token);
        await revokeSessionByAccessPayload(decoded, 'User logout');
      } catch (_) {}
    }
    const refreshTok = req.cookies?.hms_refresh_token || req.body?.refreshToken;
    if (refreshTok) {
      try {
        const { hashSensitiveToken } = await import('../utils/cryptoVault.js');
        await Session.findOneAndUpdate(
          { refreshTokenHash: hashSensitiveToken(refreshTok) },
          { $set: { revokedAt: new Date(), revokedReason: 'User logout' } }
        );
      } catch (_) {}
    }
  } finally {
    clearRefreshCookie(res);
  }
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
    return sendError(res, 500, 'Failed to fetch public CMS');
  }
});

// @desc    Delete logged-in user account (sets status to Inactive & revokes all sessions)
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
        },
        $inc: { tokenVersion: 1 }
      },
      { new: true }
    );

    if (!updatedUser) {
      return sendError(res, 404, 'User not found or already deleted');
    }

    await revokeAllUserSessions(String(userId), 'Account deleted');
    clearUserCache();
    clearRefreshCookie(res);

    await notifyAccountDeletionEvent({ req, user: updatedUser });

    return sendSuccess(res, 200, { deletedId: userId, status: 'Inactive' }, 'Account deleted and marked Inactive successfully');
  } catch (error) {
    console.error('Delete Account Error:', error.message);
    return sendError(res, 500, 'Failed to delete account');
  }
});

export default router;
