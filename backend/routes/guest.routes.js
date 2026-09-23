import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import Property from '../models/property.model.js';
import Review from '../models/review.model.js';
import Notification from '../models/notification.model.js';
import { Room, Feedback, Payment, Approval } from '../models/managerData.model.js';
import { emitRealtimeSync } from '../utils/socketEmitter.js';
import { notifyFeedbackEvent, triggerNotification } from '../utils/notification.helper.js';
import { calculateStayNights } from '../utils/dateUtils.js';
import { extractRoomNumber } from '../utils/roomHelper.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { findPropertySafely } from '../utils/propertyCache.js';
import { processAutoCheckouts } from '../services/autoCheckout.service.js';

const router = express.Router();

const guestAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
      if (decoded.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
        req.user = await User.findById(decoded.id).select('-password');
      }
      if (!req.user && decoded.id) {
        req.user = await User.findOne({ $or: [{ _id: decoded.id }, { id: decoded.id }] }).select('-password');
      }
      if (!req.user && decoded.email) {
        req.user = await User.findOne({ email: decoded.email }).select('-password');
      }
    }
  } catch (e) {
    console.warn('GuestAuth error:', e.message);
  }
  
  if (!req.user) {
    return sendError(res, 401, 'Authentication required to access guest portal');
  }
  next();
};

router.use(guestAuth);

router.get('/rooms', async (req, res) => {
  try {
    const targetPropId = req.user?.propertyId || 'HS-9HQ8P';
    let dbRooms = await Room.find({ propertyId: targetPropId }).sort({ roomNumber: 1 });
    if (!dbRooms || dbRooms.length === 0) {
      dbRooms = await Room.find().sort({ roomNumber: 1 });
    }
    return sendSuccess(res, 200, dbRooms, 'Guest available rooms retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load rooms');
  }
});

export const getBookingEffectiveAmounts = (b) => {
  const discountAmount = Number(b.discountAmount || b.discount || 0);
  let rawAmount = Number(b.amount || b.totalAmount || 0);
  let originalAmount = Number(b.originalAmount || 0);
  let netAmount = b.netAmount !== undefined && b.netAmount !== null ? Number(b.netAmount) : 0;

  let totalAmount = rawAmount;

  if (discountAmount > 0) {
    if (netAmount > 0) {
      totalAmount = netAmount;
      if (originalAmount <= totalAmount) {
        originalAmount = totalAmount + discountAmount;
      }
    } else if (originalAmount > 0 && originalAmount > rawAmount) {
      totalAmount = rawAmount;
    } else if (originalAmount > 0 && originalAmount === rawAmount) {
      totalAmount = rawAmount;
      originalAmount = rawAmount + discountAmount;
    } else {
      originalAmount = totalAmount + discountAmount;
    }
  } else {
    if (originalAmount <= 0) {
      originalAmount = totalAmount;
    }
  }

  return { totalAmount, originalAmount, discountAmount, couponCode: b.couponCode || null };
};

