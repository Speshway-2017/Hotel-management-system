import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB } from '../config/db.config.js';
import 'dotenv/config';
import mongoose from 'mongoose';

async function verifySunnyRecord() {
  await connectDB();
  const db = mongoose.connection.db;

  const sunny = await db.collection('bookings').findOne({ bookingId: 'BK451335' });
  console.log('✅ Sunny Live Booking in MongoDB:');
  console.log({
    bookingId: sunny.bookingId,
    guest: sunny.guest,
    checkIn: sunny.checkIn,
    checkOut: sunny.checkOut,
    nights: sunny.nights,
    amount: sunny.amount,
    status: sunny.status
  });
  process.exit(0);
}

verifySunnyRecord().catch(e => {
  console.error(e);
  process.exit(1);
});
