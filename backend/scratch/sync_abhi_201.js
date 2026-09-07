import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Mark Mani as Checked-out
  await db.collection('bookings').updateOne({ guest: 'Mani' }, { $set: { status: 'Checked-out' } });

  // Check or Upsert Abhi in 201
  const existingAbhi = await db.collection('bookings').findOne({ guest: /abhi/i });
  if (existingAbhi) {
    await db.collection('bookings').updateOne(
      { _id: existingAbhi._id },
      {
        $set: {
          guest: 'Abhi',
          room: '201 · Deluxe Room',
          roomNumber: '201',
          roomType: 'Deluxe Room',
          status: 'Checked-in',
          checkIn: '2026-09-07',
          checkOut: '2026-09-09',
          nights: 2,
          amount: 9000,
          totalAmount: 9000,
          balance: 0,
          paymentStatus: 'Paid'
        }
      }
    );
    console.log('Updated existing Abhi booking to Checked-in in Room 201');
  } else {
    await db.collection('bookings').insertOne({
      bookingId: 'BK-20101',
      id: 'BK-20101',
      propertyId: 'HS-JAI',
      guest: 'Abhi',
      phone: '+91 98765 43210',
      email: 'abhi@example.com',
      room: '201 · Deluxe Room',
      roomNumber: '201',
      roomType: 'Deluxe Room',
      status: 'Checked-in',
      checkIn: '2026-09-07',
      checkOut: '2026-09-09',
      nights: 2,
      pax: '2 Adults',
      source: 'Direct Web',
      amount: 9000,
      totalAmount: 9000,
      balance: 0,
      paymentStatus: 'Paid',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Inserted new Abhi booking in Room 201');
  }

  // Set all rooms status: 201 -> Occupied, others -> Available
  await db.collection('rooms').updateMany({}, { $set: { status: 'Available' } });
  await db.collection('rooms').updateOne({ roomNumber: '201' }, { $set: { status: 'Occupied' } });
  console.log('Room 201 marked as Occupied, 13 other rooms marked as Available.');

  // Print current status
  const allRooms = await db.collection('rooms').find({}).toArray();
  const occupied = allRooms.filter(r => r.status === 'Occupied');
  const available = allRooms.filter(r => r.status === 'Available');
  console.log(`Summary: Total Rooms = ${allRooms.length} | Occupied = ${occupied.length} (Room ${occupied.map(r => r.roomNumber).join(', ')}) | Available = ${available.length}`);

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
