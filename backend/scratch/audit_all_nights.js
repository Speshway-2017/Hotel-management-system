import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB } from '../config/db.config.js';
import { calculateStayNights } from '../utils/dateUtils.js';
import 'dotenv/config';
import mongoose from 'mongoose';

async function auditAndFixAllBookings() {
  await connectDB();
  const db = mongoose.connection.db;

  const allBookings = await db.collection('bookings').find({}).toArray();
  console.log(`Total bookings found in MongoDB: ${allBookings.length}`);

  let mismatchCount = 0;
  for (const b of allBookings) {
    const cIn = b.checkIn || b.checkInDate;
    const cOut = b.checkOut || b.checkOutDate;
    const calculated = calculateStayNights(cIn, cOut);
    const stored = b.nights !== undefined && b.nights !== null ? Number(b.nights) : calculated;

    const isMismatched = stored !== calculated;
    if (isMismatched) {
      mismatchCount++;
      console.log(`Mismatch in Booking ${b.bookingId || b._id} (${b.guest}): Stored=${stored}, Calculated=${calculated} [${cIn} -> ${cOut}]`);
    }

    // Always update database record so nights matches exact calendar days (cOut - cIn)
    await db.collection('bookings').updateOne(
      { _id: b._id },
      {
        $set: {
          nights: calculated,
          dates: `${cIn} → ${cOut}`
        }
      }
    );
  }

  console.log(`Audit complete. Found and fixed ${mismatchCount} mismatched bookings in database.`);

  // Also audit payments collection
  const allPayments = await db.collection('payments').find({}).toArray();
  console.log(`Total payments found in MongoDB: ${allPayments.length}`);
  for (const p of allPayments) {
    const cIn = p.checkIn || p.checkInDate;
    const cOut = p.checkOut || p.checkOutDate;
    if (cIn && cOut) {
      const calculated = calculateStayNights(cIn, cOut);
      await db.collection('payments').updateOne(
        { _id: p._id },
        {
          $set: {
            nights: calculated,
            dates: `${cIn} → ${cOut}`
          }
        }
      );
    }
  }

  console.log(`Payments updated successfully.`);
  process.exit(0);
}

auditAndFixAllBookings().catch(err => {
  console.error(err);
  process.exit(1);
});
