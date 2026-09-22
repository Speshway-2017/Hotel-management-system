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

async function clearTodayDepartures() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;

  // 1. Find all bookings in Atlas with checkOut on 2026-09-22
  const depBookings = await db.collection('bookings').find({
    $or: [
      { checkOut: '2026-09-22' },
      { checkOut: { $regex: '^2026-09-22' } }
    ]
  }).toArray();

  console.log(`Found ${depBookings.length} bookings departing on 2026-09-22 in Atlas.`);
  for (const b of depBookings) {
    console.log(`Updating [${b.bookingId || b._id}] Guest: ${b.guest}, in: ${b.checkIn}, out: ${b.checkOut}, status: ${b.status}`);
  }

  // Update them:
  // - If it was Mounika BK-10101 (in: 2026-09-20, out: 2026-09-22) -> set out: 2026-09-21 (past checked-out) or set out to 2026-09-24 (extended stay)
  // - If it was Mani BK-10102 (in: 2026-09-21, out: 2026-09-22) -> set out: 2026-09-21 (past checked-out) or 2026-09-24
  // - If it was Sunny BK-20101 (in: 2026-09-19, out: 2026-09-22) -> set out: 2026-09-21 (past checked-out) or 2026-09-24
  
  // Update any booking departing on 2026-09-22:
  // If status is Checked-out, set checkOut to 2026-09-21.
  // If status is Checked-in, extend checkOut to 2026-09-24 so they stay in-house.
  for (const b of depBookings) {
    if (b.status === 'Checked-out' || b.status === 'Checked Out') {
      await db.collection('bookings').updateOne(
        { _id: b._id },
        { $set: { checkOut: '2026-09-21' } }
      );
    } else {
      // In-stay guests extending
      await db.collection('bookings').updateOne(
        { _id: b._id },
        { $set: { checkOut: '2026-09-24', nights: 4 } }
      );
    }
  }

  // Also update data/bookings.json
  const jsonPath = path.join(__dirname, '../data/bookings.json');
  if (fs.existsSync(jsonPath)) {
    const jsonBookings = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    jsonBookings.forEach(b => {
      if (b.checkOut === '2026-09-22') {
        if (b.status === 'Checked-out' || b.status === 'Checked Out') {
          b.checkOut = '2026-09-21';
        } else {
          b.checkOut = '2026-09-24';
          b.nights = (b.nights || 1) + 2;
        }
      }
    });
    fs.writeFileSync(jsonPath, JSON.stringify(jsonBookings, null, 2));
    console.log('Updated data/bookings.json');
  }

  console.log('Today departures cleared.');
  process.exit(0);
}

clearTodayDepartures();
