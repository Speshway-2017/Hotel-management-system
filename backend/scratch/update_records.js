import { connectDB } from '../config/db.config.js';
import 'dotenv/config';
import mongoose from 'mongoose';

async function updateRecords() {
  await connectDB();
  const db = mongoose.connection.db;

  console.log('🔄 Updating Bookings in MongoDB...');
  
  // 1. Update Abhi BK120626
  await db.collection('bookings').updateOne(
    { $or: [{ bookingId: 'BK120626' }, { guest: /abhi/i, room: /501/i }] },
    {
      $set: {
        bookingId: 'BK120626',
        guest: 'Abhi',
        roomNumber: '501',
        room: '501 · Penthouse Suite',
        roomType: 'Penthouse Suite',
        amount: 5192,
        totalAmount: 5192,
        originalAmount: 5192,
        discountAmount: 0,
        couponCode: null,
        status: 'Confirmed',
        paymentStatus: 'Paid',
        balance: 0
      }
    }
  );

  // 2. Update Sunny BK280125
  await db.collection('bookings').updateOne(
    { $or: [{ bookingId: 'BK280125' }, { guest: /sunny/i, room: /301/i }] },
    {
      $set: {
        bookingId: 'BK280125',
        guest: 'Sunny',
        roomNumber: '301',
        room: '301 · Executive Suite',
        roomType: 'Executive Suite',
        amount: 6136,
        totalAmount: 6136,
        originalAmount: 6136,
        discountAmount: 0,
        couponCode: null,
        status: 'Checked-in',
        paymentStatus: 'Paid',
        balance: 0
      }
    }
  );

  // 3. Update BK036531 roomNumber to 101
  await db.collection('bookings').updateOne(
    { bookingId: 'BK036531' },
    { $set: { roomNumber: '101', room: '101 · Standard Room' } }
  );

  console.log('🔄 Updating Payments in MongoDB...');
  
  // Sunny Payment
  await db.collection('payments').updateOne(
    { $or: [{ bookingId: 'BK280125' }, { guestName: /sunny/i, roomNumber: '301' }] },
    {
      $set: {
        bookingId: 'BK280125',
        guestName: 'Sunny',
        roomNumber: '301',
        amount: 6136,
        status: 'Settled',
        paymentMethod: 'UPI',
        propertyId: 'HS-9HQ8P'
      }
    },
    { upsert: true }
  );

  // Abhi Payment
  await db.collection('payments').updateOne(
    { $or: [{ bookingId: 'BK120626' }, { guestName: /abhi/i, roomNumber: '501' }] },
    {
      $set: {
        bookingId: 'BK120626',
        guestName: 'Abhi',
        roomNumber: '501',
        amount: 5192,
        status: 'Settled',
        paymentMethod: 'UPI',
        propertyId: 'HS-9HQ8P'
      }
    },
    { upsert: true }
  );

  // Fix test payment roomNumber
  await db.collection('payments').updateOne(
    { bookingId: 'BK036531' },
    { $set: { roomNumber: '101' } }
  );

  console.log('🔄 Updating Room Statuses in MongoDB...');
  await db.collection('rooms').updateOne({ roomNumber: '501' }, { $set: { status: 'Reserved' } });
  await db.collection('rooms').updateOne({ roomNumber: '301' }, { $set: { status: 'Occupied' } });
  await db.collection('rooms').updateOne({ roomNumber: '101' }, { $set: { status: 'Reserved' } });

  console.log('✅ All MongoDB records successfully updated!');
  process.exit(0);
}

updateRecords().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
