import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  
  const users = await db.collection('users').find({}).toArray();
  console.log('--- USERS ---');
  users.forEach(u => {
    if (u.role === 'guest' || ['sunny@gmail.com', 'mounika@gmail.com', 'mani@gmail.com'].includes(u.email)) {
      console.log(u.email, '| name:', u.name, '| role:', u.role, '| propertyId:', u.propertyId, '| _id:', u._id);
    }
  });

  const bookings = await db.collection('bookings').find({}).toArray();
  console.log(`\n--- ALL ATLAS BOOKINGS (${bookings.length}) ---`);
  bookings.forEach(b => {
    console.log(b.bookingId || b.id, '| guest:', b.guest || b.guestName, '| email:', b.email, '| room:', b.roomNumber || b.room, '| status:', b.status, '| prop:', b.propertyId, '| in:', b.checkIn, '| out:', b.checkOut);
  });

  const props = await db.collection('properties').find({}).toArray();
  console.log(`\n--- PROPERTIES (${props.length}) ---`);
  props.forEach(p => console.log(p._id, p.name, p.city));

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
