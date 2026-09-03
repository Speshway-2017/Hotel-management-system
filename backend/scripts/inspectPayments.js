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
} catch (e) {}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hourstay_hms';

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const payments = await db.collection('payments').find({}).toArray();
  console.log(`\n💳 Total Payments in MongoDB: ${payments.length}`);
  payments.forEach(p => {
    console.log(p);
  });

  const bookings = await db.collection('bookings').find({}).toArray();
  console.log(`\n📅 Total Bookings in MongoDB: ${bookings.length}`);
  bookings.forEach(b => {
    console.log(`- [${b.bookingId}] ${b.guest}: amount=${b.amount}, balance=${b.balance}, paymentStatus=${b.paymentStatus}, propertyId=${b.propertyId}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
