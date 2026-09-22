import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { isToday } from '../utils/dateUtils.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

async function debugFilter() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  const bookings = await db.collection('bookings').find({}).toArray();

  console.log(`Total Atlas bookings: ${bookings.length}`);
  for (const b of bookings) {
    const isArr = isToday(b.checkIn);
    const isDep = isToday(b.checkOut);
    if (isArr || isDep || String(b.checkIn).includes('2026-09-22') || String(b.checkOut).includes('2026-09-22')) {
      console.log(`Booking [${b.bookingId || b._id}]: Guest=${b.guest}, in=${b.checkIn} (isArr=${isArr}), out=${b.checkOut} (isDep=${isDep}), status=${b.status}, prop=${b.propertyId}`);
    }
  }
  process.exit(0);
}

debugFilter();
