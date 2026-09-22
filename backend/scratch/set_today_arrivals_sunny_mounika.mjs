import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setTodayArrivalsOnlySunnyAndMounika() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;

  // 1. Fetch all bookings from Atlas
  const bookings = await db.collection('bookings').find({}).toArray();
  console.log(`Found ${bookings.length} bookings in Atlas.`);

  // Update Surya, Vamsi, Sai to not be today (2026-09-22)
  await db.collection('bookings').updateOne(
    { $or: [{ bookingId: 'BK-10301' }, { id: 'BK-10301' }] },
    { $set: { checkIn: '2026-09-24', checkOut: '2026-09-26', status: 'Confirmed' } }
  );
  console.log('Updated Surya BK-10301 checkIn to 2026-09-24');

  await db.collection('bookings').updateOne(
    { $or: [{ bookingId: 'BK-10202' }, { id: 'BK-10202' }] },
    { $set: { checkIn: '2026-09-25', checkOut: '2026-09-27', status: 'Confirmed' } }
  );
  console.log('Updated Vamsi BK-10202 checkIn to 2026-09-25');

  await db.collection('bookings').updateOne(
    { $or: [{ bookingId: 'BK-30101' }, { id: 'BK-30101' }] },
    { $set: { checkIn: '2026-09-26', checkOut: '2026-09-28', status: 'Confirmed' } }
  );
  console.log('Updated Sai BK-30101 checkIn to 2026-09-26');

  // Any other booking that is not Sunny or Mounika and has checkIn on 2026-09-22
  const otherToday = await db.collection('bookings').find({
    checkIn: '2026-09-22',
    guest: { $nin: ['Sunny', 'Sunny S', 'Sunny  S', 'Mounika'] }
  }).toArray();
  for (const b of otherToday) {
    await db.collection('bookings').updateOne(
      { _id: b._id },
      { $set: { checkIn: '2026-09-24', checkOut: '2026-09-26' } }
    );
    console.log(`Moved non-Sunny/Mounika booking ${b.guest} (${b._id}) to 2026-09-24`);
  }

  // Ensure Sunny and Mounika have clean Today's Arrival bookings
  // Let's check Sunny and Mounika bookings with checkIn 2026-09-22
  const todayArrivals = await db.collection('bookings').find({
    checkIn: '2026-09-22'
  }).toArray();
  console.log('\n--- Atlas Today Arrivals (2026-09-22) ---');
  todayArrivals.forEach(b => {
    console.log(`[${b.bookingId || b._id}] Guest: ${b.guest} | Room: ${b.room || b.roomNumber} | In: ${b.checkIn} | Out: ${b.checkOut} | Status: ${b.status}`);
  });

  // Also update data/bookings.json to match
  const jsonPath = path.join(__dirname, '../data/bookings.json');
  if (fs.existsSync(jsonPath)) {
    const jsonBookings = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    jsonBookings.forEach(b => {
      if (b.bookingId === 'BK-10301') { b.checkIn = '2026-09-24'; b.checkOut = '2026-09-26'; }
      if (b.bookingId === 'BK-10202') { b.checkIn = '2026-09-25'; b.checkOut = '2026-09-27'; }
      if (b.bookingId === 'BK-30101') { b.checkIn = '2026-09-26'; b.checkOut = '2026-09-28'; }
    });
    fs.writeFileSync(jsonPath, JSON.stringify(jsonBookings, null, 2));
    console.log('\nUpdated data/bookings.json');
  }

  process.exit(0);
}

setTodayArrivalsOnlySunnyAndMounika();
