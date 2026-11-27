import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';
import Property from '../models/property.model.js';
import { Payment } from '../models/managerData.model.js';
import { protect } from '../middleware/auth.middleware.js';
import { paymentRateLimiter } from '../middleware/security.middleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { timingSafeEqualStr } from '../utils/cryptoVault.js';
import { recordSecurityEvent } from '../services/securityMonitor.service.js';
import { buildBookingLookupQuery } from '../utils/bookingHelper.js';
import { emitRealtimeSync } from '../utils/socketEmitter.js';
import { triggerNotification } from '../utils/notification.helper.js';

const router = express.Router();
const processedWebhookEvents = new Set();

function verifyBookingOwnershipOrStaff(booking, user) {
  if (!booking || !user) return false;
  if (user.role === 'super-admin') return true;
  if (['admin', 'manager', 'receptionist'].includes(user.role)) {
    return !user.propertyId || !booking.propertyId || String(user.propertyId) === String(booking.propertyId);
  }
  const userId = String(user._id || user.id || '');
  const userEmail = String(user.email || '').toLowerCase().trim();
  const userPhone = String(user.mobile || user.phone || '').replace(/\D/g, '').slice(-10);
  const bEmail = String(booking.email || booking.guestEmail || '').toLowerCase().trim();
  const bPhone = String(booking.phone || booking.guestPhone || '').replace(/\D/g, '').slice(-10);
  return (
    (booking.guestId && String(booking.guestId) === userId) ||
    (userEmail && bEmail && bEmail === userEmail) ||
    (userPhone.length >= 10 && bPhone === userPhone)
  );
}

/**
 * POST /api/payments/razorpay/create-order
 * Creates an authoritative Razorpay order on the backend using the server-side booking balance.
 */
router.post('/razorpay/create-order', protect, paymentRateLimiter, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return sendError(res, 400, 'Booking ID is required');
    }

    const booking = await Booking.findOne(buildBookingLookupQuery(bookingId));
    if (!booking) {
      return sendError(res, 404, 'Booking not found');
    }

    if (!verifyBookingOwnershipOrStaff(booking, req.user)) {
      await recordSecurityEvent({
        type: 'UNAUTHORIZED_PAYMENT_ORDER_ATTEMPT',
        severity: 'high',
        req,
        user: req.user,
        details: `User attempted to create payment order for another guest/property booking ${bookingId}`,
        notifyAdmins: true
      });
      return sendError(res, 403, 'Access denied for this booking');
    }

    const dueAmount = Number(booking.balance || booking.totalAmount || booking.amount || 0);
    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      return sendError(res, 400, 'No payable balance remaining on this booking');
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return sendError(res, 503, 'Razorpay gateway is not configured on this server.');
    }

    const amountPaise = Math.round(dueAmount * 100);
    const receipt = `HS_${String(booking.bookingId || booking._id).slice(-20)}`;

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          bookingId: String(booking.bookingId || booking._id),
          propertyId: String(booking.propertyId || 'HS-9HQ8P')
        }
      })
    });

    const rzpOrder = await rzpRes.json();
    if (!rzpRes.ok || !rzpOrder.id) {
      return sendError(res, 502, rzpOrder?.error?.description || 'Failed to create Razorpay order');
    }

    return sendSuccess(res, 200, {
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId
    }, 'Razorpay order created');
  } catch (err) {
    return sendError(res, 500, 'Failed to create payment order');
  }
});

/**
 * POST /api/payments/razorpay/verify
 * Verifies Razorpay Checkout HMAC-SHA256 signature using crypto.timingSafeEqual.
 */
