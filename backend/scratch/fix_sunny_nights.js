import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB } from '../config/db.config.js';
import 'dotenv/config';
import mongoose from 'mongoose';

async function checkAndFixSunnyNights() {
  await connectDB();
  const db = mongoose.connection.db;

  const sunnyBookings = await db.collection('bookings').find({
    $or: [
      { guest: /sunny/i },
      { customerName: /sunny/i },
      { guestName: /sunny/i },
      { email: /sunny@gmail\.com/i },
      { bookingId: 'BK451335' }
    ]
  }).toArray();

  console.log('Found Sunny Bookings in bookings collection:', sunnyBookings.length);
  for (const b of sunnyBookings) {
    console.log({
      id: b._id,
      bookingId: b.bookingId,
      guest: b.guest || b.customerName || b.guestName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      nights: b.nights,
      amount: b.amount,
      totalAmount: b.totalAmount,
      status: b.status
    });
  }

  // Update BK451335 to 1 night: Check-in: 2026-09-17, Check-out: 2026-09-18, Nights: 1
  const updateRes = await db.collection('bookings').updateMany(
    {
      $or: [
        { bookingId: 'BK451335' },
        { id: 'BK451335' }
      ]
    },
    {
      $set: {
        checkIn: '2026-09-17',
        checkOut: '2026-09-18',
        dates: '2026-09-17 → 2026-09-18',
        nights: 1,
        amount: 4560,
        totalAmount: 4560,
        paidAmount: 4560,
        netAmount: 4560,
        roomNumber: '201',
        room: '201 · Deluxe Room',
        roomType: 'Deluxe Room',
        status: 'Checked-in'
      }
    }
  );
  console.log('Updated bookings count:', updateRes.modifiedCount);

  // Also update payments collection
  const payUpdate = await db.collection('payments').updateMany(
    {
      $or: [
        { bookingId: 'BK451335' },
        { reservationId: 'BK451335' }
      ]
    },
    {
      $set: {
        checkIn: '2026-09-17',
        checkOut: '2026-09-18',
        dates: '2026-09-17 → 2026-09-18',
        nights: 1,
        amount: 4560,
        totalAmount: 4560,
        roomNumber: '201'
      }
    }
  );
  console.log('Updated payments count:', payUpdate.modifiedCount);

  // Also check folios collection if exists
  try {
    const folioUpdate = await db.collection('folios').updateMany(
      {
        $or: [
          { bookingId: 'BK451335' },
          { reservationId: 'BK451335' }
        ]
      },
      {
        $set: {
          checkIn: '2026-09-17',
          checkOut: '2026-09-18',
          nights: 1,
          amount: 4560,
          totalAmount: 4560
        }
      }
    );
    console.log('Updated folios count:', folioUpdate.modifiedCount);
  } catch (err) {
    console.log('No folios update needed');
  }

  process.exit(0);
}

checkAndFixSunnyNights().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
