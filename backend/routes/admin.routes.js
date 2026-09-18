import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';
import { Payment, Feedback, Shift } from '../models/managerData.model.js';
import User from '../models/user.model.js';
import Coupon from '../models/coupon.model.js';
import { getUnifiedFeedbacksAndReviews } from '../utils/unifiedFeedback.helper.js';
import { upload, uploadImageToCloudinary } from '../utils/uploader.js';
import { findPropertySafely, invalidatePropertyCache } from '../utils/propertyCache.js';
import { emitRealtimeSync } from '../utils/socketEmitter.js';
import { triggerNotification, notifyFeedbackEvent } from '../utils/notification.helper.js';
import { extractRoomNumber } from '../utils/roomHelper.js';

const router = express.Router();

router.use(protect);

const defaultSettings = {
  name: "",
  logo: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  phone: "",
  email: "",
  website: "",
  gstin: "",
  classification: "3-Star",
  description: "",
  photos: [],
  amenities: [],
  highlights: [],
  propertyPolicies: "",
  locationMap: "",
  facebook: "",
  instagram: "",
  twitter: "",
  linkedin: "",
  gstEnabled: true,
  cgst: 9,
  sgst: 9,
  igst: 18,
  hsnSac: "996311",
  taxInclusive: true,
  checkInTime: "12:00",
  checkOutTime: "11:00",
  earlyCheckInCharge: 0,
  lateCheckOutCharge: 0,
  cancellationPolicy: "Free cancellation up to 24 hours prior to check-in. Cancellation within 24 hours will attract a 1-night tariff penalty.",
  noShowPolicy: "No-show will attract 100% room charge penalty.",
  refundPolicy: "Refunds are processed within 5-7 business days.",
  paymentMethods: ["UPI", "Card", "Cash"],
  advancePaymentPercent: 100,
  securityDeposit: 0,
  bookingRules: "Guests must produce valid identity documentation on arrival.",
  reservationSettings: "Auto-release unconfirmed rooms after 2 hours.",
  paymentConfig: "Razorpay Checkout API Integration",
  notifyOnBooking: true,
  notifyOnPayment: true,
  notifyOnCancellation: true,
  notifyOnCheckInOut: true,
  notifyOnGuestService: true,
  channelEmail: true,
  channelSms: false,
  channelWhatsApp: true,
  channelPush: false
};

router.get('/dashboard', async (req, res) => {
  try {
    const propertyId = req.user?.propertyId;
    const stats = await calculatePropertyStats(propertyId);
    return sendSuccess(res, 200, stats, 'Admin dashboard metrics retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve dashboard metrics');
  }
});

router.get('/settings', async (req, res) => {
  try {
    const propertyId = req.user?.propertyId;
    let property = await findPropertySafely(propertyId, req.user);
    if (!property) {
      const defaultId = propertyId || "HS-9HQ8P";
      property = await Property.create({
        _id: defaultId,
        id: defaultId,
        name: "Speshway Luxury Hotel",
        city: "Hyderabad, Telangana",
        status: "Active",
        gm: req.user?.name || "Vikram Rathore"
      });
      invalidatePropertyCache(defaultId);
    }
    const settings = {
      ...defaultSettings,
      name: property.name || '',
      hotelName: property.name || '',
      city: property.city || '',
      ...(property.settings || {})
    };
    return sendSuccess(res, 200, settings, 'Property settings retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve settings');
  }
});

