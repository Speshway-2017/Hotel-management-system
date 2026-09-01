import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const id = "BK513322";
  const queries = [
    { bookingId: id },
    { id: id }
  ];
  if (mongoose.Types.ObjectId.isValid(id)) {
    queries.unshift({ _id: id });
  }

  const booking = await Booking.findOne({ $or: queries });
  console.log('Lookup test for BK513322:');
  if (booking) {
    console.log(`Found booking for ${booking.guest} (Status: ${booking.status}, Room: ${booking.room || 'TBD'})`);
  } else {
    console.log('No booking found with ID BK513322 (Query executed safely without CastError!).');
  }

  process.exit(0);
}

run().catch(console.error);
