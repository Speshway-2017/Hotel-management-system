import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';

async function list() {
  await mongoose.connect(process.env.MONGODB_URI);
  const bookings = await Booking.find({}).lean();
  console.log('Total bookings in MongoDB:', bookings.length);
  bookings.forEach(b => {
    console.log(`- ${b.guest} (${b.bookingId}): CheckIn=${b.checkIn}, CheckOut=${b.checkOut}, Status=${b.status}, Property=${b.propertyId}`);
  });
  process.exit(0);
}

list().catch(err => {
  console.error(err);
  process.exit(1);
});