router.put('/settings', async (req, res) => {
  try {
    let propertyId = req.user?.propertyId;
    const { settings } = req.body;
    if (!settings) {
      return sendError(res, 400, 'Settings payload is required');
    }

    let property = await findPropertySafely(propertyId, req.user);
    if (!property) {
      return sendError(res, 404, 'Assigned Property document not found in MongoDB');
    }

    propertyId = property._id || property.id;

    // Field normalization: Sync both new and existing field aliases inside settings object
    const hotelName = settings.hotelName || settings.name || property.name;
    const city = settings.city || property.city;
    const reservationEmail = settings.reservationEmail || settings.email || property.settings?.reservationEmail || property.settings?.email || "";
    const contactNumber = settings.contactNumber || settings.phone || property.settings?.contactNumber || property.settings?.phone || "";
    const gallery = settings.gallery || settings.photos || property.settings?.gallery || property.settings?.photos || [];
    const policies = settings.policies || settings.propertyPolicies || property.settings?.policies || property.settings?.propertyPolicies || "";

    const mergedSettings = {
      ...(property.settings || {}),
      ...settings,
      hotelName,
      name: hotelName,
      reservationEmail,
      email: reservationEmail,
      contactNumber,
      phone: contactNumber,
      gallery,
      photos: gallery,
      policies,
      propertyPolicies: policies
    };

    const updateFields = {
      settings: mergedSettings
    };

    if (hotelName) {
      updateFields.name = hotelName;
    }
    if (city) {
      updateFields.city = city;
    }

    const updatedProperty = await Property.findByIdAndUpdate(propertyId, updateFields, { new: true });
    invalidatePropertyCache(propertyId);
    
    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propertyId, 'property_updated', { property: updatedProperty, propertyId });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { propertyId, action: 'settings_updated' });
    }

    return sendSuccess(res, 200, {
      ...updatedProperty.settings,
      name: updatedProperty.name,
      hotelName: updatedProperty.name,
      city: updatedProperty.city,
      ...(updatedProperty.settings || {})
    }, 'Property settings saved to MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update settings');
  }
});

router.patch('/settings', async (req, res) => {
  return router.handle(req, res);
});

router.put('/property', async (req, res) => {
  return router.handle(req, res);
});

router.patch('/property', async (req, res) => {
  return router.handle(req, res);
});

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No image file uploaded');
    }
    const result = await uploadImageToCloudinary(req.file.buffer, 'hms_property_assets');
    return sendSuccess(res, 200, result, 'Image uploaded successfully');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

