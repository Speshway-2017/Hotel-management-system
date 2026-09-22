import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectDB } from '../config/db.config.js';
import Booking from '../models/booking.model.js';

async function run() {
  await connectDB();

  console.log('MongoDB Atlas connection state:', mongoose.connection.readyState);

  // 1. Update Sunny's main booking to today arrival (22 Sep 2026)
  await Booking.findOneAndUpdate(
    { $or: [{ bookingId: 'BK-10401' }, { id: 'BK-10401' }] },
    { checkIn: '2026-09-22', checkOut: '2026-09-25', status: 'Confirmed', nights: 3, source: 'Hour Stay App' }
  );

  // 2. Update Mounika's booking to today departure (22 Sep 2026)
  await Booking.findOneAndUpdate(
    { $or: [{ bookingId: 'BK-10101' }, { id: 'BK-10101' }] },
    { checkIn: '2026-09-20', checkOut: '2026-09-22', status: 'Checked-in', nights: 2, source: 'MakeMyTrip' }
  );

  // 3. Update Surya's booking to today arrival (22 Sep 2026)
  await Booking.findOneAndUpdate(
    { $or: [{ bookingId: 'BK-10301' }, { id: 'BK-10301' }] },
    { checkIn: '2026-09-22', checkOut: '2026-09-24', status: 'Confirmed', nights: 2, source: 'Direct Web' }
  );

  // 4. Update Mani's booking to today departure (22 Sep 2026)
  await Booking.findOneAndUpdate(
    { $or: [{ bookingId: 'BK-10102' }, { id: 'BK-10102' }] },
    { checkIn: '2026-09-21', checkOut: '2026-09-22', status: 'Checked-in', nights: 1, source: 'Direct Web' }
  );

  // 5. Update Vamsi's booking to today arrival (22 Sep 2026)
  await Booking.findOneAndUpdate(
    { $or: [{ bookingId: 'BK-10202' }, { id: 'BK-10202' }] },
    { checkIn: '2026-09-22', checkOut: '2026-09-24', status: 'Confirmed', nights: 2, source: 'Direct Web' }
  );

  // 6. Update Sai's booking to today arrival (22 Sep 2026)
  await Booking.findOneAndUpdate(
    { $or: [{ bookingId: 'BK-30101' }, { id: 'BK-30101' }] },
    { checkIn: '2026-09-22', checkOut: '2026-09-25', status: 'Confirmed', nights: 3, source: 'Booking.com' }
  );

  // 7. Update Sunny's second booking to today departure (22 Sep 2026)
  await Booking.findOneAndUpdate(
    { $or: [{ bookingId: 'BK-20101' }, { id: 'BK-20101' }] },
    { checkIn: '2026-09-19', checkOut: '2026-09-22', status: 'Checked-in', nights: 3, source: 'Hour Stay App' }
  );

  const all = await Booking.find({});
  console.log('Bookings in MongoDB Atlas after update:');
  for (const b of all) {
    console.log(`- ${b.bookingId || b.id}: guest=${b.guest}, checkIn=${b.checkIn}, checkOut=${b.checkOut}, status=${b.status}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