export const buildGuestBookingQuery = (user, req) => {
  const userId = user._id || user.id;
  const userIdStr = String(userId || '');
  const userEmail = (user?.email || '').trim();
  const userPhone = (user?.mobile || user?.phone || '').trim();
  const userName = (user?.name || '').trim();

  const query = [
    { guestId: userId },
    { guestId: userIdStr },
    { userId: userId },
    { userId: userIdStr }
  ];

  if (userEmail) {
    const escapedEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.push({ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
    query.push({ guestEmail: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
  }

  if (userName) {
    const escapedName = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.push({ guest: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
    query.push({ guestName: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
  }

  if (userPhone) {
    query.push({ phone: userPhone });
    query.push({ guestPhone: userPhone });
    const digitsOnly = userPhone.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 7) {
      query.push({ phone: { $regex: digitsOnly.slice(-10) } });
      query.push({ guestPhone: { $regex: digitsOnly.slice(-10) } });
    }
  }

  // Only filter by property if explicitly requested via query parameter and not 'all'
  const explicitPropId = req?.query?.propertyId || req?.headers?.['x-property-id'];
  if (explicitPropId && explicitPropId !== 'all') {
    return {
      $and: [
        { $or: query },
        { $or: [{ propertyId: explicitPropId }, { hotelId: explicitPropId }] }
      ]
    };
  }

  return { $or: query };
};

router.get('/bookings', async (req, res) => {
  try {
    await processAutoCheckouts(req.app.get('socketio'));
    const properties = await Property.find({});
    const userId = req.user._id || req.user.id;

    const bookingQuery = buildGuestBookingQuery(req.user, req);

    const bookings = await Booking.find(bookingQuery).sort({ createdAt: -1 });

    // Fetch existing feedbacks to mark which bookings already have feedback
    const feedbackQuery = [];
    if (userId) feedbackQuery.push({ userId });
    if (req.user?.email) feedbackQuery.push({ guestEmail: req.user.email });
    if (req.user?.mobile) feedbackQuery.push({ guestPhone: req.user.mobile });
    if (req.user?.name) feedbackQuery.push({ guestName: req.user.name });

    const feedbacks = await Feedback.find(feedbackQuery.length > 0 ? { $or: feedbackQuery } : {}).lean();
    const feedbackMap = new Map();
    feedbacks.forEach(f => {
      if (f.bookingId) feedbackMap.set(String(f.bookingId), f);
    });

    const mapped = bookings.map(b => {
      const prop = properties.find(p => p._id === b.propertyId || p.id === b.propertyId || p._id === b.hotelId);
      const propName = b.hotel || b.hotelName || b.propertyName || (prop ? (prop.settings?.hotelName || prop.name) : 'Hour Stay Property');
      const city = b.city || (prop ? (prop.settings?.city || prop.city) : 'Hyderabad');
      const checkIn = b.checkIn || b.checkInDate || '2026-09-01';
      const checkOut = b.checkOut || b.checkOutDate || '2026-09-03';
      const bId = b.bookingId || b._id || b.id;
      const fb = feedbackMap.get(String(bId)) || feedbackMap.get(String(b._id)) || feedbackMap.get(String(b.bookingId));
      
      const { totalAmount, originalAmount, discountAmount, couponCode } = getBookingEffectiveAmounts(b);
      const balance = Number(b.balance || 0);
      const paidAmount = (b.paymentStatus === 'Paid' || b.status === 'Confirmed' || b.status === 'Checked-out' || b.status === 'Cancelled') 
        ? Math.max(0, totalAmount - balance) 
        : Number(b.paidAmount || Math.max(0, totalAmount - balance));

      // Calculate cancellation fee based on policy if not explicitly stored
      let cancellationFee = Number(b.cancellationFee || 0);
      if (b.status === 'Cancelled' && b.cancellationFee !== undefined) {
        cancellationFee = Number(b.cancellationFee);
      } else {
        try {
          const checkInDate = new Date(checkIn);
          const now = new Date();
          const diffHours = (checkInDate - now) / (1000 * 60 * 60);
          if (diffHours < 24 && diffHours > -48) {
            const nights = Number(b.nights) || 1;
            const avgNightRate = nights > 0 ? (totalAmount / nights) : totalAmount;
            cancellationFee = Math.min(paidAmount, Math.round(avgNightRate));
          }
        } catch (_) {
          cancellationFee = 0;
        }
      }
      const refundableAmount = Math.max(0, paidAmount - cancellationFee);

      return {
        id: b.bookingId || b._id || b.id,
        bookingId: b.bookingId || b._id || b.id,
        guestId: b.guestId,
        guest: b.guest || req.user.name,
        hotel: propName,
        city: city,
        room: b.room || b.roomType || 'Standard Room',
        roomNumber: b.roomNumber || '',
        propertyId: b.propertyId || prop?._id || prop?.id || 'HS-9HQ8P',
        checkIn: checkIn,
        checkOut: checkOut,
        nights: calculateStayNights(checkIn, checkOut) || Number(b.nights) || 1,
        dates: `${checkIn} → ${checkOut}`,
        amount: totalAmount,
        totalAmount: totalAmount,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        couponCode: couponCode,
        paidAmount: paidAmount,
        balance: balance,
        status: b.status || 'Confirmed',
        paymentStatus: b.paymentStatus || 'Paid',
        cancellationFee: cancellationFee,
        refundableAmount: b.refundableAmount !== undefined ? Number(b.refundableAmount) : refundableAmount,
        cancellationReason: b.cancellationReason || '',
        cancellationRemarks: b.cancellationRemarks || '',
        cancellationPolicy: prop?.cancellationPolicy || prop?.settings?.cancellationPolicy || 'Free cancellation up to 24 hours prior to check-in. Cancellations within 24 hours will attract a 1-night tariff penalty.',
        refundRequest: b.refundRequest || null,
        refundStatus: b.refundStatus || b.refundRequest?.status || null,
        hasFeedback: Boolean(fb),
        feedbackRating: fb?.rating || null,
        createdAt: b.createdAt
      };
    });

    return sendSuccess(res, 200, mapped, 'Guest bookings history retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load guest bookings');
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    await processAutoCheckouts(req.app.get('socketio'));
    const properties = await Property.find({});
    const userId = req.user._id || req.user.id;

    const bookingQuery = buildGuestBookingQuery(req.user, req);

    const bookings = await Booking.find(bookingQuery).sort({ createdAt: -1 });

    const mapped = bookings.map(b => {
      const prop = properties.find(p => p._id === b.propertyId || p.id === b.propertyId || p._id === b.hotelId);
      const propName = b.hotel || b.hotelName || b.propertyName || (prop ? (prop.settings?.hotelName || prop.name) : 'Hour Stay Property');
      const city = b.city || (prop ? (prop.settings?.city || prop.city) : 'Hyderabad');
      const checkIn = b.checkIn || b.checkInDate || '2026-09-01';
      const checkOut = b.checkOut || b.checkOutDate || '2026-09-03';
      const { totalAmount, originalAmount, discountAmount, couponCode } = getBookingEffectiveAmounts(b);

      return {
        id: b.bookingId || b._id || b.id,
        bookingId: b.bookingId || b._id || b.id,
        guestId: b.guestId,
        guest: b.guest || req.user.name,
        hotel: propName,
        city: city,
        room: b.room || b.roomType || 'Standard Room',
        checkIn: checkIn,
        checkOut: checkOut,
        nights: calculateStayNights(checkIn, checkOut) || Number(b.nights) || 1,
        dates: `${checkIn} → ${checkOut}`,
        amount: totalAmount,
        totalAmount: totalAmount,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        couponCode: couponCode,
        status: b.status || 'Confirmed',
        paymentStatus: b.paymentStatus || 'Paid',
        balance: Number(b.balance || 0),
        createdAt: b.createdAt
      };
    });

    const upcomingBooking = mapped.find(b => b.status === 'Confirmed' || b.status === 'Paid' || b.status === 'Pending') || null;
    const currentStay = mapped.find(b => b.status === 'Checked-in') || null;
    const activeBooking = currentStay || upcomingBooking || (mapped.length > 0 ? mapped[0] : null);
    const totalStays = mapped.length;
    const totalSpent = mapped.reduce((acc, b) => acc + Number(b.amount || 0), 0);

    return sendSuccess(res, 200, {
      stats: {
        upcomingBooking,
        currentStay,
        activeBooking,
        totalStays,
        totalSpent
      },
      recentBookings: mapped
    }, 'Guest dashboard summary retrieved from MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load guest dashboard');
  }
});

router.get('/folio', async (req, res) => {
  try {
    const properties = await Property.find({});
    const userId = req.user._id || req.user.id;

    const bookingQuery = buildGuestBookingQuery(req.user, req);

    const bookings = await Booking.find(bookingQuery).sort({ createdAt: -1 });

    const folios = bookings.map(b => {
      const prop = properties.find(p => p._id === b.propertyId || p.id === b.propertyId || p._id === b.hotelId);

      const hotel = b.hotel || b.hotelName || b.propertyName || (prop ? (prop.settings?.hotelName || prop.name) : 'Hour Stay Property');
      const city = b.city || (prop ? (prop.settings?.city || prop.city) : 'Hyderabad');
      const address = prop ? (prop.settings?.address || prop.address || `${city}, India`) : 'Hitech City, Hyderabad, Telangana';
      const gstNo = prop?.settings?.gstin || '36AABCS1429B1Z5';

      const { totalAmount, originalAmount, discountAmount } = getBookingEffectiveAmounts(b);
      const baseAmount = totalAmount;
      const discount = discountAmount || Number(b.discount || 0);
      const originalGross = originalAmount > 0 ? originalAmount : (baseAmount + discount);
      const roomCharges = Math.round(originalGross / 1.18);
      const gstTax = originalGross - roomCharges;
      
      const services = Array.isArray(b.services) && b.services.length > 0
        ? b.services
        : [];
      
      const serviceTotal = services.reduce((acc, s) => acc + Number(s.amount || 0), 0);
      const totalCharges = (originalGross - discount) + serviceTotal;
      const paidAmount = b.paymentStatus === 'Paid' || b.status === 'Confirmed' ? (b.paidAmount !== undefined ? Number(b.paidAmount) : totalCharges) : Number(b.paidAmount || 0);
      const balance = Math.max(0, totalCharges - paidAmount);
      const paymentStatus = balance === 0 ? 'Settled' : (paidAmount > 0 ? 'Pending Balance' : 'Unpaid');

      return {
        folioId: `FOL-${b.bookingId || b._id || '1001'}`,
        id: `FOL-${b.bookingId || b._id || '1001'}`,
        bookingId: b.bookingId || b._id || b.id,
        guestId: b.guestId,
        hotel,
        city,
        address,
        gstNo,
        guestName: b.guest || req.user.name,
        guestPhone: b.phone || req.user.mobile || '',
        guestEmail: b.email || req.user.email || '',
        room: b.room || b.roomType || 'Standard Room',
        checkIn: b.checkIn || '2026-09-01',
        checkOut: b.checkOut || '2026-09-03',
        dates: `${b.checkIn || '2026-09-01'} → ${b.checkOut || '2026-09-03'}`,
        status: b.status || 'Confirmed',
        roomCharges,
        gstTax,
        services,
        serviceTotal,
        discount,
        totalCharges,
        paidAmount,
        balance,
        paymentStatus,
        invoiceAvailable: true
      };
    });

    return sendSuccess(res, 200, {
      folios,
      activeFolio: folios[0] || null
    }, 'Digital folios loaded successfully from MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load digital folios');
  }
});

// GET /api/v1/guest/feedback
router.get('/feedback', async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const userMobile = req.user?.mobile || '';
    const userName = req.user?.name || '';
    const userEmail = req.user?.email || '';

    const query = [];
    if (userId) query.push({ userId: String(userId) });
    if (userId) query.push({ userId: userId });
    if (userName) query.push({ guestName: userName });
    if (userMobile) query.push({ guestPhone: userMobile });
    if (userEmail) query.push({ guestEmail: userEmail });

    const feedbacks = await Feedback.find(query.length > 0 ? { $or: query } : { guestEmail: '__none__' }).sort({ createdAt: -1 });

    return sendSuccess(res, 200, feedbacks, 'Guest feedback retrieved successfully from MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load guest feedback');
  }
});

// POST /api/v1/guest/feedback
router.post('/feedback', async (req, res) => {
  try {
    const {
      bookingId,
      reservationId,
      hotelName,
      rating,
      categories,
      comments,
      comment,
      reviewText,
      guestName: customGuestName,
      guestEmail: customGuestEmail
    } = req.body;

    const feedbackText = comments || comment || reviewText;
    const feedbackRating = Number(rating) || 5;
    const effectiveBookingId = bookingId || reservationId;

    if (!feedbackText) {
      return sendError(res, 400, 'Review comment text is required');
    }

    // Find matching booking for room details & propertyId
    let propertyId = req.body.propertyId || 'HS-9HQ8P';
    let room = req.body.room || '101';
    let roomType = req.body.roomType || 'Standard Room';
    let guestName = customGuestName || req.user?.name || 'Valued Guest';
    let guestEmail = customGuestEmail || req.user?.email || '';
    let guestPhone = req.user?.mobile || '';

    if (effectiveBookingId) {
      const cleanId = String(effectiveBookingId).replace(/^BK-/, '').replace(/^FOL-/, '');
      const bQuery = [
        { bookingId: effectiveBookingId },
        { id: effectiveBookingId },
        { bookingId: cleanId },
        { id: cleanId }
      ];
      if (mongoose.Types.ObjectId.isValid(cleanId)) {
        bQuery.unshift({ _id: cleanId });
      }
      const b = await Booking.findOne({ $or: bQuery });
      if (b) {
        propertyId = b.propertyId || 'HS-9HQ8P';
        room = b.roomNumber || (b.room ? String(b.room).match(/\b\d{3,4}\b/)?.[0] || b.room.split(' ')[0] : '101');
        roomType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : (b.room || 'Standard Room'));
        if (b.hotel || b.hotelName) hotelName = b.hotel || b.hotelName;
      }
    }

    const ratingNum = Number(rating) || 5;
    const sentiment = ratingNum >= 4 ? 'Positive' : ratingNum === 3 ? 'Neutral' : 'Negative';

    // Single source of truth: Create Feedback document in MongoDB 'feedbacks' collection
    const newFeedback = await Feedback.create({
      bookingId: effectiveBookingId || `BK-${Date.now().toString().slice(-5)}`,
      guestName: guestName || req.user?.name || 'Guest',
      guestEmail: guestEmail || req.user?.email || '',
      guestPhone: guestPhone,
      userId: req.user?._id || req.user?.id || null,
      room,
      roomType,
      rating: feedbackRating,
      ratings: {
        cleanliness: categories?.cleanliness || 5,
        service: categories?.service || 5,
        room: categories?.room || categories?.comfort || 5,
        food: categories?.food || categories?.amenities || 5,
        staff: categories?.staff || categories?.service || 5,
        overall: feedbackRating
      },
      category: 'Guest Stay Review',
      sentiment,
      status: 'Published',
      comment: feedbackText,
      comments: feedbackText,
      propertyName: hotelName || 'Hour Stay Property',
      propertyId
    });

    // Centralized Notification Dispatcher & Socket.IO emitter
    await notifyFeedbackEvent({
      req,
      action: 'created',
      feedback: newFeedback,
      actor: guestName || req.user?.name || 'Guest'
    });

    return sendSuccess(res, 201, { feedback: newFeedback, review: newFeedback }, 'Thank you! Your feedback has been submitted successfully.');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to submit feedback');
  }
});

// PUT /api/v1/guest/feedback/:id - Edit guest feedback
router.put('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, categories, comments, comment, reviewText } = req.body;
    const feedbackText = comments || comment || reviewText;
    const feedbackRating = rating ? Number(rating) : undefined;

    const query = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.unshift({ _id: id });
    }

    const existing = await Feedback.findOne({ $or: query });
    if (!existing) {
      return sendError(res, 404, 'Feedback record not found');
    }

    if (feedbackRating) existing.rating = feedbackRating;
    if (feedbackText) {
      existing.comment = feedbackText;
      existing.comments = feedbackText;
    }
    if (categories) {
      existing.ratings = {
        cleanliness: categories.cleanliness || existing.ratings?.cleanliness || 5,
        service: categories.service || existing.ratings?.service || 5,
        room: categories.room || categories.comfort || existing.ratings?.room || 5,
        food: categories.food || categories.amenities || existing.ratings?.food || 5,
        staff: categories.staff || existing.ratings?.staff || 5,
        overall: feedbackRating || existing.rating || 5
      };
    }
    if (feedbackRating) {
      existing.sentiment = feedbackRating >= 4 ? 'Positive' : feedbackRating === 3 ? 'Neutral' : 'Negative';
    }

    await existing.save();

    await notifyFeedbackEvent({
      req,
      action: 'updated',
      feedback: existing,
      actor: req.user?.name || 'Guest'
    });

    return sendSuccess(res, 200, existing, 'Feedback updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update feedback');
  }
});

// GET /api/v1/guest/profile
router.get('/profile', async (req, res) => {
  try {
    const user = req.user;
    return sendSuccess(res, 200, {
      name: user.name || 'Guest User',
      email: user.email || '',
      mobile: user.mobile || '',
      city: user.city || 'Hyderabad',
      address: user.address || '',
      language: user.language || 'English (IN)',
      currency: user.currency || 'INR (₹)',
      notifications: user.notificationPrefs || {
        emailConfirmations: true,
        smsAlerts: true,
        promotionalOffers: false,
        checkInReminders: true
      }
    }, 'Guest profile retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load profile');
  }
});

// PUT /api/v1/guest/profile
router.put('/profile', async (req, res) => {
  try {
    const { name, email, mobile, city, address, language, currency } = req.body;
    
    let user = null;
    if (req.user && req.user._id) {
      user = await User.findById(req.user._id);
    }
    
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email });
    }

    if (user) {
      if (name) user.name = name;
      if (email) user.email = email;
      if (mobile) user.mobile = mobile;
      if (city) user.city = city;
      if (address) user.address = address;
      if (language) user.language = language;
      if (currency) user.currency = currency;
      await user.save();
    }

    return sendSuccess(res, 200, {
      name: name || req.user.name,
      email: email || req.user.email,
      mobile: mobile || req.user.mobile,
      city: city || req.user.city || 'Hyderabad',
      address: address || req.user.address || '',
      language: language || 'English (IN)',
      currency: currency || 'INR (₹)'
    }, 'Profile information updated successfully in MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update profile');
  }
});

