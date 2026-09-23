import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from '../config/db.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  await connectDB();
  console.log('Connected to MongoDB');

  const col = mongoose.connection.db.collection('bookings');

  // 1. Permanently update Sunny (BK-20101) - Booked yesterday 22 Sept
  const sunnyUpdate = {
    bookingId: 'BK-20101',
    id: 'BK-20101',
    guest: 'Sunny',
    guestName: 'Sunny',
    name: 'Sunny',
    email: 'sunny@gmail.com',
    phone: '4563536437',
    room: '101 · Standard Room',
    roomNumber: '101',
    roomType: 'Standard Room',
    checkIn: '2026-09-22',
    checkOut: '2026-09-24',
    dates: '2026-09-22 → 2026-09-24',
    nights: 2,
    pax: '1 Adult',
    source: 'Hour Stay App',
    status: 'Checked-in',
    paymentStatus: 'Paid',
    amount: 9500,
    totalAmount: 9500,
    paidAmount: 9500,
    balance: 0,
    propertyId: 'HS-9HQ8P',
    hotelId: 'HS-9HQ8P',
    hotel: 'Speshway Luxury Hotel',
    hotelName: 'Speshway Luxury Hotel',
    propertyName: 'Speshway Luxury Hotel',
    city: 'Madhapur, Hyderabad',
    idVerification: 'Verified',
    idDocType: 'Aadhaar Card',
    idDocNumber: '4654 6864 9765',
    createdAt: new Date('2026-09-22T08:30:00.000Z'),
    updatedAt: new Date('2026-09-22T16:49:20.000Z')
  };

  await col.updateOne(
    { bookingId: 'BK-20101' },
    { $set: sunnyUpdate },
    { upsert: true }
  );
  console.log('✅ Sunny (BK-20101) updated in MongoDB native collection');

  // 2. Permanently update Mounika (BK-10101) - Booked yesterday 22 Sept
  const mounikaUpdate = {
    bookingId: 'BK-10101',
    id: 'BK-10101',
    guest: 'Mounika',
    guestName: 'Mounika',
    name: 'Mounika',
    email: 'mounika@gmail.com',
    phone: '+91 99443 88120',
    room: '102 · Standard Room',
    roomNumber: '102',
    roomType: 'Standard Room',
    checkIn: '2026-09-22',
    checkOut: '2026-09-24',
    dates: '2026-09-22 → 2026-09-24',
    nights: 2,
    pax: '2 Adults',
    source: 'MakeMyTrip',
    status: 'Checked-in',
    paymentStatus: 'Paid',
    amount: 11400,
    totalAmount: 11400,
    paidAmount: 11400,
    balance: 0,
    propertyId: 'HS-9HQ8P',
    hotelId: 'HS-9HQ8P',
    hotel: 'Speshway Luxury Hotel',
    hotelName: 'Speshway Luxury Hotel',
    propertyName: 'Speshway Luxury Hotel',
    city: 'Madhapur, Hyderabad',
    idVerification: 'Verified',
    idDocType: 'Aadhaar Card',
    idDocNumber: '5263 5776 7887',
    createdAt: new Date('2026-09-22T09:15:00.000Z'),
    updatedAt: new Date('2026-09-22T16:49:20.000Z')
  };

  await col.updateOne(
    { bookingId: 'BK-10101' },
    { $set: mounikaUpdate },
    { upsert: true }
  );
  console.log('✅ Mounika (BK-10101) updated in MongoDB native collection');

  // 3. Fix all bookings with missing or invalid createdAt or fields in MongoDB
  const allDocs = await col.find({}).toArray();
  let fixedCount = 0;
  for (const b of allDocs) {
    const updateFields = {};
    let needsUpdate = false;

    if (!b.createdAt || isNaN(new Date(b.createdAt).getTime())) {
      const fallbackDate = b.updatedAt || (b.checkIn ? new Date(b.checkIn) : new Date('2026-09-01'));
      updateFields.createdAt = fallbackDate;
      needsUpdate = true;
    }

    if (!b.guestName && b.guest) {
      updateFields.guestName = b.guest;
      needsUpdate = true;
    }

    if (!b.name && b.guest) {
      updateFields.name = b.guest;
      needsUpdate = true;
    }

    if (!b.propertyId || b.propertyId === 'HS-JAI') {
      updateFields.propertyId = 'HS-9HQ8P';
      updateFields.hotelId = 'HS-9HQ8P';
      needsUpdate = true;
    }

    if (needsUpdate) {
      await col.updateOne({ _id: b._id }, { $set: updateFields });
      fixedCount++;
    }
  }
  console.log(`✅ Audited all bookings: fixed timestamps/fields on ${fixedCount} records.`);

  // 4. Update data/bookings.json to keep static dataset permanently consistent
  const jsonPath = path.join(__dirname, '../data/bookings.json');
  if (fs.existsSync(jsonPath)) {
    const list = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const updatedList = list.map(item => {
      if (item.bookingId === 'BK-20101') {
        return {
          ...item,
          ...sunnyUpdate,
          createdAt: '2026-09-22T08:30:00.000Z',
          updatedAt: '2026-09-22T16:49:20.000Z'
        };
      }
      if (item.bookingId === 'BK-10101') {
        return {
          ...item,
          ...mounikaUpdate,
          createdAt: '2026-09-22T09:15:00.000Z',
          updatedAt: '2026-09-22T16:49:20.000Z'
        };
      }
      return {
        ...item,
        propertyId: 'HS-9HQ8P',
        hotelId: 'HS-9HQ8P',
        createdAt: item.createdAt || item.updatedAt || (item.checkIn ? `${item.checkIn}T09:00:00.000Z` : '2026-09-01T09:00:00.000Z')
      };
    });
    fs.writeFileSync(jsonPath, JSON.stringify(updatedList, null, 2), 'utf8');
    console.log('✅ Updated data/bookings.json with permanent timestamps.');
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
