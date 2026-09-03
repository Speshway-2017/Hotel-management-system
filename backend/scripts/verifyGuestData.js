import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.log('DNS warning:', e.message);
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hourstay_hms';

async function verify() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  const db = mongoose.connection.db;

  // 1. Fetch all bookings
  const bookings = await db.collection('bookings').find({}).toArray();
  console.log('\n📊 Current Bookings in MongoDB Atlas (Total:', bookings.length, '):');
  bookings.forEach(b => {
    console.log(`- [${b.bookingId || b._id}] Guest: ${b.guest} | Room: ${b.room || b.roomNumber} | Status: ${b.status} | Amount: ₹${b.amount} | Balance: ₹${b.balance} | Email: ${b.email} | Phone: ${b.phone}`);
  });

  // 2. Fetch all guest users
  const guestUsers = await db.collection('users').find({ role: 'guest' }).toArray();
  console.log('\n👥 Real Guest Users in MongoDB Atlas (Total:', guestUsers.length, '):');
  guestUsers.forEach(u => {
    console.log(`- ${u.name} | ${u.email} | Mobile: ${u.mobile} | Role: ${u.role}`);
  });

  // 3. Verify no dummy records
  const dummyRegex = /karan|aisha|rohan|meera\s+nair|aarav|priya|devendra/i;
  const dummyBookings = bookings.filter(b => dummyRegex.test(b.guest));
  if (dummyBookings.length > 0) {
    console.error('❌ WARNING: Found dummy bookings in database:', dummyBookings.map(b => b.guest));
  } else {
    console.log('\n✅ Verified: Zero dummy/test guest records in MongoDB database!');
  }

  await mongoose.disconnect();
}

verify().catch(console.error);