// POST /api/v1/guest/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current password and new password are required');
    }

    if (newPassword.length < 6) {
      return sendError(res, 400, 'New password must be at least 6 characters long');
    }

    let user = null;
    if (req.user && req.user._id) {
      user = await User.findById(req.user._id);
    }

    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email });
    }

    if (user && user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch && user.password !== currentPassword) {
        return sendError(res, 400, 'Current password is incorrect');
      }
      user.password = newPassword;
      await user.save();
    }

    return sendSuccess(res, 200, null, 'Password changed successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to change password');
  }
});

// PUT /api/v1/guest/notifications-settings
router.put('/notifications-settings', async (req, res) => {
  try {
    const { notifications } = req.body;
    let user = null;
    if (req.user && req.user._id) {
      user = await User.findById(req.user._id);
    }

    if (user) {
      user.notificationPrefs = notifications;
      await user.save();
    }

    return sendSuccess(res, 200, notifications, 'Notification preferences saved successfully in MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to save notification settings');
  }
});

let lastGuestSyncMap = new Map();

// Helper to ensure all booking lifecycle events (Check-in, Check-out, Room Assigned, Confirmed) have matching guest notifications
const syncGuestBookingNotifications = async (user) => {
  if (!user) return;
  const userId = user._id || user.id;
  const userKey = String(userId);
  const now = Date.now();
  if (lastGuestSyncMap.has(userKey) && (now - lastGuestSyncMap.get(userKey) < 300000)) return;
  lastGuestSyncMap.set(userKey, now);

  try {
    const userEmail = user.email;
    const userPhone = user.mobile || user.phone;
    const userName = user.name;

    const bQuery = [{ guestId: userId }, { guestId: String(userId) }];
    if (userEmail) bQuery.push({ email: userEmail }, { guestEmail: userEmail });
    if (userPhone) bQuery.push({ phone: userPhone }, { guestPhone: userPhone });
    if (userName) bQuery.push({ guest: userName }, { guestName: userName });

    const [guestBookings, existingNotifs] = await Promise.all([
      Booking.find({ $or: bQuery }).lean(),
      Notification.find({ userId: String(userId) }, { message: 1, title: 1 }).lean()
    ]);

    const existingRefs = new Set();
    for (const n of existingNotifs || []) {
      const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
      const matches = text.match(/([a-z0-9_-]{4,})/g);
      if (matches) {
        for (const m of matches) existingRefs.add(m);
      }
    }

    const toInsert = [];
    for (const b of guestBookings || []) {
      const bId = String(b.bookingId || b._id || b.id || '').trim();
      if (!bId) continue;
      const bIdLower = bId.toLowerCase();
      const hotelName = b.hotel || b.hotelName || b.propertyName || 'Hour Stay Hotel & Suites';
      const roomNum = b.roomNumber || '';
      const roomInfo = roomNum ? `Room ${roomNum} (${b.room || b.roomType || 'Standard Room'})` : (b.room || b.roomType || 'Standard Room');
      const checkIn = b.checkIn || b.checkInDate || 'Today';
      const checkOut = b.checkOut || b.checkOutDate || 'Tomorrow';
      const status = (b.status || '').toLowerCase();
      const propId = b.propertyId || 'HS-9HQ8P';

      if (!existingRefs.has(bIdLower)) {
        existingRefs.add(bIdLower);
        let title = 'Booking Confirmed!';
        let message = `Your stay at ${hotelName} (${roomInfo}) is confirmed for ${checkIn} → ${checkOut}. [Ref: #${bId}]`;
        let category = 'Bookings';

        if (status === 'checked-in' || status === 'checked_in' || status === 'checked in' || status === 'staying' || status === 'active') {
          title = 'Check-in Confirmed!';
          message = `Welcome! Your check-in to ${roomInfo} at ${hotelName} is complete. Enjoy your stay! [Ref: #${bId}]`;
          category = 'Check-in';
        } else if (status === 'checked-out' || status === 'checked_out' || status === 'checked out' || status === 'completed') {
          title = 'Check-out Completed';
          message = `Thank you for staying with us at ${hotelName} (${roomInfo}). We hope you had a pleasant experience! [Ref: #${bId}]`;
          category = 'Stay';
        }

        toInsert.push({
          userId: String(userId),
          role: 'guest',
          propertyId: propId,
          title,
          message,
          category,
          isRead: false,
          createdAt: b.updatedAt || b.createdAt || new Date()
        });
      }
    }

    if (toInsert.length > 0) {
      await Notification.insertMany(toInsert);
    }
  } catch (err) {
    console.error('syncGuestBookingNotifications error:', err.message);
  }
};

// GET /api/v1/guest/notifications
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const userIdStr = String(userId || '');
    const userEmail = req.user?.email;
    const userPhone = req.user?.mobile || req.user?.phone;
    const userName = req.user?.name;

    setImmediate(() => {
      syncGuestBookingNotifications(req.user).catch(() => {});
    });

    // 1. Collect all bookings for this guest
    const bQuery = [
      { guestId: userId },
      { guestId: userIdStr },
      { userId: userId },
      { userId: userIdStr }
    ];
    if (userEmail) bQuery.push({ email: userEmail }, { guestEmail: userEmail });
    if (userPhone) bQuery.push({ phone: userPhone }, { guestPhone: userPhone });
    if (userName) bQuery.push({ guest: userName }, { guestName: userName });

    let guestBookings = [];
    try {
      guestBookings = await Booking.find({ $or: bQuery });
    } catch (_) {}

    const myBookingIds = new Set();
    for (const b of guestBookings) {
      if (b.bookingId) myBookingIds.add(String(b.bookingId).trim().toLowerCase());
      if (b._id) myBookingIds.add(String(b._id).trim().toLowerCase());
      if (b.id) myBookingIds.add(String(b.id).trim().toLowerCase());
    }

    // 2. Build targeted notification query
    const notifQuery = [
      { userId: userId },
      { userId: userIdStr }
    ];
    if (userEmail) notifQuery.push({ userId: userEmail });
    if (userPhone) notifQuery.push({ userId: userPhone });

    for (const b of guestBookings) {
      const bId = b.bookingId || String(b._id) || b.id;
      if (bId) {
        notifQuery.push({ message: { $regex: bId, $options: 'i' } });
        notifQuery.push({ title: { $regex: bId, $options: 'i' } });
      }
    }

    // General broadcast announcements (broadcast with no specific user ID)
    notifQuery.push({
      role: { $in: ['guest', 'all'] },
      userId: { $in: [null, undefined, '', 'all'] },
      category: { $in: ['General', 'Announcement', 'Announcements', 'Promo', 'Promotions', 'System'] }
    });

    let list = await Notification.find({ $or: notifQuery });

    if (Array.isArray(list)) {
      list = list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    // 3. Strictly filter out any other guest's notifications
    const seen = new Set();
    const unique = [];
    for (const n of list || []) {
      const notifUserId = n.userId ? String(n.userId).trim().toLowerCase() : '';
      const isMyUserId = notifUserId === '' ||
                         notifUserId === 'null' ||
                         notifUserId === 'undefined' ||
                         notifUserId === 'all' ||
                         notifUserId === userIdStr.toLowerCase() ||
                         (userEmail && notifUserId === userEmail.toLowerCase()) ||
                         (userPhone && notifUserId === userPhone.toLowerCase());

      // Extract any booking references from title and message
      const combined = `${n.title || ''} ${n.message || ''}`;
      const refMatches = combined.match(/Ref:\s*#?([A-Za-z0-9-]+)/gi) || [];
      const bkMatches = combined.match(/\b(BK-[A-Za-z0-9-]+)\b/gi) || [];
      const allRefs = [...refMatches, ...bkMatches].map(r => r.replace(/Ref:\s*#?/i, '').replace(/#/g, '').trim().toLowerCase());

      if (allRefs.length > 0) {
        // Notification references booking(s) - must belong to this guest's bookings
        const matchesMyBooking = allRefs.some(ref => {
          for (const myId of myBookingIds) {
            if (myId.includes(ref) || ref.includes(myId)) return true;
          }
          return false;
        });

        if (!matchesMyBooking) {
          // Belongs to another guest's booking! Skip.
          continue;
        }
      } else {
        // No booking reference: if targeted to another user, skip
        if (!isMyUserId) {
          continue;
        }
      }

      // Ensure manager/admin internal operational alerts don't leak
      const nRole = (n.role || '').toLowerCase();
      if ((nRole === 'manager' || nRole === 'admin' || nRole === 'super-admin' || nRole === 'receptionist') && !isMyUserId) {
        continue;
      }

      const id = n._id ? String(n._id) : (n.id ? String(n.id) : '');
      const key = `${(n.title || '').trim().toLowerCase()}__${(n.message || '').trim().toLowerCase()}`;
      if (!seen.has(id) && !seen.has(key)) {
        if (id) seen.add(id);
        seen.add(key);
        unique.push(n);
      }
    }

    return sendSuccess(res, 200, unique, 'Guest notifications fetched successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to fetch notifications');
  }
});

const handleMarkGuestNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { title: reqTitle, message: reqMsg } = req.body || {};
    const userId = req.user?.id || req.user?._id;
    const userIdStr = String(userId || '');

    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    let notif = await Notification.findOneAndUpdate({ $or: idQuery }, { isRead: true }, { new: true }).catch(() => null);
    if (!notif && isObjectId) {
      notif = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true }).catch(() => null);
    }
    
    const title = notif?.title || reqTitle;
    const message = notif?.message || reqMsg;

    if (title && message) {
      const userScoping = [
        { userId: userId },
        { userId: userIdStr }
      ];
      if (req.user?.email) userScoping.push({ userId: req.user.email });
      if (req.user?.mobile || req.user?.phone) userScoping.push({ userId: req.user?.mobile || req.user?.phone });

      await Notification.updateMany({
        title,
        message,
        $or: userScoping
      }, { isRead: true }).catch(() => null);
    }

    const io = req.app.get('socketio');
    if (io) {
      const targetProp = notif?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, targetProp, 'unread_notifications_count_updated', { userId: req.user?.id || req.user?._id });
      emitRealtimeSync(io, targetProp, 'dashboard_sync', { action: 'guest_notification_read', id });
    }

    return sendSuccess(res, 200, notif || { id, isRead: true }, 'Notification marked as read');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to mark notification as read');
  }
};

