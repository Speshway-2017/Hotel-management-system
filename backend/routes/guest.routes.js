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

const router = express.Router();

const guestAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (e) {}
  
  if (!req.user) {
    return sendError(res, 401, 'Authentication required to access guest portal');
  }
  next();
};

router.use(guestAuth);

router.get('/rooms', async (req, res) => {
  try {
    const targetPropId = req.user?.propertyId || 'HS-JAI';
    let dbRooms = await Room.find({ propertyId: targetPropId }).sort({ roomNumber: 1 });
    if (!dbRooms || dbRooms.length === 0) {
      dbRooms = await Room.find().sort({ roomNumber: 1 });
    }
    return sendSuccess(res, 200, dbRooms, 'Guest available rooms retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to load rooms');
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const properties = await Property.find({});
    const userId = req.user._id || req.user.id;

    const query = [{ guestId: userId }];
    if (req.user?.email) query.push({ email: req.user.email });
    if (req.user?.mobile) query.push({ phone: req.user.mobile });
    if (req.user?.name) query.push({ guest: req.user.name });

    // Show bookings linked to the logged-in guest
    const bookings = await Booking.find({ $or: query }).sort({ createdAt: -1 });

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
      
      const totalAmount = Number(b.amount || b.totalAmount || 0);
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
        propertyId: b.propertyId || prop?._id || prop?.id || 'HS-JAI',
        checkIn: checkIn,
        checkOut: checkOut,
        nights: Number(b.nights) || calculateStayNights(checkIn, checkOut),
        dates: `${checkIn} → ${checkOut}`,
        amount: totalAmount,
        totalAmount: totalAmount,
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
    const properties = await Property.find({});
    const userId = req.user._id || req.user.id;

    const query = [{ guestId: userId }];
    if (req.user?.email) query.push({ email: req.user.email });
    if (req.user?.mobile) query.push({ phone: req.user.mobile });
    if (req.user?.name) query.push({ guest: req.user.name });

    // Show bookings linked to the logged-in guest
    const bookings = await Booking.find({ $or: query }).sort({ createdAt: -1 });

    const mapped = bookings.map(b => {
      const prop = properties.find(p => p._id === b.propertyId || p.id === b.propertyId || p._id === b.hotelId);
      const propName = b.hotel || b.hotelName || b.propertyName || (prop ? (prop.settings?.hotelName || prop.name) : 'Hour Stay Property');
      const city = b.city || (prop ? (prop.settings?.city || prop.city) : 'Hyderabad');
      const checkIn = b.checkIn || b.checkInDate || '2026-09-01';
      const checkOut = b.checkOut || b.checkOutDate || '2026-09-03';

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
        nights: Number(b.nights) || calculateStayNights(checkIn, checkOut),
        dates: `${checkIn} → ${checkOut}`,
        amount: Number(b.amount || b.totalAmount || 0),
        status: b.status || 'Confirmed',
        paymentStatus: b.paymentStatus || 'Paid',
        balance: Number(b.balance || 0),
        createdAt: b.createdAt
      };
    });

    const upcomingBooking = mapped.find(b => b.status === 'Confirmed' || b.status === 'Paid' || b.status === 'Pending') || null;
    const currentStay = mapped.find(b => b.status === 'Checked-in') || null;
    const totalStays = mapped.length;
    const totalSpent = mapped.reduce((acc, b) => acc + Number(b.amount || 0), 0);

    return sendSuccess(res, 200, {
      stats: {
        upcomingBooking,
        currentStay,
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

    const query = [{ guestId: userId }];
    if (req.user?.email) query.push({ email: req.user.email });
    if (req.user?.mobile) query.push({ phone: req.user.mobile });
    if (req.user?.name) query.push({ guest: req.user.name });

    // Show folios linked to the logged-in guest
    const bookings = await Booking.find({ $or: query }).sort({ createdAt: -1 });

    const folios = bookings.map(b => {
      const prop = properties.find(p => p._id === b.propertyId || p.id === b.propertyId || p._id === b.hotelId);

      const hotel = b.hotel || b.hotelName || b.propertyName || (prop ? (prop.settings?.hotelName || prop.name) : 'Hour Stay Property');
      const city = b.city || (prop ? (prop.settings?.city || prop.city) : 'Hyderabad');
      const address = prop ? (prop.settings?.address || prop.address || `${city}, India`) : 'Hitech City, Hyderabad, Telangana';
      const gstNo = prop?.settings?.gstin || '36AABCS1429B1Z5';

      const baseAmount = Number(b.amount || b.totalAmount || 0);
      const roomCharges = Math.round(baseAmount * 0.82);
      const gstTax = Math.round(baseAmount * 0.18);
      
      const services = Array.isArray(b.services) && b.services.length > 0
        ? b.services
        : [];
      
      const serviceTotal = services.reduce((acc, s) => acc + Number(s.amount || 0), 0);
      const discount = Number(b.discount || 0);
      const totalCharges = baseAmount + serviceTotal - discount;
      const paidAmount = b.paymentStatus === 'Paid' || b.status === 'Confirmed' ? baseAmount : Number(b.paidAmount || 0);
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
    const userMobile = req.user?.mobile || '';
    const userName = req.user?.name || '';
    const userEmail = req.user?.email || '';

    const query = [];
    if (userName) query.push({ guestName: userName });
    if (userMobile) query.push({ guestPhone: userMobile });
    if (userEmail) query.push({ guestEmail: userEmail });

    let feedbacks = await Feedback.find(query.length > 0 ? { $or: query } : {}).sort({ createdAt: -1 });

    if (feedbacks.length === 0) {
      feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
    }

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

    if (!feedbackText) {
      return sendError(res, 400, 'Review comment text is required');
    }

    // Try to find matching booking for room details & propertyId
    let propertyId = req.body.propertyId || 'HS-JAI';
    let room = '101';
    let roomType = 'Standard Room';
    let guestName = customGuestName || req.user?.name || 'Valued Guest';
    let guestEmail = customGuestEmail || req.user?.email || '';

    if (bookingId) {
      const b = await Booking.findOne({
        $or: [{ bookingId: bookingId }, { _id: bookingId.length === 24 ? bookingId : null }, { id: bookingId }]
      });
      if (b) {
        propertyId = b.propertyId || 'HS-JAI';
        room = b.roomNumber || (b.room ? String(b.room).match(/\b\d{3,4}\b/)?.[0] || b.room.split(' ')[0] : '101');
        roomType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : (b.room || 'Standard Room'));
      }
    }

    const ratingNum = Number(rating) || 5;
    const sentiment = ratingNum >= 4 ? 'Positive' : ratingNum === 3 ? 'Neutral' : 'Negative';

    // Single source of truth: Create Feedback document in MongoDB 'feedbacks' collection
    const newFeedback = await Feedback.create({
      bookingId: bookingId || `BK-${Date.now().toString().slice(-5)}`,
      guestName: guestName || req.user?.name || 'Guest',
      guestEmail: guestEmail || req.user?.email || '',
      guestPhone: req.user?.mobile || '',
      userId: req.user?._id || req.user?.id || null,
      room,
      roomType,
      rating: feedbackRating,
      ratings: {
        cleanliness: categories?.cleanliness || 5,
        service: categories?.service || 5,
        room: categories?.room || 5,
        food: categories?.food || 5,
        overall: feedbackRating
      },
      category: 'Guest Stay Review',
      sentiment,
      status: 'Published',
      comment: feedbackText,
      comments: feedbackText,
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

// GET /api/v1/guest/notifications
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    let list = await Notification.find({
      $or: [
        { role: 'guest' },
        { userId: userId }
      ]
    });

    if (Array.isArray(list)) {
      list = list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    if (list.length === 0) {
      const defaultNotifications = [
        {
          userId: userId || 'guest_user_1',
          role: 'guest',
          title: 'Booking Confirmed!',
          message: 'Your stay at Speshway Hotel & Suites (Ref: HS-1001) is confirmed for Sep 01 - Sep 03, 2026.',
          category: 'Booking Confirmation',
          isRead: false
        },
        {
          userId: userId || 'guest_user_1',
          role: 'guest',
          title: 'Payment Received',
          message: 'Payment of ₹4,350 processed successfully via UPI for Deluxe Suite booking (Ref: HS-1001).',
          category: 'Payment Update',
          isRead: false
        },
        {
          userId: userId || 'guest_user_1',
          role: 'guest',
          title: 'Check-in Reminder',
          message: 'Upcoming Stay Reminder: Your check-in at Speshway Hotel & Suites is tomorrow at 02:00 PM.',
          category: 'Check-in Reminder',
          isRead: false
        },
        {
          userId: userId || 'guest_user_1',
          role: 'guest',
          title: 'Service Charge Added',
          message: 'In-room refreshments (₹350) added to your Digital Folio FOL-1001.',
          category: 'Service & Folio',
          isRead: true
        },
        {
          userId: userId || 'guest_user_1',
          role: 'guest',
          title: 'GST Invoice Ready',
          message: 'Official tax invoice for booking HS-1001 is available for instant download.',
          category: 'Invoice Notification',
          isRead: true
        },
        {
          userId: userId || 'guest_user_1',
          role: 'guest',
          title: 'Feedback Request',
          message: 'How was your recent stay? Share your valuable experience and help us improve.',
          category: 'Feedback Reminder',
          isRead: true
        }
      ];

      list = await Notification.insertMany(defaultNotifications);
    }

    return sendSuccess(res, 200, list, 'Guest notifications fetched successfully from MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to fetch notifications');
  }
});

const handleMarkGuestNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    const notif = await Notification.findOneAndUpdate({ $or: idQuery }, { isRead: true }, { new: true });
    
    const io = req.app.get('socketio');
    if (io) {
      const targetProp = notif?.propertyId || 'HS-JAI';
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
    const idQuery = isObjectId ? [{ _id: new mongoose.Types.ObjectId(id) }, { _id: id }, { id }] : [{ _id: id }, { id }];

    const io = req.app.get('socketio');
    if (io) {
      const targetProp = notif?.propertyId || 'HS-JAI';
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
    await Notification.updateMany(
      { isRead: false, $or: [{ role: 'guest' }, { userId: userId }] },
      { isRead: true }
    );

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'HS-JAI', 'unread_notifications_count_updated', { userId });
      emitRealtimeSync(io, 'HS-JAI', 'dashboard_sync', { action: 'all_guest_notifications_read' });
    }

    return sendSuccess(res, 200, null, 'All guest notifications marked as read');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to mark all as read');
  }
};

router.patch('/notifications/read-all', handleMarkAllGuestNotificationsRead);
router.post('/notifications/read-all', handleMarkAllGuestNotificationsRead);
router.put('/notifications/read-all', handleMarkAllGuestNotificationsRead);

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
          propertyId: booking.propertyId || 'HS-JAI'
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

    const propId = booking.propertyId || req.user?.propertyId || 'HS-JAI';

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
    const propId = booking.propertyId || req.user?.propertyId || 'HS-JAI';
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
    const userId = req.user?._id || req.user?.id;
    const query = [{ guestId: userId }];
    if (req.user?.email) query.push({ email: req.user.email });
    if (req.user?.mobile) query.push({ phone: req.user.mobile });

    const bookingsWithRefund = await Booking.find({
      $or: query,
      refundRequest: { $exists: true, $ne: null }
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
      propertyId: booking.propertyId || prop?._id || prop?.id || 'HS-JAI',
      checkIn,
      checkOut,
      dates: `${checkIn} → ${checkOut}`,
      nights: Number(booking.nights) || 1,
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

    const propId = booking.propertyId || req.user?.propertyId || 'HS-JAI';
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

export default router;
