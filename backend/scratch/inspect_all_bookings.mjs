import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

async function inspectBookings() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  const bookings = await db.collection('bookings').find({}).toArray();
  console.log(`Total Bookings in DB: ${bookings.length}`);
  bookings.forEach(b => {
    console.log(`- [${b.bookingId || b._id}] Guest: ${b.guest} | In: ${b.checkIn} | Out: ${b.checkOut} | Status: ${b.status} | Prop: ${b.propertyId}`);
  });
  process.exit(0);
}

inspectBookings();