router.get('/property', async (req, res) => {
  try {
    let propertyId = req.user?.propertyId;
    let property = await findPropertySafely(propertyId, req.user);
    if (!property) {
      const defaultId = propertyId || "HS-JAI";
      property = await Property.create({
        _id: defaultId,
        id: defaultId,
        name: "Hour Stay Rambagh Residency",
        city: "Jaipur",
        status: "Active",
        gm: req.user?.name || "Vikram Rathore"
      });
      invalidatePropertyCache(defaultId);
    }
    return sendSuccess(res, 200, property, 'Property details retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

import SubscriptionPlan from '../models/subscriptionPlan.model.js';

router.post('/subscription/request', async (req, res) => {
  try {
    let property = await findPropertySafely(req.user?.propertyId, req.user);
    if (!property) {
      return sendError(res, 404, 'Property not found for admin context');
    }
    const propertyId = property._id || property.id || req.user?.propertyId;

    let { planName, price } = req.body;
    if (!planName) {
      return sendError(res, 400, 'Plan name is required');
    }

    if (!price || Number(price) <= 0) {
      const foundPlan = await SubscriptionPlan.findOne({ name: planName });
      price = foundPlan ? foundPlan.monthlyPrice : 0;
    }

    // Check for existing pending request
    const existingPending = await SubscriptionRequest.findOne({
      $or: [{ propertyId }, { propertyName: property.name }],
      status: 'Pending'
    });
    if (existingPending) {
      return sendError(res, 400, 'A subscription request is already pending for this property.');
    }

    // Create the request
    const newRequest = await SubscriptionRequest.create({
      propertyId,
      propertyName: property.name,
      adminId: req.user._id,
      adminName: req.user.name,
      planName,
      price: Number(price),
      status: 'Pending'
    });

    // Set property status to Pending
    await Property.findOneAndUpdate(
      { $or: [{ _id: propertyId }, { id: propertyId }, { name: property.name }] },
      {
        subscriptionStatus: 'Pending'
      }
    );
    invalidatePropertyCache();

    // Trigger Notification for Super Admin
    await triggerNotification({
      req,
      role: 'super-admin',
      propertyId,
      title: 'New Subscription Upgrade Request',
      message: `${property.name} (Admin: ${req.user.name}) requested an upgrade to ${planName} (₹${Number(price).toLocaleString('en-IN')}/mo).`,
      category: 'Subscription'
    });

    // Emit Realtime socket sync
    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'global', 'subscription_request_created', { request: newRequest });
      emitRealtimeSync(io, 'global', 'dashboard_sync', { action: 'subscription_request_created' });
      emitRealtimeSync(io, propertyId, 'dashboard_sync', { action: 'subscription_request_created' });
    }

    return sendSuccess(res, 201, newRequest, 'Subscription request submitted successfully.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

router.get('/subscription/requests', async (req, res) => {
  try {
    const propertyId = req.user.propertyId;
    if (!propertyId) {
      return sendError(res, 400, 'User has no assigned property');
    }
    const list = await SubscriptionRequest.find({ propertyId }).sort({ createdAt: -1 });
    return sendSuccess(res, 200, list, 'Subscription requests history retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

// ==========================================
// PAYMENTS LEDGER & TRANSACTIONS
// ==========================================
const ensureRealPayments = async (propId) => {
  try {
    const bookings = await Booking.find({});
    for (const b of bookings) {
      const bId = b.bookingId || (b._id ? String(b._id) : null);
      if (!bId) continue;
      const guestName = b.guest || b.customerName || b.guestName || 'Guest';

      let roomNumber = extractRoomNumber(b) || '101';
      const amount = Number(b.totalAmount || b.amount || 0);
      const paymentMethod = b.paymentMethod || 'UPI';
      const isRefunded = b.paymentStatus === 'Refunded' || b.refundStatus === 'Refunded' || b.refundRequest?.status === 'Refunded';
      const status = isRefunded
        ? 'Refunded'
        : ((b.paymentStatus === 'Paid' || b.status === 'Checked-in' || b.status === 'Checked-out' || Number(b.balance || 0) === 0)
        ? 'Settled'
        : 'Pending');

      const query = {
        $or: [
          { bookingId: bId },
          ...(b.bookingId ? [{ bookingId: b.bookingId }] : []),
          { guestName: guestName, roomNumber: roomNumber }
        ]
      };
      const existingList = await Payment.find(query);

      if (!existingList || existingList.length === 0) {
        await Payment.create({
          bookingId: bId,
          guestName,
          roomNumber,
          amount: amount > 0 ? amount : 3500,
          paymentMethod,
          status,
          propertyId: b.propertyId || propId || 'HS-9HQ8P',
          createdAt: b.createdAt || new Date()
        });
      } else {
        const existing = existingList[0];
        // Clean up duplicate payment records if any
        if (existingList.length > 1) {
          for (let i = 1; i < existingList.length; i++) {
            await Payment.findByIdAndDelete(existingList[i]._id);
          }
        }
        let needsUpdate = false;
        if (amount > 0 && existing.amount !== amount) { existing.amount = amount; needsUpdate = true; }
        if (roomNumber && existing.roomNumber !== roomNumber) { existing.roomNumber = roomNumber; needsUpdate = true; }
        if (guestName && guestName !== 'Guest' && existing.guestName !== guestName) { existing.guestName = guestName; needsUpdate = true; }
        if (status && existing.status !== status) { existing.status = status; needsUpdate = true; }
        if (b.createdAt && existing.createdAt && Math.abs(new Date(existing.createdAt).getTime() - new Date(b.createdAt).getTime()) > 1000) {
          existing.createdAt = b.createdAt;
          needsUpdate = true;
        }
        if (needsUpdate) await existing.save();
      }
    }
  } catch (err) {
    console.error("Payment sync error:", err.message);
  }
};

router.get('/payments', async (req, res) => {
  try {
    const propId = req.user?.propertyId || 'HS-9HQ8P';
    await ensureRealPayments(propId);
    let query = {};
    if (propId) {
      query = { $or: [{ propertyId: propId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }, { propertyId: { $exists: false } }] };
    }
    let payments = await Payment.find(query).sort({ createdAt: -1 });
    if (!payments || payments.length === 0) {
      payments = await Payment.find({}).sort({ createdAt: -1 });
    }
    return sendSuccess(res, 200, payments, 'Payments ledger retrieved.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/payments', async (req, res) => {
  try {
    const propId = req.user?.propertyId || 'HS-9HQ8P';
    const { bookingId, guestName, amount, paymentMethod, status, roomNumber } = req.body;
    if (!guestName || amount === undefined) {
      return sendError(res, 400, 'guestName and amount are required.');
    }
    const cleanBookingId = bookingId || `BK-${Math.floor(100000 + Math.random() * 900000)}`;
    const newPayment = await Payment.create({
      bookingId: cleanBookingId,
      guestName,
      roomNumber: roomNumber || '101',
      amount: Number(amount),
      paymentMethod: paymentMethod || 'UPI',
      status: status || 'Settled',
      propertyId: propId
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, propId, 'payment_logged', { payment: newPayment, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'payment_logged' });
    }

    await triggerNotification({
      req,
      role: 'admin',
      propertyId: propId,
      title: 'Payment Logged',
      message: `Payment of ₹${amount} received from ${guestName} via ${paymentMethod || 'UPI'}.`,
      category: 'Finance'
    });

    return sendSuccess(res, 201, newPayment, 'Payment logged successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod, amount, guestName, bookingId, roomNumber } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (guestName) updateData.guestName = guestName;
    if (bookingId) updateData.bookingId = bookingId;
    if (roomNumber) updateData.roomNumber = roomNumber;

    let payment;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    if (isObjectId) {
      payment = await Payment.findByIdAndUpdate(id, updateData, { new: true });
    } else {
      payment = await Payment.findOneAndUpdate({ bookingId: id }, updateData, { new: true }) ||
                await Payment.findOneAndUpdate({ _id: id }, updateData, { new: true });
    }

    if (!payment) {
      payment = await Payment.findOneAndUpdate({}, updateData, { new: true });
    }

    const io = req.app.get('socketio');
    if (io) {
      const propId = payment?.propertyId || req.user?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, propId, 'payment_updated', { payment, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'payment_updated' });
    }

    return sendSuccess(res, 200, payment, 'Payment record updated successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.delete('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    let deleted;
    if (isObjectId) {
      deleted = await Payment.findByIdAndDelete(id);
    } else {
      deleted = await Payment.findOneAndDelete({ bookingId: id });
    }

    const io = req.app.get('socketio');
    if (io) {
      const propId = req.user?.propertyId || 'HS-9HQ8P';
      emitRealtimeSync(io, propId, 'payment_updated', { id, deleted: true, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'payment_deleted' });
    }

    return sendSuccess(res, 200, deleted, 'Payment record removed.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// FEEDBACK & REVIEWS (ADMIN CONSOLE)
// ==========================================
router.get('/feedback', async (req, res) => {
  try {
    const propId = req.query.propertyId;
    const query = (propId && propId !== 'all')
      ? { $or: [{ propertyId: propId }, { propertyId: { $exists: false } }, { propertyId: '' }, { propertyId: 'HS-JAI' }] }
      : {};
    const list = await getUnifiedFeedbacksAndReviews(query);
    return sendSuccess(res, 200, list, 'Feedback & guest reviews retrieved successfully from MongoDB.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const propId = req.body?.propertyId || req.user?.propertyId || 'HS-JAI';
    const {
      bookingId = `BK-${Date.now().toString().slice(-5)}`,
      guestName,
      guestEmail = '',
      guestPhone = '',
      room = '101 · Standard Room',
      roomType = 'Standard Room',
      rating = 5,
      ratings = { cleanliness: 5, service: 5, room: 5, food: 5, overall: 5 },
      category = 'General',
      sentiment = 'Positive',
      status = 'Published',
      comment = '',
      comments = '',
      response = ''
    } = req.body;

    const feedbackText = comment || comments;
    if (!guestName || !feedbackText) {
      return sendError(res, 400, 'Guest name and review comment are required.');
    }

    const created = await Feedback.create({
      bookingId,
      guestName,
      guestEmail,
      guestPhone,
      room,
      roomType,
      rating: Number(rating) || 5,
      ratings,
      category,
      sentiment,
      status,
      comment: feedbackText,
      comments: feedbackText,
      response,
      respondedBy: response ? (req.user?.name || 'Administrator') : '',
      respondedAt: response ? new Date() : null,
      propertyId: propId
    });

    await notifyFeedbackEvent({
      req,
      action: 'created',
      feedback: created,
      actor: req.user?.name || 'Admin'
    });

    return sendSuccess(res, 201, created, 'Guest feedback recorded successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.post('/feedback/:id/respond', async (req, res) => {
  try {
    const { response, status } = req.body;
    if (!response) {
      return sendError(res, 400, 'Response comment content is required.');
    }

    const updateData = {
      response,
      respondedBy: req.user?.name || 'Administrator',
      respondedAt: new Date(),
      status: status || 'Resolved'
    };

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Feedback record not found.');
    }

    await notifyFeedbackEvent({
      req,
      action: 'responded',
      feedback: updated,
      actor: req.user?.name || 'Administrator'
    });

    return sendSuccess(res, 200, updated, 'Admin response published successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.put('/feedback/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return sendError(res, 400, 'Status is required.');
    }

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, 'Feedback record not found.');
    }

    await notifyFeedbackEvent({
      req,
      action: 'status_updated',
      feedback: updated,
      actor: req.user?.name || 'Admin'
    });

    return sendSuccess(res, 200, updated, `Feedback status updated to ${status}.`);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

router.delete('/feedback/:id', async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return sendError(res, 404, 'Feedback record not found.');
    }

    await notifyFeedbackEvent({
      req,
      action: 'deleted',
      feedback: deleted,
      actor: req.user?.name || 'Admin'
    });

    return sendSuccess(res, 200, deleted, 'Feedback deleted successfully.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
});

// ==========================================
// COUPONS MANAGEMENT (ADMIN CONSOLE)
// ==========================================
router.get('/coupons', async (req, res) => {
  try {
    const { status, search, discountType } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (discountType && discountType !== 'All') {
      query.discountType = discountType;
    }

    let list = await Coupon.find(query);
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      list = list.filter(c => 
        (c.code && c.code.toLowerCase().includes(s)) ||
        (c.title && c.title.toLowerCase().includes(s)) ||
        (c.description && c.description.toLowerCase().includes(s))
      );
    }

    // Return list sorted by createdAt descending
    const sorted = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return sendSuccess(res, 200, sorted, 'Coupons retrieved successfully');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch coupons');
  }
});

router.post('/coupons', async (req, res) => {
  try {
    const {
      code,
      title = '',
      description = '',
      discountType = 'percentage',
      discountValue,
      maxDiscount = 0,
      minBookingAmount = 0,
      validFrom,
      validUntil,
      usageLimit = 0,
      status = 'Active',
      propertyId = 'all'
    } = req.body;

    if (!code || !code.trim()) {
      return sendError(res, 400, 'Coupon code is required');
    }
    if (discountValue === undefined || discountValue === null || Number(discountValue) <= 0) {
      return sendError(res, 400, 'Valid discount value is required');
    }
    if (!validFrom || !validUntil) {
      return sendError(res, 400, 'Validity start and end dates are required');
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return sendError(res, 400, `Coupon code '${cleanCode}' already exists.`);
    }

    const created = await Coupon.create({
      code: cleanCode,
      title: title || cleanCode,
      description,
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: Number(maxDiscount) || 0,
      minBookingAmount: Number(minBookingAmount) || 0,
      validFrom,
      validUntil,
      usageLimit: Number(usageLimit) || 0,
      usedCount: 0,
      status: status || 'Active',
      propertyId: propertyId || 'all',
      applicableSource: 'website'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'coupon_created', created);
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'coupon_created' });
    }

    await triggerNotification({
      req,
      role: 'admin',
      title: 'New Discount Coupon Created',
      message: `Coupon code '${cleanCode}' with ${discountValue}% discount created by ${req.user?.name || 'Admin'}.`,
      category: 'General'
    });

    return sendSuccess(res, 201, created, `Coupon '${cleanCode}' created successfully`);
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to create coupon');
  }
});

router.get('/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return sendError(res, 404, 'Coupon not found');
    }
    return sendSuccess(res, 200, coupon, 'Coupon details retrieved');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to fetch coupon details');
  }
});

router.put('/coupons/:id', async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minBookingAmount,
      validFrom,
      validUntil,
      usageLimit,
      status,
      propertyId
    } = req.body;

    const existing = await Coupon.findById(req.params.id);
    if (!existing) {
      return sendError(res, 404, 'Coupon not found');
    }

    const updateData = {};
    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      if (cleanCode !== existing.code) {
        const duplicate = await Coupon.findOne({ code: cleanCode });
        if (duplicate && (duplicate._id !== req.params.id && duplicate.id !== req.params.id)) {
          return sendError(res, 400, `Coupon code '${cleanCode}' is already in use.`);
        }
      }
      updateData.code = cleanCode;
    }
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = Number(discountValue);
    if (maxDiscount !== undefined) updateData.maxDiscount = Number(maxDiscount);
    if (minBookingAmount !== undefined) updateData.minBookingAmount = Number(minBookingAmount);
    if (validFrom !== undefined) updateData.validFrom = validFrom;
    if (validUntil !== undefined) updateData.validUntil = validUntil;
    if (usageLimit !== undefined) updateData.usageLimit = Number(usageLimit);
    if (status !== undefined) updateData.status = status;
    if (propertyId !== undefined) updateData.propertyId = propertyId;

    const updated = await Coupon.findByIdAndUpdate(req.params.id, updateData, { new: true });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'coupon_updated', updated);
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'coupon_updated' });
    }

    await triggerNotification({
      req,
      role: 'admin',
      title: 'Discount Coupon Updated',
      message: `Coupon '${updated.code}' settings updated by ${req.user?.name || 'Admin'}.`,
      category: 'General'
    });

    return sendSuccess(res, 200, updated, 'Coupon updated successfully');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to update coupon');
  }
});

router.patch('/coupons/:id/toggle', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return sendError(res, 404, 'Coupon not found');
    }

    const newStatus = coupon.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await Coupon.findByIdAndUpdate(req.params.id, { status: newStatus }, { new: true });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'coupon_updated', updated);
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'coupon_updated' });
    }

    return sendSuccess(res, 200, updated, `Coupon is now ${newStatus}`);
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to toggle coupon status');
  }
});