router.patch('/notifications/:id/read', handleMarkGuestNotificationRead);
router.post('/notifications/:id/read', handleMarkGuestNotificationRead);
router.put('/notifications/:id/read', handleMarkGuestNotificationRead);

const handleMarkGuestNotificationUnread = async (req, res) => {
  try {
    const { id } = req.params;
    const { title: reqTitle, message: reqMsg } = req.body || {};
    const userId = req.user?.id || req.user?._id;
    const userIdStr = String(userId || '');

    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    let notif = await Notification.findOneAndUpdate({ $or: idQuery }, { isRead: false }, { new: true }).catch(() => null);
    if (!notif && isObjectId) {
      notif = await Notification.findByIdAndUpdate(id, { isRead: false }, { new: true }).catch(() => null);
    }

    const title = notif?.title || reqTitle;
    const message = notif?.message || reqMsg;

    if (title && message) {
      const userScoping = [
        { userId: userId },
        { userId: userIdStr }
      ];
      if (req.user?.email) userScoping.push({ userId: req.user.email });
      if (req.user?.mobile || req.user?.phone) userScoping.push({ userId: req.user?.mobile || req.user?.phone });

      await Notification.updateMany({
        title,
        message,
        $or: userScoping
      }, { isRead: false }).catch(() => null);
    }

    const io = req.app.get('socketio');
    if (io) {
      const targetProp = notif?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, targetProp, 'unread_notifications_count_updated', { userId: req.user?.id || req.user?._id });
      emitRealtimeSync(io, targetProp, 'dashboard_sync', { action: 'guest_notification_unread', id });
    }

    return sendSuccess(res, 200, notif || { id, isRead: false }, 'Notification marked as unread');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to mark notification as unread');
  }
};

router.patch('/notifications/:id/unread', handleMarkGuestNotificationUnread);
router.post('/notifications/:id/unread', handleMarkGuestNotificationUnread);
router.put('/notifications/:id/unread', handleMarkGuestNotificationUnread);

const handleMarkAllGuestNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userIdStr = String(userId || '');
    const userEmail = req.user?.email;
    const userPhone = req.user?.mobile || req.user?.phone;
    const userName = req.user?.name;

    const notifQuery = [
      { userId: userId },
      { userId: userIdStr }
    ];
    if (userEmail) notifQuery.push({ userId: userEmail });
    if (userPhone) notifQuery.push({ userId: userPhone });

    try {
      const bQuery = [
        { guestId: userId },
        { guestId: userIdStr },
        { userId: userId },
        { userId: userIdStr }
      ];
      if (userEmail) bQuery.push({ email: userEmail }, { guestEmail: userEmail });
      if (userPhone) bQuery.push({ phone: userPhone }, { guestPhone: userPhone });
      if (userName) bQuery.push({ guest: userName }, { guestName: userName });
      const guestBookings = await Booking.find({ $or: bQuery });
      for (const b of guestBookings) {
        const bId = b.bookingId || String(b._id) || b.id;
        if (bId) {
          notifQuery.push({ message: { $regex: bId, $options: 'i' } });
          notifQuery.push({ title: { $regex: bId, $options: 'i' } });
        }
      }
    } catch (_) {}

    await Notification.updateMany(
      { $or: notifQuery },
      { isRead: true }
    );

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'unread_notifications_count_updated', { userId });
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'all_guest_notifications_read', userId });
    }

    return sendSuccess(res, 200, null, 'All guest notifications marked as read');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to mark all as read');
  }
};

router.patch('/notifications/read-all', handleMarkAllGuestNotificationsRead);
router.post('/notifications/read-all', handleMarkAllGuestNotificationsRead);
router.put('/notifications/read-all', handleMarkAllGuestNotificationsRead);

router.get('/notifications/unread-count', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const uIdStr = String(userId || '');
    const userEmail = req.user?.email;

    const count = await Notification.countDocuments({
      isRead: false,
      $or: [
        { userId: uIdStr },
        { userId: userEmail },
        { role: 'guest', userId: { $in: [null, undefined, '', 'all'] } }
      ]
    });
    return sendSuccess(res, 200, { unreadCount: count }, 'Unread count retrieved');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

router.delete('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idQuery = mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }, { id }] : [{ _id: id }, { id }];
    await Notification.deleteMany({ $or: idQuery });
    return sendSuccess(res, 200, { id }, 'Notification removed successfully');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// Extend guest stay with dynamic payment calculation
const handleGuestExtendStay = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      additionalNights,
      extendHours,
      newCheckOut,
      additionalAmount,
      paymentMethod = 'UPI',
      paidNow = false
    } = req.body;

    const bookingQuery = [{ id }, { bookingId: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      bookingQuery.unshift({ _id: id });
    }

    const booking = await Booking.findOne({ $or: bookingQuery });
    if (!booking) {
      return sendError(res, 404, 'Stay booking record not found.');
    }

    const bStatus = String(booking.status || '').toLowerCase().trim();
    if (['checked-out', 'checked out', 'completed', 'cancelled'].includes(bStatus)) {
      return sendError(res, 400, 'Cannot extend stay for a checked-out reservation.');
    }


    const currentNights = Number(booking.nights || 1);
    const currentAmount = Number(booking.amount || booking.totalAmount || 0);
    const dailyRate = currentNights > 0 ? (currentAmount / currentNights) : 3000;

    let finalAdditionalNights = Number(additionalNights) || 0;
    let finalAdditionalAmount = Number(additionalAmount) || 0;
    let finalNewCheckOut = newCheckOut;

    if (extendHours && !finalAdditionalNights) {
      // Hourly extension
      const hourlyRate = Math.round(dailyRate / 24);
      if (!finalAdditionalAmount) finalAdditionalAmount = Number(extendHours) * (hourlyRate || 300);
      if (!finalNewCheckOut) {
        let curDt;
        try { curDt = new Date(booking.checkOut); } catch (_) { curDt = new Date(); }
        finalNewCheckOut = new Date(curDt.getTime() + (Number(extendHours) * 3600000)).toISOString();
      }
    } else {
      // Nightly / Daily extension
      if (!finalAdditionalNights && finalNewCheckOut) {
        let curDt, nextDt;
        try { curDt = new Date(booking.checkOut); } catch (_) { curDt = new Date(); }
        try { nextDt = new Date(finalNewCheckOut); } catch (_) { nextDt = new Date(curDt.getTime() + 86400000); }
        finalAdditionalNights = Math.max(1, Math.round((nextDt - curDt) / 86400000));
      }
      if (!finalAdditionalNights) finalAdditionalNights = 1;
      if (!finalAdditionalAmount) finalAdditionalAmount = Math.round(dailyRate * finalAdditionalNights);
      if (!finalNewCheckOut) {
        let curDt;
        try { curDt = new Date(booking.checkOut); } catch (_) { curDt = new Date(); }
        finalNewCheckOut = new Date(curDt.getTime() + (finalAdditionalNights * 86400000)).toISOString();
      }
    }

    const newTotalAmount = currentAmount + finalAdditionalAmount;
    let newBalance = Number(booking.balance || 0);
    if (paidNow) {
      try {
        await Payment.create({
          bookingId: booking.bookingId || booking._id || booking.id,
          guestName: booking.guest || req.user.name,
          amount: finalAdditionalAmount,
          paymentMethod: paymentMethod || 'UPI',
          status: 'Settled',
          propertyId: booking.propertyId || 'HS-9HQ8P'
        });
      } catch (_) {}
    } else {
      newBalance += finalAdditionalAmount;
    }

    const updated = await Booking.findOneAndUpdate(
      { $or: bookingQuery },
      {
        checkOut: finalNewCheckOut,
        nights: currentNights + (finalAdditionalNights || 0),
        hours: (Number(booking.hours) || 0) + (Number(extendHours) || 0),
        amount: newTotalAmount,
        totalAmount: newTotalAmount,
        balance: newBalance,
        paymentStatus: newBalance === 0 ? 'Paid' : 'Partial'
      },
      { new: true }
    );

    const propId = booking.propertyId || req.user?.propertyId || 'HS-9HQ8P';

    // Single unified alert to Manager & Receptionist
    await triggerNotification({
      req,
      role: 'manager',
      propertyId: propId,
      title: 'Guest Extended Stay',
      message: `Guest ${booking.guest || req.user.name} extended stay (+₹${finalAdditionalAmount}). New checkout: ${finalNewCheckOut}.`,
      category: 'Operations',
      data: { bookingId: updated._id, additionalAmount: finalAdditionalAmount, newCheckOut: finalNewCheckOut }
    });

    // Notify Guest Confirmation
    await triggerNotification({
      req,
      userId: req.user._id || req.user.id,
      role: 'guest',
      title: 'Stay Extended Successfully',
      message: `Your stay has been extended. Additional tariff: ₹${finalAdditionalAmount}. New checkout: ${finalNewCheckOut}.`,
      category: 'Booking Confirmation'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'booking_updated', {
        action: 'extend',
        booking: updated,
        bookingId: updated._id,
        checkOut: finalNewCheckOut,
        additionalAmount: finalAdditionalAmount
      });
      emitRealtimeSync(io, propId, 'dashboard_sync', {
        action: 'stay_extended',
        propertyId: propId,
        bookingId: updated._id
      });
    }

    return sendSuccess(res, 200, updated, 'Stay extended successfully!');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to extend booking');
  }
};

