import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import Property from '../models/property.model.js';
import { upload, uploadImageToCloudinary } from '../utils/uploader.js';

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
    let propertyId = req.user?.propertyId;
    let property = propertyId ? await Property.findById(propertyId) : null;
    if (!property && req.user?._id) {
      property = await Property.findOne({ assignedAdmin: req.user._id });
    }
    if (!property && req.user?.email) {
      property = await Property.findOne({ assignedAdmin: req.user.email });
    }
    if (!property) {
      property = await Property.findOne();
    }
    if (!property) {
      propertyId = propertyId || "HS-9HQ8P";
      property = await Property.create({
        _id: propertyId,
        id: propertyId,
        name: "Speshway Luxury Hotel",
        city: "Hyderabad, Telangana",
        status: "Active",
        gm: req.user?.name || "Vikram Rathore"
      });
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

    let property = propertyId ? await Property.findById(propertyId) : null;
    if (!property && req.user?._id) {
      property = await Property.findOne({ assignedAdmin: req.user._id });
    }
    if (!property && req.user?.email) {
      property = await Property.findOne({ assignedAdmin: req.user.email });
    }
    if (!property) {
      property = await Property.findOne();
    }

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
    
    return sendSuccess(res, 200, {
      ...updatedProperty.settings,
      name: updatedProperty.name,
      hotelName: updatedProperty.name,
      city: updatedProperty.city,
      _id: updatedProperty._id || updatedProperty.id
    }, 'Property settings updated and persisted successfully in MongoDB');
  } catch (error) {
    return sendError(res, 500, error.message || 'Failed to update property settings');
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
    const result = await uploadImageToCloudinary(req.file.path);
    return sendSuccess(res, 200, result, 'Image uploaded successfully');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

router.get('/property', async (req, res) => {
  try {
    let propertyId = req.user?.propertyId;
    let property = propertyId ? await Property.findById(propertyId) : null;
    if (!property && req.user?._id) {
      property = await Property.findOne({ assignedAdmin: req.user._id });
    }
    if (!property) {
      property = await Property.findOne();
    }
    if (!property) {
      propertyId = propertyId || "HS-JAI";
      property = await Property.create({
        _id: propertyId,
        id: propertyId,
        name: "Hour Stay Rambagh Residency",
        city: "Jaipur",
        status: "Active",
        gm: req.user?.name || "Vikram Rathore"
      });
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

export default router;
