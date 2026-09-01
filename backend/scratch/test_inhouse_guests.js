import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));

  const query = {
    $or: [{ propertyId: 'HS-9HQ8P' }, { propertyId: 'HS-JAI' }],
    status: { $in: ['Checked-in', 'Confirmed', 'Paid'] }
  };
  const bookings = await Booking.find(query).sort({ createdAt: -1 });

  console.log(`Retrieved ${bookings.length} in-house/active guests from MongoDB:`);
  bookings.forEach(b => {
    console.log(`- Guest: ${b.guest || b.guestName} | Room: ${b.room} | Booking ID: ${b.bookingId || b._id} | Status: ${b.status}`);
  });

  process.exit(0);
}

run().catch(console.error);