// Handle guest refund request submission
const handleGuestRefundRequest = async (req, res) => {
  try {
    const bookingId = req.params?.id || req.body?.bookingId || req.body?.id || req.body?.folioId;
    const {
      amount,
      reason,
      details,
      refundMethod = 'UPI',
      upiId,
      accountHolder,
      accountNumber,
      ifscCode,
      bankName
    } = req.body;

    let booking = null;
    if (bookingId) {
      const cleanId = String(bookingId).replace(/^FOL-/, '');
      const bookingQuery = [
        { bookingId: cleanId },
        { id: cleanId },
        { bookingId: bookingId },
        { id: bookingId }
      ];
      if (mongoose.Types.ObjectId.isValid(cleanId)) {
        bookingQuery.unshift({ _id: cleanId });
      }
      booking = await Booking.findOne({ $or: bookingQuery });
    }

    if (!booking) {
      const userId = req.user?._id || req.user?.id;
      const query = [{ guestId: userId }];
      if (req.user?.email) query.push({ email: req.user.email });
      if (req.user?.mobile) query.push({ phone: req.user.mobile });
      booking = await Booking.findOne({ $or: query }).sort({ createdAt: -1 });
    }

    if (!booking) {
      return sendError(res, 404, 'No matching booking found to submit refund request.');
    }

    const refundAmount = Number(amount) > 0 ? Number(amount) : Number(booking.amount || booking.totalAmount || 0);
    const guestName = booking.guest || req.user?.name || 'Valued Guest';
    const propId = booking.propertyId || req.user?.propertyId || 'HS-9HQ8P';
    const refId = booking.bookingId || booking._id || booking.id;

    const refundData = {
      requestedAmount: refundAmount,
      reason: reason || 'Early Checkout / Cancellation',
      details: details || '',
      refundMethod: refundMethod || 'UPI',
      upiId: upiId || '',
      accountHolder: accountHolder || '',
      accountNumber: accountNumber || '',
      ifscCode: ifscCode || '',
      bankName: bankName || '',
      requestedAt: new Date(),
      status: 'Pending'
    };

    const updated = await Booking.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          refundRequest: refundData,
          refundStatus: 'Pending'
        }
      },
      { new: true }
    );

    try {
      await Approval.findOneAndUpdate(
        { bookingId: refId, category: 'Refund' },
        {
          id: `APP-REF-${refId}`,
          category: 'Refund',
          requestedBy: guestName,
          guest: guestName,
          bookingId: refId,
          room: booking.room || booking.roomType || 'Standard Suite',
          amount: refundAmount,
          value: `₹${refundAmount.toLocaleString('en-IN')}`,
          reason: reason || 'Booking cancellation refund',
          description: `Guest refund request for ${refId} (${refundMethod}). ${details || ''}`,
          status: 'Pending',
          propertyId: propId
        },
        { upsert: true, new: true }
      );
    } catch (appErr) {
      console.warn('Approval record creation notice:', appErr.message);
    }

    // 1. Notify Manager
    await triggerNotification({
      req,
      role: 'manager',
      propertyId: propId,
      title: 'Guest Refund Request Pending',
      message: `Guest ${guestName} submitted a refund request of ₹${refundAmount.toLocaleString('en-IN')} for Booking ${refId}. Reason: ${reason || 'Early checkout/stay cancellation'}.`,
      category: 'Refund Request',
      data: {
        bookingId: updated._id,
        refundAmount,
        reason,
        refundMethod
      }
    });

    // 2. Notify Receptionist
    await triggerNotification({
      req,
      role: 'receptionist',
      propertyId: propId,
      title: 'Guest Refund Request Received',
      message: `Guest ${guestName} (Room ${booking.room || 'N/A'}) requested refund of ₹${refundAmount.toLocaleString('en-IN')} (${refundMethod}).`,
      category: 'Refund Request',
      data: {
        bookingId: updated._id,
        refundAmount
      }
    });

    // 3. Notify Admin
    await triggerNotification({
      req,
      role: 'admin',
      propertyId: propId,
      title: 'Stay Refund Request Logged',
      message: `Folio refund request of ₹${refundAmount.toLocaleString('en-IN')} logged for ${guestName} at property ${propId}.`,
      category: 'Refund Request',
      data: {
        bookingId: updated._id,
        refundAmount
      }
    });

    // 4. Confirm to Guest
    await triggerNotification({
      req,
      userId: req.user?._id || req.user?.id,
      role: 'guest',
      title: 'Refund Request Received',
      message: `Your refund request for ₹${refundAmount.toLocaleString('en-IN')} (Ref: ${refId}) has been received and routed to hotel management for approval.`,
      category: 'Payment Update'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'refund_requested', {
        bookingId: updated._id,
        booking: updated,
        refundData
      });
      emitRealtimeSync(io, propId, 'dashboard_sync', {
        action: 'refund_requested',
        propertyId: propId,
        bookingId: updated._id
      });
    }

    return sendSuccess(res, 200, {
      bookingId: refId,
      refund: refundData,
      booking: updated
    }, 'Refund request submitted successfully to hotel management.');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to submit refund request');
  }
};

// Get guest refund requests history
const handleGetGuestRefundRequests = async (req, res) => {
  try {
    const bookingQuery = buildGuestBookingQuery(req.user, req);

    const bookingsWithRefund = await Booking.find({
      $and: [
        bookingQuery,
        { refundRequest: { $exists: true, $ne: null } }
      ]
    }).sort({ 'refundRequest.requestedAt': -1 });

    const list = bookingsWithRefund.map(b => ({
      bookingId: b.bookingId || b._id,
      hotel: b.hotel || b.hotelName || 'Hour Stay Property',
      room: b.room || b.roomType || 'Standard Room',
      dates: `${b.checkIn} → ${b.checkOut}`,
      refund: b.refundRequest
    }));

    return sendSuccess(res, 200, list, 'Refund requests retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to fetch refund requests');
  }
};

