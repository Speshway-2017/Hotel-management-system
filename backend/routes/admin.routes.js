import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import { upload, uploadImageToCloudinary } from '../utils/uploader.js';

const router = express.Router();

router.use(protect);

const defaultSettings = {
  logo: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  classification: "3-Star",
  description: "",
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
    const propertyId = req.user.propertyId;
    if (!propertyId) {
      return sendError(res, 400, 'User has no assigned property');
    }
    const property = await Property.findById(propertyId);
    if (!property) {
      return sendError(res, 404, 'Assigned property not found');
    }
    const settings = {
      ...defaultSettings,
      name: property.name || '',
      address: property.city || '',
      ...(property.settings || {})
    };
    return sendSuccess(res, 200, settings, 'Property settings retrieved successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to retrieve settings');
  }
});

router.put('/settings', async (req, res) => {
  try {
    const propertyId = req.user.propertyId;
    if (!propertyId) {
      return sendError(res, 400, 'User has no assigned property');
    }
    const { settings } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) {
      return sendError(res, 404, 'Assigned property not found');
    }

    const mergedSettings = {
      ...(property.settings || {}),
      ...settings
    };

    const updateFields = {
      settings: mergedSettings
    };

    if (settings.name) {
      updateFields.name = settings.name;
    }

    const updatedProperty = await Property.findByIdAndUpdate(propertyId, updateFields, { new: true });
    
    return sendSuccess(res, 200, updatedProperty.settings, 'Property settings updated successfully');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update settings');
  }
});

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No image file uploaded');
    }
    const result = await uploadImageToCloudinary(req.file.path);
    return sendSuccess(res, 200, result, 'Image uploaded successfully');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

export default router;
