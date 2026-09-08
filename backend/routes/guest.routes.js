import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import Property from '../models/property.model.js';
import Review from '../models/review.model.js';
import Notification from '../models/notification.model.js';
import { Room, Feedback } from '../models/managerData.model.js';
import { emitRealtimeSync } from '../utils/socketEmitter.js';
import { notifyFeedbackEvent } from '../utils/notification.helper.js';
import { calculateStayNights } from '../utils/dateUtils.js';
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

// PATCH /api/v1/guest/notifications/:id/read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    return sendSuccess(res, 200, notif, 'Notification marked as read');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to mark notification as read');
  }
});

// PATCH /api/v1/guest/notifications/read-all
router.patch('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    await Notification.updateMany(
      { $or: [{ role: 'guest' }, { userId: userId }] },
      { isRead: true }
    );
    return sendSuccess(res, 200, null, 'All guest notifications marked as read');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to mark all as read');
  }
});

export default router;