// Get single booking by ID for details & refund assessment
const handleGetSingleBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const cleanId = String(bookingId).replace(/^BK-/, '').replace(/^FOL-/, '');
    const bookingQuery = [
      { bookingId: bookingId },
      { id: bookingId },
      { bookingId: cleanId },
      { id: cleanId }
    ];
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      bookingQuery.unshift({ _id: cleanId });
    }
    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      bookingQuery.unshift({ _id: bookingId });
    }
    const booking = await Booking.findOne({ $or: bookingQuery });
    if (!booking) {
      return sendError(res, 404, 'Booking not found');
    }
    const prop = await Property.findOne({ $or: [{ _id: booking.propertyId }, { id: booking.propertyId }] });
    const checkIn = booking.checkIn || booking.checkInDate || '2026-09-01';
    const checkOut = booking.checkOut || booking.checkOutDate || '2026-09-03';
    const totalAmount = Number(booking.amount || booking.totalAmount || 0);
    const balance = Number(booking.balance || 0);
    const paidAmount = (booking.paymentStatus === 'Paid' || booking.status === 'Confirmed' || booking.status === 'Cancelled' || booking.status === 'Checked-out') 
      ? Math.max(0, totalAmount - balance) 
      : Number(booking.paidAmount || Math.max(0, totalAmount - balance));

    let cancellationFee = Number(booking.cancellationFee || 0);
    if (booking.status === 'Cancelled' && booking.cancellationFee !== undefined) {
      cancellationFee = Number(booking.cancellationFee);
    } else {
      try {
        const checkInDate = new Date(checkIn);
        const now = new Date();
        const diffHours = (checkInDate - now) / (1000 * 60 * 60);
        if (diffHours < 24 && diffHours > -48) {
          const nights = Number(booking.nights) || 1;
          const avgNightRate = nights > 0 ? (totalAmount / nights) : totalAmount;
          cancellationFee = Math.min(paidAmount, Math.round(avgNightRate));
        }
      } catch (_) {
        cancellationFee = 0;
      }
    }
    const refundableAmount = booking.refundableAmount !== undefined 
      ? Number(booking.refundableAmount) 
      : Math.max(0, paidAmount - cancellationFee);

    const result = {
      ...(booking.toObject ? booking.toObject() : booking),
      id: booking.bookingId || booking._id,
      bookingId: booking.bookingId || booking._id,
      hotel: booking.hotel || booking.hotelName || prop?.settings?.hotelName || prop?.name || 'Hour Stay Luxury Hotel',
      room: booking.room || booking.roomType || 'Standard Room',
      roomNumber: booking.roomNumber || '',
      propertyId: booking.propertyId || prop?._id || prop?.id || 'HS-9HQ8P',
      checkIn,
      checkOut,
      dates: `${checkIn} → ${checkOut}`,
      nights: calculateStayNights(checkIn, checkOut) || Number(booking.nights) || 1,
      totalAmount,
      amount: totalAmount,
      paidAmount,
      balance,
      cancellationFee,
      refundableAmount,
      cancellationPolicy: prop?.cancellationPolicy || prop?.settings?.cancellationPolicy || 'Free cancellation up to 24 hours prior to check-in. Cancellations within 24 hours will attract a 1-night tariff penalty.',
      cancellationReason: booking.cancellationReason || '',
      cancellationRemarks: booking.cancellationRemarks || booking.remarks || '',
      refundRequest: booking.refundRequest || null,
      refundStatus: booking.refundStatus || booking.refundRequest?.status || null
    };

    return sendSuccess(res, 200, result, 'Booking details retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load booking details');
  }
};

// Handle guest booking cancellation before check-in
const handleGuestCancelBooking = async (req, res) => {
  try {
    const bookingId = req.params?.id || req.body?.bookingId || req.body?.id;
    const { reason, remarks } = req.body || {};

    let booking = null;
    if (bookingId) {
      const cleanId = String(bookingId).replace(/^BK-/, '').replace(/^FOL-/, '');
      const bookingQuery = [
        { bookingId: bookingId },
        { id: bookingId },
        { bookingId: cleanId },
        { id: cleanId }
      ];
      if (mongoose.Types.ObjectId.isValid(cleanId)) {
        bookingQuery.unshift({ _id: cleanId });
      }
      if (mongoose.Types.ObjectId.isValid(bookingId)) {
        bookingQuery.unshift({ _id: bookingId });
      }
      booking = await Booking.findOne({ $or: bookingQuery });
    }

    if (!booking) {
      return sendError(res, 404, 'Booking not found');
    }

    const currentStatus = (booking.status || '').toLowerCase();
    if (currentStatus === 'checked-in' || currentStatus === 'checked_in' || currentStatus === 'active' || currentStatus === 'staying') {
      return sendError(res, 400, 'Cannot cancel a booking after check-in. Please submit an early checkout refund request.');
    }
    if (currentStatus === 'checked-out' || currentStatus === 'completed') {
      return sendError(res, 400, 'Cannot cancel a completed stay.');
    }

    const totalAmount = Number(booking.amount || booking.totalAmount || 0);
    const balance = Number(booking.balance || 0);
    const totalPaid = (booking.paymentStatus === 'Paid' || booking.status === 'Confirmed') 
      ? Math.max(0, totalAmount - balance) 
      : Number(booking.paidAmount || Math.max(0, totalAmount - balance));

    // Calculate cancellation fee based on policy (24h before check-in window)
    let cancellationFee = 0;
    try {
      const checkInDate = new Date(booking.checkIn);
      const now = new Date();
      const diffHours = (checkInDate - now) / (1000 * 60 * 60);
      if (diffHours < 24) {
        const nights = Number(booking.nights) || 1;
        const avgNightRate = nights > 0 ? (totalAmount / nights) : totalAmount;
        cancellationFee = Math.min(totalPaid, Math.round(avgNightRate));
      }
    } catch (_) {
      cancellationFee = 0;
    }

    const refundableAmount = Math.max(0, totalPaid - cancellationFee);

    const updated = await Booking.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          status: 'Cancelled',
          cancellationReason: reason || 'Guest requested cancellation before check-in',
          cancellationRemarks: remarks || '',
          cancellationFee: cancellationFee,
          refundableAmount: refundableAmount,
          cancelledAt: new Date()
        }
      },
      { new: true }
    );

    const propId = booking.propertyId || req.user?.propertyId || 'HS-9HQ8P';
    const guestName = booking.guest || req.user?.name || 'Valued Guest';
    const refId = booking.bookingId || booking._id || booking.id;

    // Release operational room status if assigned
    const roomNum = extractRoomNumber(booking.room || booking.roomNumber);
    if (roomNum) {
      await Room.findOneAndUpdate(
        { propertyId: propId, roomNumber: roomNum },
        { status: 'Available' }
      );
    }

    // 1. Notify Manager
    await triggerNotification({
      req,
      role: 'manager',
      propertyId: propId,
      title: 'Upcoming Booking Cancelled',
      message: `Guest ${guestName} cancelled Booking ${refId}. Refundable: ₹${refundableAmount.toLocaleString('en-IN')}. Reason: ${reason || 'Before check-in cancellation'}.`,
      category: 'Alerts',
      data: { bookingId: updated._id, cancellationFee, refundableAmount }
    });

    // 2. Notify Receptionist
    await triggerNotification({
      req,
      role: 'receptionist',
      propertyId: propId,
      title: 'Booking Cancelled by Guest',
      message: `Booking ${refId} for ${guestName} was cancelled before check-in.`,
      category: 'Alerts',
      data: { bookingId: updated._id }
    });

    // 3. Confirm to Guest
    await triggerNotification({
      req,
      userId: req.user?._id || req.user?.id,
      role: 'guest',
      title: 'Booking Cancelled',
      message: `Your booking ${refId} has been cancelled. Refundable amount: ₹${refundableAmount.toLocaleString('en-IN')}. You can now submit your refund request.`,
      category: 'Alerts'
    });

    const io = req.app.get('socketio');
    if (io) {
      try {
        emitRealtimeSync(io, propId, 'booking_updated', {
          action: 'cancelled',
          booking: updated,
          bookingId: updated._id
        });
        emitRealtimeSync(io, propId, 'dashboard_sync', {
          action: 'booking_cancelled',
          propertyId: propId,
          bookingId: updated._id
        });
      } catch (_) {}
    }

    return sendSuccess(res, 200, {
      booking: updated,
      refundableAmount,
      cancellationFee
    }, 'Booking cancelled successfully. You can now request your refund.');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to cancel booking');
  }
};

router.get('/bookings/:id', handleGetSingleBooking);
router.post('/bookings/:id/cancel', handleGuestCancelBooking);
router.put('/bookings/:id/cancel', handleGuestCancelBooking);
router.post('/bookings/cancel', handleGuestCancelBooking);

router.post('/refund', handleGuestRefundRequest);
router.post('/refund-request', handleGuestRefundRequest);
router.post('/refund/:id', handleGuestRefundRequest);
router.post('/refund-request/:id', handleGuestRefundRequest);
router.post('/bookings/:id/refund', handleGuestRefundRequest);
router.get('/refunds', handleGetGuestRefundRequests);
router.get('/refund-requests', handleGetGuestRefundRequests);

