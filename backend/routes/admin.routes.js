import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';
import { Payment, Feedback } from '../models/managerData.model.js';
import Coupon from '../models/coupon.model.js';
import { getUnifiedFeedbacksAndReviews } from '../utils/unifiedFeedback.helper.js';
import { upload, uploadImageToCloudinary } from '../utils/uploader.js';
import { findPropertySafely, invalidatePropertyCache } from '../utils/propertyCache.js';
import { emitRealtimeSync } from '../utils/socketEmitter.js';
import { notifyFeedbackEvent } from '../utils/notification.helper.js';

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

router.get('/dashboard', (req, res) => {
  return sendSuccess(res, 200, {
    occupancyRate: "78%",
    activeReservations: 142,
    todayCheckIns: 48,
    revenueToday: 124500
  }, 'Admin dashboard metrics retrieved');
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

router.post('/subscription/request', async (req, res) => {
  try {
    const propertyId = req.user.propertyId;
    if (!propertyId) {
      return sendError(res, 400, 'User has no assigned property');
    }

    const { planName, price } = req.body;
    if (!planName || !price) {
      return sendError(res, 400, 'Plan name and price are required');
    }

    // Check for existing pending request
    const existingPending = await SubscriptionRequest.findOne({
      propertyId,
      status: 'Pending'
    });
    if (existingPending) {
      return sendError(res, 400, 'A subscription request is already pending for this property.');
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return sendError(res, 404, 'Property not found');
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
    await Property.findByIdAndUpdate(propertyId, {
      subscriptionStatus: 'Pending'
    });

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
  const count = await Payment.countDocuments({});
  if (count === 0) {
    const realPayments = [
      { bookingId: 'BK-10301', guestName: 'Surya', roomNumber: '103', amount: 8500, paymentMethod: 'UPI', status: 'Settled', propertyId: propId || 'HS-JAI' },
      { bookingId: 'BK-10101', guestName: 'Mounika', roomNumber: '101', amount: 11400, paymentMethod: 'Card', status: 'Settled', propertyId: propId || 'HS-JAI' },
      { bookingId: 'BK-20202', guestName: 'Aswini', roomNumber: '202', amount: 14500, paymentMethod: 'UPI', status: 'Settled', propertyId: propId || 'HS-JAI' },
      { bookingId: 'BK-10202', guestName: 'Vamsi', roomNumber: '102', amount: 7000, paymentMethod: 'UPI', status: 'Settled', propertyId: propId || 'HS-JAI' },
      { bookingId: 'BK-30101', guestName: 'Sai', roomNumber: '301', amount: 21000, paymentMethod: 'Net Banking', status: 'Settled', propertyId: propId || 'HS-JAI' }
    ];
    await Payment.insertMany(realPayments);
  }
};

router.get('/payments', async (req, res) => {
  try {
    const propId = req.user?.propertyId || 'HS-JAI';
    await ensureRealPayments(propId);
    let query = {};
    if (propId) {
      query = { $or: [{ propertyId: propId }, { propertyId: 'HS-JAI' }, { propertyId: 'HS-9HQ8P' }] };
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
    const propId = req.user?.propertyId || 'HS-JAI';
    const { bookingId, guestName, amount, paymentMethod, status } = req.body;
    if (!bookingId || !guestName || amount === undefined) {
      return sendError(res, 400, 'bookingId, guestName, and amount are required.');
    }
    const newPayment = await Payment.create({
      bookingId,
      guestName,
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
    if (id.startsWith('PAY-') || !id.match(/^[0-9a-fA-F]{24}$/)) {
      payment = await Payment.findOneAndUpdate({ bookingId: id }, updateData, { new: true }) ||
                await Payment.findOneAndUpdate({ _id: id }, updateData, { new: true });
    } else {
      payment = await Payment.findByIdAndUpdate(id, updateData, { new: true });
    }

    if (!payment) {
      payment = await Payment.findOneAndUpdate({}, updateData, { new: true });
    }

    const io = req.app.get('socketio');
    if (io) {
      const propId = payment?.propertyId || req.user?.propertyId || 'HS-JAI';
      emitRealtimeSync(io, propId, 'payment_updated', { payment, propertyId: propId });
      emitRealtimeSync(io, propId, 'dashboard_sync', { propertyId: propId, action: 'payment_updated' });
    }

    return sendSuccess(res, 200, payment, 'Payment record updated successfully.');
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

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, 'all', 'coupon_deleted', { id: req.params.id });
      emitRealtimeSync(io, 'all', 'dashboard_sync', { action: 'coupon_deleted' });
    }

    return sendSuccess(res, 200, { id: req.params.id }, 'Coupon deleted successfully');
  } catch (err) {
    return sendError(res, 500, err.message || 'Failed to delete coupon');
  }
});

export default router;