router.post('/razorpay/verify', protect, paymentRateLimiter, async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = req.body;

    if (!bookingId || !orderId || !paymentId || !signature) {
      return sendError(res, 400, 'Missing Razorpay verification fields');
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return sendError(res, 503, 'Razorpay verification secret is not configured');
    }

    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (!timingSafeEqualStr(expectedSig, String(signature))) {
      await recordSecurityEvent({
        type: 'RAZORPAY_SIGNATURE_TAMPER',
        severity: 'critical',
        req,
        user: req.user,
        details: `Invalid Razorpay payment signature for booking ${bookingId}`,
        notifyAdmins: true
      });
      return sendError(res, 400, 'Payment signature verification failed');
    }

    const booking = await Booking.findOne(buildBookingLookupQuery(bookingId));
    if (!booking) {
      return sendError(res, 404, 'Booking not found');
    }
    if (!verifyBookingOwnershipOrStaff(booking, req.user)) {
      return sendError(res, 403, 'Access denied for this booking');
    }

    // Idempotency check
    const existingPayment = await Payment.findOne({ transactionId: paymentId });
    if (existingPayment) {
      return sendSuccess(res, 200, { payment: existingPayment, booking, idempotent: true }, 'Payment already verified');
    }

    const settleAmount = Number(booking.balance > 0 ? booking.balance : (booking.totalAmount || booking.amount || 0));
    booking.balance = 0;
    booking.paidAmount = Number(booking.totalAmount || booking.amount || settleAmount);
    booking.paymentStatus = 'Paid';
    if (booking.status === 'Pending') booking.status = 'Confirmed';
    await booking.save();

    const newPayment = await Payment.create({
      bookingId: booking.bookingId || String(booking._id),
      guestName: booking.guest || req.user.name,
      roomNumber: booking.roomNumber || '101',
      amount: settleAmount,
      paidAmount: settleAmount,
      paymentMethod: 'Razorpay',
      transactionId: paymentId,
      gatewayOrderId: orderId,
      status: 'Settled',
      propertyId: booking.propertyId || 'HS-9HQ8P'
    });

    const io = req.app.get('socketio');
    if (io) {
      emitRealtimeSync(io, booking.propertyId, 'payment_logged', { payment: newPayment, bookingId: booking._id });
      emitRealtimeSync(io, booking.propertyId, 'dashboard_sync', { propertyId: booking.propertyId, action: 'razorpay_verified' });
    }

    return sendSuccess(res, 200, { payment: newPayment, booking }, 'Payment verified and settled');
  } catch (err) {
    return sendError(res, 500, 'Payment verification error');
  }
});

/**
 * POST /api/payments/razorpay/webhook
 * Verifies raw body HMAC-SHA256 using RAZORPAY_WEBHOOK_SECRET and processes payment.captured idempotently.
 */
router.post('/razorpay/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!webhookSecret) {
      return sendError(res, 503, 'Webhook secret not configured');
    }
    if (!signature || typeof signature !== 'string') {
      await recordSecurityEvent({
        type: 'RAZORPAY_WEBHOOK_MISSING_SIGNATURE',
        severity: 'high',
        req,
        details: 'Razorpay webhook called without x-razorpay-signature header',
        notifyAdmins: true
      });
      return sendError(res, 400, 'Missing Razorpay webhook signature');
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!timingSafeEqualStr(expectedSig, signature)) {
      await recordSecurityEvent({
        type: 'RAZORPAY_WEBHOOK_INVALID_SIGNATURE',
        severity: 'critical',
        req,
        details: 'Razorpay webhook signature verification failed (possible spoofing attempt)',
        notifyAdmins: true
      });
      return sendError(res, 401, 'Invalid webhook signature');
    }

    const payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody.toString('utf8')) : req.body;
    const eventId = req.headers['x-razorpay-event-id'] || payload?.payload?.payment?.entity?.id;
    if (eventId && processedWebhookEvents.has(String(eventId))) {
      return sendSuccess(res, 200, { idempotent: true }, 'Webhook event already processed');
    }
    if (eventId) {
      processedWebhookEvents.add(String(eventId));
      if (processedWebhookEvents.size > 5000) processedWebhookEvents.clear();
    }

    const eventType = payload?.event;
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const entity = payload?.payload?.payment?.entity || {};
      const bookingRef = entity?.notes?.bookingId;
      const paymentId = entity?.id;
      const paidInr = Number(entity?.amount || 0) / 100;

      if (bookingRef && paymentId) {
        const already = await Payment.findOne({ transactionId: paymentId });
        if (!already) {
          const booking = await Booking.findOne(buildBookingLookupQuery(bookingRef));
          if (booking) {
            const newBalance = Math.max(0, Number(booking.balance || 0) - paidInr);
            booking.balance = newBalance;
            booking.paidAmount = Number(booking.paidAmount || 0) + paidInr;
            booking.paymentStatus = newBalance === 0 ? 'Paid' : 'Partial';
            await booking.save();

            await Payment.create({
              bookingId: booking.bookingId || String(booking._id),
              guestName: booking.guest,
              roomNumber: booking.roomNumber || '101',
              amount: paidInr,
              paidAmount: paidInr,
              paymentMethod: 'Razorpay Webhook',
              transactionId: paymentId,
              gatewayOrderId: entity.order_id || '',
              status: 'Settled',
              propertyId: booking.propertyId || 'HS-9HQ8P'
            });

            await triggerNotification({
              req,
              role: 'admin',
              propertyId: booking.propertyId,
              title: 'Razorpay Webhook Payment Settled',
              message: `Verified payment of ₹${paidInr} for booking ${booking.bookingId || booking._id}.`,
              category: 'Payments'
            }).catch(() => {});
          }
        }
      }
    }

    return sendSuccess(res, 200, { received: true }, 'Webhook verified and processed');
  } catch (err) {
    return sendError(res, 500, 'Webhook processing failed');
  }
});

export default router;