// ==========================================
// GUEST PAYMENTS & LEDGER
// ==========================================
// GET /api/v1/guest/payments - Real MongoDB payment transactions for logged-in guest
router.get('/payments', async (req, res) => {
  try {
    const properties = await Property.find({});
    const userId = req.user._id || req.user.id;

    const bookingQuery = buildGuestBookingQuery(req.user, req);

    // Fetch all bookings belonging strictly to the logged-in guest
    const guestBookings = await Booking.find(bookingQuery).sort({ createdAt: -1 });

    const bookingIds = guestBookings.map(b => b.bookingId || b._id || b.id).filter(Boolean);
    const stringIds = guestBookings.map(b => String(b._id)).filter(Boolean);

    // Fetch payment records in Payment collection
    const paymentQuery = [
      { bookingId: { $in: [...bookingIds, ...stringIds] } }
    ];
    if (req.user?.name) {
      paymentQuery.push({ guestName: req.user.name });
    }
    const loggedPayments = await Payment.find({ $or: paymentQuery }).sort({ createdAt: -1 });

    const paymentList = [];
    const seenTxnIds = new Set();

    for (const b of guestBookings) {
      const prop = properties.find(p => p._id === b.propertyId || p.id === b.propertyId || p._id === b.hotelId);
      const propName = b.hotel || b.hotelName || b.propertyName || (prop ? (prop.settings?.hotelName || prop.name) : 'Hour Stay Property');
      const city = b.city || (prop ? (prop.settings?.city || prop.city) : 'Hyderabad');
      const address = prop ? (prop.settings?.address || prop.address || `${city}, India`) : 'Hitech City, Hyderabad, Telangana';
      const gstNo = prop?.settings?.gstin || '36AABCS1429B1Z5';

      const checkIn = b.checkIn || b.checkInDate || '2026-09-01';
      const checkOut = b.checkOut || b.checkOutDate || '2026-09-03';
      const bId = b.bookingId || b._id || b.id;

      const { totalAmount, originalAmount, discountAmount, couponCode } = getBookingEffectiveAmounts(b);
      const balance = Number(b.balance || 0);
      const isBookingRefunded = b.paymentStatus === 'Refunded' || b.refundStatus === 'Refunded' || b.refundRequest?.status === 'Refunded';
      const isPartiallyRefunded = b.paymentStatus === 'Partially Refunded' || b.refundStatus === 'Partially Refunded' || b.refundRequest?.status === 'Partially Refunded';

      const matchedPayments = loggedPayments.filter(p =>
        (p.bookingId && (p.bookingId === b.bookingId || p.bookingId === String(b._id) || p.bookingId === b.id)) ||
        (p.guestName && p.guestName === (b.guest || req.user.name) && p.roomNumber === (b.roomNumber || extractRoomNumber(b.room)))
      );

      const roomCharges = Math.round(totalAmount * 0.82);
      const gstTax = Math.round(totalAmount * 0.18);
      const services = Array.isArray(b.services) ? b.services : [];
      const serviceTotal = services.reduce((acc, s) => acc + Number(s.amount || 0), 0);
      const discount = discountAmount || Number(b.discount || 0);

      let refundObj = null;
      if (b.refundRequest || b.refundStatus || isBookingRefunded || isPartiallyRefunded) {
        refundObj = {
          status: b.refundStatus || b.refundRequest?.status || (isBookingRefunded ? 'Refunded' : 'Pending'),
          requestedAmount: Number(b.refundRequest?.requestedAmount || b.refundableAmount || totalAmount),
          approvedAmount: Number(b.refundRequest?.approvedAmount || (isBookingRefunded ? (b.refundableAmount || totalAmount) : 0)),
          cancellationFee: Number(b.cancellationFee || 0),
          reason: b.refundRequest?.reason || b.cancellationReason || 'Booking Cancellation / Early Checkout',
          refundMethod: b.refundRequest?.refundMethod || 'UPI',
          upiId: b.refundRequest?.upiId || '',
          accountNumber: b.refundRequest?.accountNumber || '',
          bankName: b.refundRequest?.bankName || '',
          utrNumber: b.refundRequest?.utrNumber || b.refundRequest?.transactionRef || (isBookingRefunded ? `UTR-${Date.now().toString().slice(-8)}` : ''),
          requestedAt: b.refundRequest?.requestedAt || b.cancelledAt || b.createdAt,
          processedAt: b.refundRequest?.processedAt || (isBookingRefunded ? b.updatedAt : null)
        };
      }

      if (matchedPayments.length > 0) {
        for (const p of matchedPayments) {
          const pStatusRaw = (p.status || '').toLowerCase();
          let finalStatus = 'Successful';
          if (isBookingRefunded || pStatusRaw === 'refunded') {
            finalStatus = 'Refunded';
          } else if (isPartiallyRefunded || pStatusRaw === 'partially refunded') {
            finalStatus = 'Partially Refunded';
          } else if (pStatusRaw === 'pending' || b.paymentStatus === 'Pending') {
            finalStatus = 'Pending';
          } else if (pStatusRaw === 'processing') {
            finalStatus = 'Processing';
          } else if (pStatusRaw === 'failed') {
            finalStatus = 'Failed';
          } else if (pStatusRaw === 'settled' || pStatusRaw === 'paid' || b.paymentStatus === 'Paid') {
            finalStatus = 'Successful';
          }

          // Ensure payment amount reflects actual discounted amount if a promo was used
          let effectivePayAmount = Number(p.amount || totalAmount);
          if (discountAmount > 0) {
            if (originalAmount > 0 && effectivePayAmount === originalAmount && effectivePayAmount > totalAmount) {
              effectivePayAmount = totalAmount;
            } else if (effectivePayAmount > totalAmount) {
              effectivePayAmount = totalAmount;
            }
          }

          const txnId = p._id ? String(p._id) : `PAY-${bId}`;
          if (!seenTxnIds.has(txnId)) {
            seenTxnIds.add(txnId);
            paymentList.push({
              id: txnId,
              paymentId: `PAY-${bId}`,
              bookingId: bId,
              guestName: b.guest || req.user.name,
              hotel: propName,
              city: city,
              address: address,
              gstNo: gstNo,
              propertyId: b.propertyId || prop?._id || 'HS-9HQ8P',
              room: b.room || b.roomType || 'Standard Room',
              roomNumber: b.roomNumber || p.roomNumber || extractRoomNumber(b.room) || '101',
              amount: effectivePayAmount,
              totalAmount: totalAmount,
              originalAmount: originalAmount,
              discountAmount: discountAmount,
              couponCode: couponCode,
              paidAmount: totalAmount - balance,
              balance: balance,
              paymentMethod: p.paymentMethod || b.paymentMethod || 'UPI',
              status: finalStatus,
              checkIn: checkIn,
              checkOut: checkOut,
              dates: `${checkIn} → ${checkOut}`,
              nights: Number(b.nights) || 1,
              createdAt: p.createdAt || b.createdAt || new Date(),
              folio: {
                folioId: `FOL-${bId}`,
                roomCharges,
                gstTax,
                services,
                serviceTotal,
                discount,
                totalCharges: totalAmount + serviceTotal
              },
              refundInfo: refundObj
            });
          }
        }
      } else {
        const isPaid = b.paymentStatus === 'Paid' || b.status === 'Confirmed' || b.status === 'Checked-in' || b.status === 'Checked-out';
        let status = 'Successful';
        if (isBookingRefunded) {
          status = 'Refunded';
        } else if (isPartiallyRefunded) {
          status = 'Partially Refunded';
        } else if (b.status === 'Cancelled' && b.paymentStatus === 'Failed') {
          status = 'Failed';
        } else if (b.paymentStatus === 'Pending' || (!isPaid && balance >= totalAmount)) {
          status = 'Pending';
        } else if (balance > 0 && balance < totalAmount) {
          status = 'Successful';
        }

        const txnId = `PAY-${bId}`;
        if (!seenTxnIds.has(txnId)) {
          seenTxnIds.add(txnId);
          paymentList.push({
            id: txnId,
            paymentId: txnId,
            bookingId: bId,
            guestName: b.guest || req.user.name,
            hotel: propName,
            city: city,
            address: address,
            gstNo: gstNo,
            propertyId: b.propertyId || prop?._id || 'HS-9HQ8P',
            room: b.room || b.roomType || 'Standard Room',
            roomNumber: b.roomNumber || extractRoomNumber(b.room) || '101',
            amount: isPaid ? (totalAmount - balance || totalAmount) : totalAmount,
            totalAmount: totalAmount,
            paidAmount: isPaid ? (totalAmount - balance || totalAmount) : 0,
            balance: balance,
            paymentMethod: b.paymentMethod || 'UPI',
            status: status,
            checkIn: checkIn,
            checkOut: checkOut,
            dates: `${checkIn} → ${checkOut}`,
            nights: Number(b.nights) || 1,
            createdAt: b.createdAt || new Date(),
            folio: {
              folioId: `FOL-${bId}`,
              roomCharges,
              gstTax,
              services,
              serviceTotal,
              discount,
              totalCharges: totalAmount + serviceTotal - discount
            },
            refundInfo: refundObj
          });
        }
      }
    }

    // Sort payments newest first
    paymentList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Calculate Summary Stats
    const totalPaid = paymentList.reduce((acc, p) => {
      if (p.status === 'Successful' || p.status === 'Settled' || p.status === 'Paid') {
        return acc + Number(p.amount || 0);
      }
      return acc;
    }, 0);

    const pendingAmount = guestBookings.reduce((acc, b) => {
      if (b.status !== 'Cancelled' && b.status !== 'Checked-out') {
        return acc + Number(b.balance || (b.paymentStatus === 'Pending' ? b.totalAmount || b.amount : 0));
      }
      return acc;
    }, 0);

    const refundedAmount = paymentList.reduce((acc, p) => {
      if (p.status === 'Refunded' || p.status === 'Partially Refunded') {
        return acc + Number(p.refundInfo?.approvedAmount || p.refundInfo?.requestedAmount || p.amount || 0);
      }
      return acc;
    }, 0);

    return sendSuccess(res, 200, {
      summary: {
        totalPaid,
        pendingAmount,
        refundedAmount,
        totalTransactions: paymentList.length
      },
      payments: paymentList
    }, 'Guest payments and transactions retrieved successfully from MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load guest payments');
  }
});

// POST /api/v1/guest/payments/pay-balance
router.post('/payments/pay-balance', async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod = 'UPI' } = req.body;
    if (!bookingId || amount === undefined || Number(amount) <= 0) {
      return sendError(res, 400, 'Booking ID and valid amount are required.');
    }

    const cleanId = String(bookingId).replace(/^BK-/, '').replace(/^FOL-/, '');
    const bookingQuery = [
      { bookingId: bookingId },
      { id: bookingId },
      { bookingId: cleanId },
      { id: cleanId }
    ];
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      bookingQuery.unshift({ _id: cleanId });
    }
    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      bookingQuery.unshift({ _id: bookingId });
    }

    const booking = await Booking.findOne({ $or: bookingQuery });
    if (!booking) {
      return sendError(res, 404, 'Booking record not found.');
    }

    const payAmount = Number(amount);
    const newBalance = Math.max(0, Number(booking.balance || 0) - payAmount);
    const currentPaid = Number(booking.paidAmount || (Number(booking.amount || booking.totalAmount || 0) - Number(booking.balance || 0)));
    const newPaidAmount = currentPaid + payAmount;
    const isFullyPaid = newBalance === 0;

    booking.balance = newBalance;
    booking.paidAmount = newPaidAmount;
    booking.paymentStatus = isFullyPaid ? 'Paid' : 'Partial';
    if (isFullyPaid && booking.status === 'Pending') {
      booking.status = 'Confirmed';
    }
    await booking.save();

    const propId = booking.propertyId || req.user?.propertyId || 'HS-9HQ8P';
    const guestName = booking.guest || req.user.name || 'Valued Guest';
    const refId = booking.bookingId || booking._id || booking.id;

    const newPayment = await Payment.create({
      bookingId: refId,
      guestName: guestName,
      roomNumber: booking.roomNumber || extractRoomNumber(booking.room) || '101',
      amount: payAmount,
      paymentMethod: paymentMethod || 'UPI',
      status: 'Settled',
      propertyId: propId
    });

    // Notify Manager
    await triggerNotification({
      req,
      role: 'manager',
      propertyId: propId,
      title: 'Payment Received',
      message: `Guest ${guestName} paid ₹${payAmount.toLocaleString('en-IN')} via ${paymentMethod} for booking ${refId}. Balance: ₹${newBalance}.`,
      category: 'Payments',
      data: { bookingId: booking._id, amount: payAmount, paymentMethod }
    });

    // Notify Receptionist
    await triggerNotification({
      req,
      role: 'receptionist',
      propertyId: propId,
      title: 'Payment Logged',
      message: `Folio balance payment ₹${payAmount.toLocaleString('en-IN')} received for Room ${booking.room || 'N/A'}.`,
      category: 'Payments',
      data: { bookingId: booking._id, amount: payAmount }
    });

    // Confirm to Guest
    await triggerNotification({
      req,
      userId: req.user._id || req.user.id,
      role: 'guest',
      title: 'Payment Successful',
      message: `Your payment of ₹${payAmount.toLocaleString('en-IN')} via ${paymentMethod} (Ref: ${refId}) has been processed successfully.`,
      category: 'Payment Update'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'payment_logged', { payment: newPayment, bookingId: booking._id });
      emitRealtimeSync(io, propId, 'payment_updated', { bookingId: booking._id, balance: newBalance });
      emitRealtimeSync(io, propId, 'booking_updated', { booking: booking, action: 'payment' });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'payment_settled' });
    }

    return sendSuccess(res, 200, {
      payment: newPayment,
      booking: booking,
      newBalance: newBalance
    }, 'Payment processed successfully and balance updated.');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to process payment');
  }
});

