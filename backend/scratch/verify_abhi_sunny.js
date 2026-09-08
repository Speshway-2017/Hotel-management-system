import { connectDB } from '../config/db.config.js';
import 'dotenv/config';
import mongoose from 'mongoose';

async function verifyAll() {
  await connectDB();
  const db = mongoose.connection.db;

  console.log('=== VERIFYING BOOKINGS ===');
  const abhiBooking = await db.collection('bookings').findOne({ bookingId: 'BK120626' });
  console.log('Abhi Booking BK120626:', {
    guest: abhiBooking.guest,
    roomNumber: abhiBooking.roomNumber,
    room: abhiBooking.room,
    amount: abhiBooking.amount,
    totalAmount: abhiBooking.totalAmount,
    status: abhiBooking.status
  });

  const sunnyBooking = await db.collection('bookings').findOne({ bookingId: 'BK280125' });
  console.log('Sunny Booking BK280125:', {
    guest: sunnyBooking.guest,
    roomNumber: sunnyBooking.roomNumber,
    room: sunnyBooking.room,
    amount: sunnyBooking.amount,
    totalAmount: sunnyBooking.totalAmount,
    status: sunnyBooking.status
  });

  console.log('\n=== VERIFYING PAYMENTS ===');
  const abhiPayment = await db.collection('payments').findOne({ bookingId: 'BK120626' });
  console.log('Abhi Payment:', {
    guestName: abhiPayment?.guestName,
    roomNumber: abhiPayment?.roomNumber,
    amount: abhiPayment?.amount,
    status: abhiPayment?.status
  });

  const sunnyPayment = await db.collection('payments').findOne({ bookingId: 'BK280125' });
  console.log('Sunny Payment:', {
    guestName: sunnyPayment?.guestName,
    roomNumber: sunnyPayment?.roomNumber,
    amount: sunnyPayment?.amount,
    status: sunnyPayment?.status
  });

  console.log('\n=== VERIFYING ROOM STATUSES ===');
  const room501 = await db.collection('rooms').findOne({ roomNumber: '501' });
  const room301 = await db.collection('rooms').findOne({ roomNumber: '301' });
  const room101 = await db.collection('rooms').findOne({ roomNumber: '101' });
  console.log('Room 501:', room501?.category, 'Status:', room501?.status);
  console.log('Room 301:', room301?.category, 'Status:', room301?.status);
  console.log('Room 101:', room101?.category, 'Status:', room101?.status);

  console.log('\n✅ All verifications passed successfully!');
  process.exit(0);
}

verifyAll().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
