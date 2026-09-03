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

async function inspect() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  const db = mongoose.connection.db;

  const allUsers = await db.collection('users').find({}).toArray();
  console.log(`\n👥 Total Users in MongoDB: ${allUsers.length}`);
  allUsers.forEach(u => {
    console.log(`- [${u._id}] Role: ${u.role} | Name: "${u.name}" | Email: "${u.email}" | Phone: "${u.mobile || u.phone}"`);
  });

  const allBookings = await db.collection('bookings').find({}).toArray();
  console.log(`\n📅 Total Bookings in MongoDB: ${allBookings.length}`);
  allBookings.forEach(b => {
    console.log(`- [${b.bookingId || b._id}] Guest: "${b.guest}" | Email: "${b.email}" | Room: "${b.room || b.roomNumber}" | Status: "${b.status}"`);
  });

  await mongoose.disconnect();
}

inspect().catch(console.error);