// ==========================================
// GUEST SETTINGS & PREFERENCES ENDPOINTS
// ==========================================

// GET /api/v1/guest/settings
router.get('/settings', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return sendError(res, 404, 'User profile not found');
    }

    const defaultNotifs = {
      emailConfirmations: true,
      smsAlerts: true,
      pushNotifications: true,
      promotionalOffers: false,
      checkInReminders: true
    };

    const defaultPrefs = {
      currency: user.currency || 'INR (₹)',
      language: user.language || 'English (IN)',
      theme: 'System',
      biometricLogin: false,
      hapticFeedback: true
    };

    // Fetch Admin Hotel Profile details (support phone, email, hotel name, location)
    let property = null;
    if (user.propertyId && user.propertyId !== 'all') {
      property = await findPropertySafely(user.propertyId, user);
    }
    if (!property) {
      const latestBooking = await Booking.findOne({
        $or: [
          { guestId: String(userId) },
          { guestId: userId },
          { guestEmail: user.email },
          { guestMobile: user.mobile || user.phone || '___' }
        ]
      }).sort({ createdAt: -1 });
      if (latestBooking?.propertyId) {
        property = await findPropertySafely(latestBooking.propertyId);
      }
    }
    if (!property) {
      property = await Property.findOne({
        $or: [
          { _id: 'HS-9HQ8P' },
          { id: 'HS-9HQ8P' }
        ]
      });
    }
    if (!property || (!property.settings?.reservationEmail && !property.settings?.email && !property.settings?.address)) {
      const configuredProp = await Property.findOne({
        $or: [
          { 'settings.reservationEmail': { $exists: true, $nin: ['', null] } },
          { 'settings.email': { $exists: true, $nin: ['', null] } },
          { 'settings.address': { $exists: true, $nin: ['', null] } }
        ]
      });
      if (configuredProp) {
        property = configuredProp;
      }
    }
    if (!property) {
      property = await Property.findOne({ status: 'Active' }) || await Property.findOne();
    }

    const propSettings = property?.settings || {};
    const hotelPhone = (propSettings.contactNumber || propSettings.phone || property?.phone || '+91 1800 266 4687').trim();
    const hotelEmail = (propSettings.reservationEmail || propSettings.email || property?.email || 'concierge@hourstay.com').trim();
    const hotelName = (propSettings.hotelName || propSettings.name || property?.name || 'Speshway Luxury Hotel').trim();
    const hotelAddress = (propSettings.address || property?.address || 'Banjara Hills, Road No. 12').trim();
    const hotelCity = (propSettings.city || property?.city || 'Hyderabad, Telangana').trim();
    const hotelState = (propSettings.state || '').trim();
    const hotelCountry = (propSettings.country || 'India').trim();
    const hotelPincode = (propSettings.pincode || '').trim();

    const hotelProfile = {
      propertyId: property?._id || property?.id || '',
      hotelName,
      phone: hotelPhone,
      email: hotelEmail,
      address: hotelAddress,
      city: hotelCity,
      state: hotelState,
      country: hotelCountry,
      pincode: hotelPincode,
      website: propSettings.website || ''
    };

    return sendSuccess(res, 200, {
      id: user._id || user.id,
      name: user.name || '',
      email: user.email || '',
      mobile: user.mobile || user.phone || '',
      city: user.city || 'Hyderabad',
      address: user.address || '',
      avatar: user.avatar || null,
      hotelProfile,
      notificationSettings: {
        ...defaultNotifs,
        ...(user.notificationSettings || {})
      },
      appPreferences: {
        ...defaultPrefs,
        ...(user.appPreferences || {})
      },
      securitySettings: {
        twoFactorAuth: user.securitySettings?.twoFactorAuth || false,
        lastPasswordChange: user.securitySettings?.lastPasswordChange || user.updatedAt
      }
    }, 'Guest settings retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve settings');
  }
});

// PUT /api/v1/guest/settings
router.put('/settings', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      name,
      mobile,
      city,
      address,
      language,
      currency,
      notificationSettings,
      appPreferences
    } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (mobile !== undefined) updateFields.mobile = mobile.trim();
    if (city !== undefined) updateFields.city = city.trim();
    if (address !== undefined) updateFields.address = address.trim();
    if (language !== undefined) updateFields.language = language;
    if (currency !== undefined) updateFields.currency = currency;

    if (notificationSettings && typeof notificationSettings === 'object') {
      for (const [key, val] of Object.entries(notificationSettings)) {
        updateFields[`notificationSettings.${key}`] = Boolean(val);
      }
    }

    if (appPreferences && typeof appPreferences === 'object') {
      for (const [key, val] of Object.entries(appPreferences)) {
        updateFields[`appPreferences.${key}`] = val;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return sendError(res, 404, 'User not found');
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_updated', updatedUser);
    }

    return sendSuccess(res, 200, {
      id: updatedUser._id || updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      city: updatedUser.city,
      address: updatedUser.address,
      avatar: updatedUser.avatar,
      language: updatedUser.language || updatedUser.appPreferences?.language || 'English (IN)',
      currency: updatedUser.currency || updatedUser.appPreferences?.currency || 'INR (₹)',
      notificationSettings: updatedUser.notificationSettings,
      appPreferences: updatedUser.appPreferences,
      securitySettings: updatedUser.securitySettings
    }, 'Guest settings updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update settings');
  }
});

// PUT /api/v1/guest/notifications-settings
router.put('/notifications-settings', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const settings = req.body || {};

    const updateObj = {};
    for (const [k, v] of Object.entries(settings)) {
      updateObj[`notificationSettings.${k}`] = Boolean(v);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateObj },
      { new: true }
    ).select('-password');

    return sendSuccess(res, 200, updatedUser?.notificationSettings || settings, 'Notification preferences updated');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update notification preferences');
  }
});

// POST /api/v1/guest/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current and new passwords are required');
    }
    if (newPassword.length < 6) {
      return sendError(res, 400, 'New password must be at least 6 characters long');
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User account not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 400, 'Incorrect current password. Please try again.');
    }

    user.password = newPassword;
    if (!user.securitySettings) user.securitySettings = {};
    user.securitySettings.lastPasswordChange = new Date();
    await user.save();

    await triggerNotification({
      req,
      userId: user._id || user.id,
      role: 'guest',
      title: 'Security Alert: Password Changed',
      message: 'Your Hour Stay account password was successfully updated. If this wasn\'t you, please contact support immediately.',
      category: 'Security'
    });

    return sendSuccess(res, 200, {}, 'Password changed successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to change password');
  }
});

// GET /api/v1/guest/export-data
router.get('/export-data', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('-password -otp -otpExpires').lean();
    const bookings = await Booking.find({ $or: [{ guestId: userId }, { email: req.user.email }] }).lean();
    const payments = await Payment.find({ guestName: req.user.name }).lean();
    const feedbacks = await Feedback.find({ $or: [{ userId }, { guestEmail: req.user.email }] }).lean();

    const exportBundle = {
      userProfile: user,
      totalBookings: bookings.length,
      bookings: bookings,
      totalPayments: payments.length,
      payments: payments,
      feedbacks: feedbacks,
      exportedAt: new Date().toISOString(),
      service: 'Hour Stay PMS Platform'
    };

    return sendSuccess(res, 200, exportBundle, 'Guest data bundle exported successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to export account data');
  }
});

// POST /api/v1/guest/delete-account-request
router.post('/delete-account-request', async (req, res) => {
  try {
    const { reason = 'User requested account closure' } = req.body;
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Log deletion request / approval
    await Approval.create({
      title: `Account Deletion Request: ${user.name}`,
      description: `Guest ${user.name} (${user.email}) requested account deletion. Reason: ${reason}`,
      category: 'Guest Account',
      submittedBy: user.name,
      status: 'Pending',
      propertyId: user.propertyId || 'HS-9HQ8P'
    });

    return sendSuccess(res, 200, {}, 'Your account deletion request has been submitted to support and will be processed within 48 hours.');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to submit account deletion request');
  }
});

export default router;