router.delete('/coupons/:id', async (req, res) => {
  try {
    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return sendError(res, 404, 'Coupon not found');
    }

    return sendSuccess(res, 200, { id: req.params.id }, 'Coupon deleted successfully');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to delete coupon');
  }
});

// ==========================================
// STAFF & USER MANAGEMENT (ADMIN WORKSPACE)
// ==========================================
const handleGetUsersOrStaff = async (req, res) => {
  try {
    const propId = req.user.propertyId || 'HS-JAI';
    const query = {
      $or: [
        { propertyId: propId },
        { propertyId: 'HS-JAI' },
        { propertyId: 'HS-9HQ8P' },
        { propertyId: null },
        { propertyId: { $exists: false } }
      ]
    };
    if (req.query.role) {
      query.role = req.query.role;
    }
    const users = await User.find(query);
    const sanitized = users.map(u => ({
      id: u.id || u._id,
      _id: u.id || u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      mobile: u.mobile || '—',
      status: u.status || 'Active',
      propertyId: u.propertyId || null,
      dept: u.dept || 'Front Desk',
      shift: u.shift || 'Morning (06:00 - 14:00)',
      lastLogin: u.lastLogin || u.lastActive || u.updatedAt || u.createdAt || '—',
      lastActive: u.lastActive || u.lastLogin || u.updatedAt || u.createdAt || '—',
      updatedAt: u.updatedAt,
      createdAt: u.createdAt,
      city: u.city || '',
      state: u.state || '',
      country: u.country || 'India',
      address: u.address || '',
      type: u.type || 'Regular',
      preferences: u.preferences || '',
      idDocType: u.idDocType || 'Aadhaar Card',
      idDocNumber: u.idDocNumber || '',
      loyaltyPoints: u.loyaltyPoints || 0,
      notes: u.notes || ''
    }));
    return sendSuccess(res, 200, sanitized, 'Staff directory list retrieved');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve staff directory');
  }
};

