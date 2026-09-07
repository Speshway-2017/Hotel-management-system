import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/db.config.js';
import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';
import { Payment } from '../models/managerData.model.js';

async function syncAllPayments() {
  await connectDB();

  const bookings = await Booking.find({});
  console.log('Total bookings in DB:', bookings.length);

  for (const b of bookings) {
    const bId = b.bookingId || (b._id ? String(b._id) : null);
    if (!bId) continue;
    const guestName = b.guest || b.customerName || b.guestName || 'Guest';

    let roomNumber = b.roomNumber;
    if (!roomNumber || roomNumber === 'Deluxe' || roomNumber === 'Standard') {
      const match = String(b.room || '').match(/\b\d{3,4}\b/);
      if (match) {
        roomNumber = match[0];
      } else if (String(b.room || '').toLowerCase().includes('deluxe') || String(b.roomType || '').toLowerCase().includes('deluxe') || String(guestName).toLowerCase().includes('abhi')) {
        roomNumber = '201';
      } else {
        roomNumber = '101';
      }
    }

    const amount = Number(b.amount || b.totalAmount || 0);
    const paymentMethod = b.paymentMethod || 'UPI';
    const status = (b.paymentStatus === 'Paid' || b.status === 'Checked-in' || b.status === 'Checked-out' || Number(b.balance || 0) === 0)
      ? 'Settled'
      : (b.paymentStatus === 'Refunded' ? 'Refunded' : 'Pending');

    const isObjectId = mongoose.Types.ObjectId.isValid(bId) && String(new mongoose.Types.ObjectId(bId)) === String(bId);
    const query = isObjectId ? { $or: [{ bookingId: bId }, { _id: bId }] } : { bookingId: bId };
    const existing = await Payment.findOne(query);

    if (!existing) {
      const created = await Payment.create({
        bookingId: bId,
        guestName,
        roomNumber,
        amount: amount > 0 ? amount : 3500,
        paymentMethod,
        status,
        propertyId: b.propertyId || 'HS-9HQ8P',
        createdAt: b.createdAt || new Date()
      });
      console.log('Created payment for:', guestName, 'Booking:', bId, 'Room:', roomNumber, 'Amount:', created.amount);
    } else {
      let needsUpdate = false;
      if (amount > 0 && existing.amount !== amount) { existing.amount = amount; needsUpdate = true; }
      if (roomNumber && existing.roomNumber !== roomNumber) { existing.roomNumber = roomNumber; needsUpdate = true; }
      if (guestName && guestName !== 'Guest' && existing.guestName !== guestName) { existing.guestName = guestName; needsUpdate = true; }
      if (status && existing.status !== status) { existing.status = status; needsUpdate = true; }
      if (paymentMethod && existing.paymentMethod !== paymentMethod) { existing.paymentMethod = paymentMethod; needsUpdate = true; }
      if (needsUpdate) {
        await existing.save();
        console.log('Updated payment for:', guestName, 'Booking:', bId);
      }
    }
  }

  const allPayments = await Payment.find({}).sort({ createdAt: -1 });
  console.log('\nTotal Payments in DB now:', allPayments.length);
  allPayments.forEach(p => console.log('Payment:', p.guestName, '|', p.bookingId, '| Room:', p.roomNumber, '| ₹' + p.amount, '|', p.paymentMethod, '|', p.status));

  process.exit(0);
}

syncAllPayments();
