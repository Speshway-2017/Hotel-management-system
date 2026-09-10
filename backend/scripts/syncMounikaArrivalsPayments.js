import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const todayStr = '2026-09-10';
  const tomorrowStr = '2026-09-11';
  const inTwoDaysStr = '2026-09-12';

  // 1. Ensure Mounika's booking for 2026-09-10 is present and Confirmed for Executive Suite (₹6136)
  const mounikaExisting = await db.collection('bookings').findOne({ guest: /mounika/i });
  if (mounikaExisting) {
    await db.collection('bookings').updateOne(
      { _id: mounikaExisting._id },
      {
        $set: {
          guest: 'Mounika',
          customerName: 'Mounika',
          email: 'mounika@gmail.com',
          phone: '+91 98765 43210',
          room: '301 · Executive Suite',
          roomNumber: '301',
          roomType: 'Executive Suite',
          checkIn: todayStr,
          checkOut: tomorrowStr,
          nights: 1,
          pax: '2 Adults',
          source: 'Direct Web',
          status: 'Confirmed',
          amount: 6136,
          totalAmount: 6136,
          originalAmount: 6136,
          discountAmount: 1227,
          couponCode: 'WELCOME20',
          netAmount: 4909,
          balance: 0,
          paymentStatus: 'Paid',
          propertyId: 'HS-9HQ8P',
          createdAt: new Date('2026-09-10T11:30:00.000Z')
        }
      }
    );
    console.log('Updated Mounika booking:', mounikaExisting.bookingId);
  } else {
    await db.collection('bookings').insertOne({
      bookingId: 'BK689794',
      guest: 'Mounika',
      customerName: 'Mounika',
      email: 'mounika@gmail.com',
      phone: '+91 98765 43210',
      room: '301 · Executive Suite',
      roomNumber: '301',
      roomType: 'Executive Suite',
      checkIn: todayStr,
      checkOut: tomorrowStr,
      nights: 1,
      pax: '2 Adults',
      source: 'Direct Web',
      status: 'Confirmed',
      amount: 6136,
      totalAmount: 6136,
      originalAmount: 6136,
      discountAmount: 1227,
      couponCode: 'WELCOME20',
      netAmount: 4909,
      balance: 0,
      paymentStatus: 'Paid',
      propertyId: 'HS-9HQ8P',
      createdAt: new Date('2026-09-10T11:30:00.000Z')
    });
    console.log('Inserted Mounika booking BK689794');
  }

  // 2. Ensure Sunny's booking is also an Arrival today (2026-09-10)
  const sunnyExisting = await db.collection('bookings').findOne({ guest: /sunny/i });
  if (sunnyExisting) {
    await db.collection('bookings').updateOne(
      { _id: sunnyExisting._id },
      {
        $set: {
          guest: 'Sunny',
          customerName: 'Sunny',
          room: '203 · Deluxe Room',
          roomNumber: '203',
          roomType: 'Deluxe Room',
          checkIn: todayStr,
          checkOut: inTwoDaysStr,
          nights: 2,
          pax: '2 Adults',
          source: 'Direct Web',
          status: 'Confirmed',
          amount: 6136,
          totalAmount: 6136,
          balance: 0,
          paymentStatus: 'Paid',
          propertyId: 'HS-9HQ8P',
          createdAt: new Date('2026-09-10T10:00:00.000Z')
        }
      }
    );
    console.log('Updated Sunny booking:', sunnyExisting.bookingId);
  }

  // 3. Clear duplicate payments and Synchronize Payments Collection
  await db.collection('payments').deleteMany({});

  const allBookings = await db.collection('bookings').find({}).toArray();
  for (const b of allBookings) {
    const bId = b.bookingId || String(b._id);
    const guestName = b.guest || b.customerName || 'Guest';
    const amount = Number(b.totalAmount || b.amount || 6136);
    const roomNumber = b.roomNumber || (b.room ? b.room.match(/\b\d{3,4}\b/)?.[0] : '101') || '101';
    const status = (b.paymentStatus === 'Paid' || b.status === 'Checked-in' || b.status === 'Checked-out' || Number(b.balance || 0) === 0)
      ? 'Settled'
      : (b.paymentStatus === 'Refunded' ? 'Refunded' : 'Pending');

    await db.collection('payments').insertOne({
      bookingId: bId,
      guestName,
      roomNumber,
      amount,
      paymentMethod: b.paymentMethod || 'UPI',
      status,
      propertyId: b.propertyId || 'HS-9HQ8P',
      createdAt: b.createdAt ? new Date(b.createdAt) : new Date()
    });
    console.log('Inserted payment for:', guestName, '|', bId, '| ₹' + amount, '|', b.createdAt);
  }

  const finalPayments = await db.collection('payments').find({}).sort({ createdAt: -1 }).toArray();
  console.log('\n--- FINAL PAYMENTS IN DB (' + finalPayments.length + ') ---');
  finalPayments.forEach(p => console.log(p.bookingId, '|', p.guestName, '| Room:', p.roomNumber, '| Amount: ₹' + p.amount, '| Status:', p.status, '| Created:', p.createdAt));

  const finalArrivals = await db.collection('bookings').find({
    checkIn: todayStr,
    status: { $in: ['Confirmed', 'Pending', 'Upcoming', 'Booked', 'Reserved', 'Paid'] }
  }).toArray();
  console.log('\n--- TODAY ARRIVALS COUNT IN DB:', finalArrivals.length, '---');
  finalArrivals.forEach(a => console.log(a.bookingId, '|', a.guest, '| Room:', a.roomNumber, '| CheckIn:', a.checkIn, '| ₹' + a.totalAmount));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