const buildUserLookups = (id, bodyEmail, bodyName, bodyAltId) => {
  const queries = [];
  const addQuery = (key, val) => {
    if (val && typeof val === 'string' && val.trim()) {
      const clean = val.trim();
      queries.push({ [key]: clean });
      if (key === 'email') queries.push({ [key]: clean.toLowerCase() });
    }
  };

  const cleanId = String(id || '').trim();
  if (cleanId) {
    addQuery('_id', cleanId);
    addQuery('id', cleanId);
    addQuery('email', cleanId);
    
    // Check if Base64 encoded ID
    try {
      if (cleanId.length % 4 === 0 && !cleanId.includes('-') && !cleanId.includes(' ') && /^[A-Za-z0-9+/=]+$/.test(cleanId)) {
        const decoded = Buffer.from(cleanId, 'base64').toString('utf8');
        if (decoded && decoded !== cleanId && (decoded.includes('-') || decoded.length >= 10 || decoded.includes('@') || decoded.startsWith('USR') || decoded.startsWith('STAFF') || decoded.startsWith('HS-'))) {
          addQuery('_id', decoded);
          addQuery('id', decoded);
          addQuery('email', decoded);
        }
      }
    } catch {}

    if (mongoose.Types.ObjectId.isValid(cleanId) && String(new mongoose.Types.ObjectId(cleanId)) === cleanId) {
      queries.unshift({ _id: new mongoose.Types.ObjectId(cleanId) });
    }
  }

  if (bodyAltId) {
    const cleanAlt = String(bodyAltId).trim();
    if (cleanAlt !== cleanId) {
      addQuery('_id', cleanAlt);
      addQuery('id', cleanAlt);
      addQuery('email', cleanAlt);
      if (mongoose.Types.ObjectId.isValid(cleanAlt) && String(new mongoose.Types.ObjectId(cleanAlt)) === cleanAlt) {
        queries.unshift({ _id: new mongoose.Types.ObjectId(cleanAlt) });
      }
    }
  }

  if (bodyEmail) {
    addQuery('email', bodyEmail);
    addQuery('id', bodyEmail);
  }

  if (bodyName) {
    addQuery('name', bodyName);
  }

  return queries.length > 0 ? queries : [{ _id: cleanId }];
};

const handleGetUserOrStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const userQuery = buildUserLookups(id, req.query?.email);
    const user = await User.findOne({ $or: userQuery });
    if (!user) return sendError(res, 404, 'Staff not found');
    return sendSuccess(res, 200, {
      id: user.id || user._id,
      _id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile || '',
      status: user.status || 'Active',
      propertyId: user.propertyId || null,
      dept: user.dept || 'Front Desk',
      shift: user.shift || 'Morning (06:00 - 14:00)',
      lastLogin: user.lastLogin || '—'
    }, 'Staff retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve staff member');
  }
};

const handleCreateUserOrStaff = async (req, res) => {
  try {
    const { name, email, password, role, mobile, propertyId, status, dept, shift } = req.body;
    if (!name || !email) {
      return sendError(res, 400, 'Name and email are required');
    }
    const propId = propertyId || req.user?.propertyId || 'HS-JAI';
    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 400, 'User with this email already exists');

    const newUser = await User.create({
      name,
      email,
      password: password || 'password123',
      role: role ? String(role).toLowerCase() : 'receptionist',
      mobile: mobile || '',
      propertyId: propId,
      status: status || 'Active',
      dept: dept || 'Front Desk',
      shift: shift || 'Morning (06:00 - 14:00)'
    });

    try {
      await Shift.findOneAndUpdate(
        { userId: newUser._id ? String(newUser._id) : (newUser.id || newUser.email) },
        { shiftType: shift || 'Morning (06:00 - 14:00)', username: newUser.name, propertyId: propId },
        { upsert: true, new: true }
      );
    } catch {}

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_created', newUser);
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'staff_created', id: newUser._id || newUser.id });
    }

    return sendSuccess(res, 201, {
      id: newUser.id || newUser._id,
      _id: newUser.id || newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      mobile: newUser.mobile,
      propertyId: newUser.propertyId,
      status: newUser.status,
      dept: newUser.dept,
      shift: newUser.shift,
      lastLogin: '—'
    }, 'Staff created successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to create staff');
  }
};

const handleUpdateUserOrStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, mobile, status, propertyId, dept, shift, email, _id: altId, id: altId2 } = req.body;

    const userQuery = buildUserLookups(id, email, name, altId || altId2);
    let targetUser = await User.findOne({ $or: userQuery });
    if (!targetUser) return sendError(res, 404, 'Staff not found');

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (role !== undefined) updateFields.role = String(role).toLowerCase();
    if (mobile !== undefined) updateFields.mobile = mobile;
    if (status !== undefined) updateFields.status = status;
    if (dept !== undefined) updateFields.dept = dept;
    if (shift !== undefined) updateFields.shift = shift;
    if (propertyId !== undefined) updateFields.propertyId = propertyId || null;

    const updated = await User.findOneAndUpdate(
      { $or: userQuery },
      updateFields,
      { new: true }
    ) || targetUser;

    // Synchronize Shift model for roster consistency
    try {
      if (shift !== undefined) {
        const uId = String(updated._id || updated.id || targetUser._id || targetUser.id || id);
        await Shift.findOneAndUpdate(
          { $or: [{ userId: uId }, { username: updated.name }] },
          { shiftType: shift, username: updated.name, propertyId: updated.propertyId || req.user?.propertyId || 'HS-JAI' },
          { upsert: true, new: true }
        );
      }
    } catch (shiftErr) {
      console.warn('Shift sync warning:', shiftErr.message);
    }

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_updated', updated);
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'staff_updated', id });
    }

    return sendSuccess(res, 200, {
      id: updated.id || updated._id,
      _id: updated.id || updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      mobile: updated.mobile,
      status: updated.status,
      propertyId: updated.propertyId,
      dept: updated.dept,
      shift: updated.shift,
      lastLogin: updated.lastLogin || '—'
    }, 'Staff profile updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update staff profile');
  }
};

const handleDeleteUserOrStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const userQuery = buildUserLookups(id);
    const targetUser = await User.findOne({ $or: userQuery });
    if (!targetUser) return sendError(res, 404, 'Staff not found');

    const deleted = await User.findOneAndDelete({ $or: userQuery });
    if (!deleted) return sendError(res, 404, 'Staff not found');

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'user_deleted', { id });
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'staff_deleted', id });
    }

    return sendSuccess(res, 200, { id }, 'Staff profile deleted successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to delete staff profile');
  }
};

router.get('/users', handleGetUsersOrStaff);
router.get('/users/:id', handleGetUserOrStaffById);
router.post('/users', handleCreateUserOrStaff);
router.put('/users/:id', handleUpdateUserOrStaff);
router.delete('/users/:id', handleDeleteUserOrStaff);

router.get('/staff', handleGetUsersOrStaff);
router.get('/staff/:id', handleGetUserOrStaffById);
router.post('/staff', handleCreateUserOrStaff);
router.put('/staff/:id', handleUpdateUserOrStaff);
router.delete('/staff/:id', handleDeleteUserOrStaff);

export default router;

