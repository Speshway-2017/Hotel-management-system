import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Update Sunny's active confirmed booking to 2026-10-07 -> 2026-10-08
  const res = await db.collection('bookings').updateMany(
    { 
      $or: [
        { guest: /sunny/i },
        { guestName: /sunny/i },
        { email: /sunny/i }
      ],
      status: { $in: ['Confirmed', 'Paid', 'Pending'] }
    },
    {
      $set: {
        checkIn: '2026-10-07',
        checkInDate: '2026-10-07',
        checkOut: '2026-10-08',
        checkOutDate: '2026-10-08',
        nights: 1,
        dates: '2026-10-07 → 2026-10-08',
        updatedAt: new Date()
      }
    }
  );
  console.log('Updated Sunny bookings:', res.modifiedCount);

  const bookings = await db.collection('bookings').find({
    $or: [{ guest: /sunny/i }, { guestName: /sunny/i }, { email: /sunny/i }]
  }).toArray();
  bookings.forEach(b => console.log(b.bookingId, b.guest, b.checkIn, '->', b.checkOut, b.status));
  process.exit(0);
}
run();
