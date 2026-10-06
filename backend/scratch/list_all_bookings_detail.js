import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const bookings = await db.collection('bookings').find().sort({ createdAt: -1 }).toArray();
  console.log(`Found ${bookings.length} bookings:`);
  bookings.forEach(b => {
    console.log(`- [${b.bookingId}] ${b.guest || b.guestName} | Room: ${b.room || b.roomNumber} | CheckIn: ${b.checkIn} (${typeof b.checkIn}) | CheckOut: ${b.checkOut} | Status: ${b.status} | CreatedAt: ${b.createdAt}`);
  });
  process.exit(0);
}
run();
