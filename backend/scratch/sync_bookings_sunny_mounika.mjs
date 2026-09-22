import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function sync() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({
    email: { $in: ['sunny@gmail.com', 'mounika@gmail.com', 'mouni@gmail.com'] }
  }).toArray();

  console.log('--- Guest Users Found ---');
  users.forEach(u => console.log(u.email, '| ID:', u._id, '| Name:', u.name, '| Prop:', u.propertyId));

  const sunnyUser = users.find(u => u.email === 'sunny@gmail.com');
  const mouniUser = users.find(u => u.email === 'mounika@gmail.com') || users.find(u => u.email === 'mouni@gmail.com');

  // 1. Remove duplicate / conflicting 2026-09-22 records
  const delRes = await db.collection('bookings').deleteMany({
    $or: [
      { _id: new mongoose.Types.ObjectId('6ab21676d4880bd931632c87') },
      { bookingId: 'BK487969' }
    ]
  });
  console.log(`Removed ${delRes.deletedCount} old conflicting/duplicate bookings.`);

  // 2. Ensure NO OTHER bookings have checkIn = '2026-09-22' or checkOut = '2026-09-22' or status = 'Checked-in'
  const nonTargetCheckedIn = await db.collection('bookings').find({
    guest: { $nin: ['Sunny', 'Sunny S', 'Mounika'] },
    status: { $in: ['Checked-in', 'Checked In', 'Staying', 'Occupied'] }
  }).toArray();
  console.log(`Found ${nonTargetCheckedIn.length} other checked-in bookings to mark Checked-out.`);
  for (const b of nonTargetCheckedIn) {
    await db.collection('bookings').updateOne(
      { _id: b._id },
      { $set: { status: 'Checked-out' } }
    );
  }

  const otherArrivals = await db.collection('bookings').find({
    guest: { $nin: ['Sunny', 'Sunny S', 'Mounika'] },
    checkIn: '2026-09-22'
  }).toArray();
  console.log(`Found ${otherArrivals.length} other bookings with checkIn today to move.`);
  for (const b of otherArrivals) {
    await db.collection('bookings').updateOne(
      { _id: b._id },
      { $set: { checkIn: '2026-09-25', checkOut: '2026-09-27' } }
    );
  }

  const otherDepartures = await db.collection('bookings').find({
    checkOut: '2026-09-22'
  }).toArray();
  console.log(`Found ${otherDepartures.length} other bookings with checkOut today to move.`);
  for (const b of otherDepartures) {
    await db.collection('bookings').updateOne(
      { _id: b._id },
      { $set: { checkOut: '2026-09-21' } }
    );
  }

  // 3. Upsert / Set Sunny booking (BK-20101) in Room 101
  await db.collection('bookings').updateOne(
    { $or: [{ bookingId: 'BK-20101' }, { id: 'BK-20101' }] },
    {
      $set: {
        bookingId: 'BK-20101',
        id: 'BK-20101',
        guest: 'Sunny',
        name: 'Sunny',
        email: 'sunny@gmail.com',
        phone: '+91 98765 43210',
        room: '101 · Standard Room',
        roomNumber: '101',
        roomType: 'Standard Room',
        category: 'Standard Room',
        checkIn: '2026-09-22',
        checkOut: '2026-09-24',
        nights: 2,
        status: 'Checked-in',
        paymentStatus: 'Paid',
        amount: 6000,
        totalAmount: 6000,
        paidAmount: 6000,
        balance: 0,
        source: 'Direct Web',
        propertyId: 'HS-9HQ8P',
        hotelId: 'HS-9HQ8P',
        hotel: 'Hour Stay Luxury Hotel',
        propertyName: 'Hour Stay Luxury Hotel',
        guestId: sunnyUser?._id ? String(sunnyUser._id) : 'nhb9td45vas',
        userId: sunnyUser?._id ? String(sunnyUser._id) : 'nhb9td45vas'
      }
    },
    { upsert: true }
  );
  console.log('Updated/Upserted Sunny BK-20101 (Room 101, Checked-in)');

  // 4. Upsert / Set Mounika booking (BK-10101) in Room 102
  await db.collection('bookings').updateOne(
    { $or: [{ bookingId: 'BK-10101' }, { id: 'BK-10101' }] },
    {
      $set: {
        bookingId: 'BK-10101',
        id: 'BK-10101',
        guest: 'Mounika',
        name: 'Mounika',
        email: 'mounika@gmail.com',
        phone: '+91 98765 43211',
        room: '102 · Standard Room',
        roomNumber: '102',
        roomType: 'Standard Room',
        category: 'Standard Room',
        checkIn: '2026-09-22',
        checkOut: '2026-09-24',
        nights: 2,
        status: 'Checked-in',
        paymentStatus: 'Paid',
        amount: 6000,
        totalAmount: 6000,
        paidAmount: 6000,
        balance: 0,
        source: 'Direct Web',
        propertyId: 'HS-9HQ8P',
        hotelId: 'HS-9HQ8P',
        hotel: 'Hour Stay Luxury Hotel',
        propertyName: 'Hour Stay Luxury Hotel',
        guestId: mouniUser?._id ? String(mouniUser._id) : '4ee628cl28x',
        userId: mouniUser?._id ? String(mouniUser._id) : '4ee628cl28x'
      }
    },
    { upsert: true }
  );
  console.log('Updated/Upserted Mounika BK-10101 (Room 102, Checked-in)');

  // 5. Update Rooms in MongoDB: Room 101 & Room 102 -> Occupied, ALL other rooms -> Available
  await db.collection('rooms').updateMany(
    { roomNumber: { $nin: ['101', '102'] } },
    { $set: { status: 'Available', housekeeping: 'Clean' } }
  );
  await db.collection('rooms').updateOne(
    { roomNumber: '101' },
    { $set: { status: 'Occupied', housekeeping: 'Clean' } }
  );
  await db.collection('rooms').updateOne(
    { roomNumber: '102' },
    { $set: { status: 'Occupied', housekeeping: 'Clean' } }
  );
  console.log('Updated rooms collection: 101 & 102 Occupied, all others Available.');

  // 6. Also sync JSON files in backend/data
  const bookingsJsonPath = path.join(__dirname, '../data/bookings.json');
  if (fs.existsSync(bookingsJsonPath)) {
    let list = JSON.parse(fs.readFileSync(bookingsJsonPath, 'utf8'));
    list = list.filter(b => b.bookingId !== 'BK487969' && b.id !== 'BK487969');
    list.forEach(b => {
      if (b.bookingId === 'BK-20101' || b.id === 'BK-20101') {
        b.guest = 'Sunny';
        b.roomNumber = '101';
        b.room = '101 · Standard Room';
        b.checkIn = '2026-09-22';
        b.checkOut = '2026-09-24';
        b.status = 'Checked-in';
        b.propertyId = 'HS-9HQ8P';
      } else if (b.bookingId === 'BK-10101' || b.id === 'BK-10101') {
        b.guest = 'Mounika';
        b.roomNumber = '102';
        b.room = '102 · Standard Room';
        b.checkIn = '2026-09-22';
        b.checkOut = '2026-09-24';
        b.status = 'Checked-in';
        b.propertyId = 'HS-9HQ8P';
      } else if (b.checkIn === '2026-09-22') {
        b.checkIn = '2026-09-25';
        b.checkOut = '2026-09-27';
      } else if (b.checkOut === '2026-09-22') {
        b.checkOut = '2026-09-21';
      }
    });
    fs.writeFileSync(bookingsJsonPath, JSON.stringify(list, null, 2));
    console.log('Updated backend/data/bookings.json');
  }

  process.exit(0);
}

sync();
