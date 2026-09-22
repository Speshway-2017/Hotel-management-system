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

async function syncPresentBookings() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  const bookingsColl = db.collection('bookings');
  const usersColl = db.collection('users');

  // 1. Ensure Sunny and Mounika user records have propertyId: 'HS-JAI'
  await usersColl.updateMany(
    { email: { $in: ['sunny@gmail.com', 'mounika@gmail.com', 'mouni@gmail.com'] } },
    { $set: { propertyId: 'HS-JAI', updatedAt: new Date() } }
  );
  console.log('Updated user records for Sunny and Mounika to propertyId HS-JAI');

  // 2. Read local bookings.json and sync
  const localBookings = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/bookings.json'), 'utf8'));
  for (const b of localBookings) {
    const bId = b.bookingId || b.id || b._id;
    const filter = { $or: [{ bookingId: bId }, { id: bId }] };
    const docData = { ...b, bookingId: bId, id: bId };
    delete docData._id;
    await bookingsColl.updateOne(filter, { $set: { ...docData, updatedAt: new Date() }, $setOnInsert: { _id: b._id || bId } }, { upsert: true });
    console.log(`Synced ${bId} (${b.guest}) -> status: ${b.status}`);
  }

  // 3. Mark any other Checked-in bookings as Checked-out so ONLY Sunny and Mounika are present
  const result = await bookingsColl.updateMany(
    {
      status: { $regex: /^checked[-_ ]?in$/i },
      bookingId: { $nin: ['BK-20101', 'BK-10101'] },
      id: { $nin: ['BK-20101', 'BK-10101'] }
    },
    {
      $set: {
        status: 'Checked-out',
        updatedAt: new Date()
      }
    }
  );
  console.log(`Marked ${result.modifiedCount} extraneous checked-in bookings as Checked-out`);

  // 4. Verify all present bookings in Atlas
  const presentBookings = await bookingsColl.find({
    status: { $regex: /^checked[-_ ]?in$/i }
  }).toArray();

  console.log(`\n=== EXACT PRESENT (CHECKED-IN) BOOKINGS (${presentBookings.length}) ===`);
  presentBookings.forEach(b => {
    console.log(`- ${b.bookingId || b.id}: ${b.guest || b.guestName} (Room ${b.roomNumber || b.room}) at ${b.propertyId}, Status: ${b.status}, In: ${b.checkIn}, Out: ${b.checkOut}`);
  });

  if (presentBookings.length === 2) {
    console.log('SUCCESS: Exactly 2 present bookings found (Sunny and Mounika)!');
  } else {
    console.warn(`WARNING: Found ${presentBookings.length} present bookings instead of 2!`);
  }

  process.exit(0);
}

syncPresentBookings().catch(err => {
  console.error('Error syncing present bookings:', err);
  process.exit(1);
});
