import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function syncBookings() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;

  const localBookings = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/bookings.json'), 'utf8'));
  console.log(`Read ${localBookings.length} local bookings`);

  for (const b of localBookings) {
    const bId = b.bookingId || b.id || b._id;
    const filter = { $or: [{ bookingId: bId }, { id: bId }] };
    const docData = { ...b, bookingId: bId, id: bId };
    delete docData._id;
    const update = {
      $set: {
        ...docData,
        updatedAt: new Date()
      },
      $setOnInsert: {
        _id: b._id || bId
      }
    };
    await db.collection('bookings').updateOne(filter, update, { upsert: true });
    console.log(`Upserted booking ${bId} (${b.guest})`);
  }

  const allInDB = await db.collection('bookings').find({}).toArray();
  console.log(`Total Atlas bookings now: ${allInDB.length}`);
  process.exit(0);
}

syncBookings();
