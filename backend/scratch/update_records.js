import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB } from '../config/db.config.js';
import 'dotenv/config';
import mongoose from 'mongoose';

async function updateRecords() {
  await connectDB();
  const db = mongoose.connection.db;

  console.log('🔄 Setting Sunny latest booking to Room 201, Amount 4560, Status Checked-in...');
  
  const updates = [
    {
      bookingId: 'BK451335',
      room: '201 · Deluxe Room',
      roomNumber: '201',
      roomType: 'Deluxe Room',
      originalAmount: 5310,
      discountAmount: 750,
      couponCode: 'SAVE15',
      amount: 4560,
      totalAmount: 4560,
      netAmount: 4560,
      paidAmount: 4560,
      nights: 2,
      checkIn: '2026-09-17',
      checkOut: '2026-09-19',
      createdAt: new Date('2026-09-17T09:30:00.000Z'),
      status: 'Checked-in'
    },
    {
      bookingId: 'BK937150',
      room: '101 · Standard Room',
      roomNumber: '101',
      roomType: 'Standard Room',
      originalAmount: 4200,
      discountAmount: 840,
      couponCode: 'WELCOME20',
      amount: 3360,
      totalAmount: 3360,
      netAmount: 3360,
      paidAmount: 3360,
      nights: 2,
      checkIn: '2026-09-14',
      checkOut: '2026-09-16',
      createdAt: new Date('2026-09-14T10:00:00.000Z'),
      status: 'Checked-out'
    },
    {
      bookingId: 'BK-28114',
      room: '102 · Standard Room',
      roomNumber: '102',
      roomType: 'Standard Room',
      originalAmount: 3800,
      discountAmount: 0,
      couponCode: null,
      amount: 3800,
      totalAmount: 3800,
      netAmount: 3800,
      paidAmount: 3800,
      nights: 2,
      checkIn: '2026-09-11',
      checkOut: '2026-09-13',
      createdAt: new Date('2026-09-11T10:00:00.000Z'),
      status: 'Checked-out'
    },
    {
      bookingId: 'BK527311',
      room: '102 · Standard Room',
      roomNumber: '102',
      roomType: 'Standard Room',
      originalAmount: 3800,
      discountAmount: 0,
      couponCode: null,
      amount: 3800,
      totalAmount: 3800,
      netAmount: 3800,
      paidAmount: 3800,
      nights: 2,
      checkIn: '2026-09-08',
      checkOut: '2026-09-10',
      createdAt: new Date('2026-09-08T10:00:00.000Z'),
      status: 'Checked-out'
    },
    {
      bookingId: 'BK035737',
      room: '103 · Standard Room',
      roomNumber: '103',
      roomType: 'Standard Room',
      originalAmount: 2400,
      discountAmount: 0,
      couponCode: null,
      amount: 2400,
      totalAmount: 2400,
      netAmount: 2400,
      paidAmount: 2400,
      nights: 1,
      checkIn: '2026-09-06',
      checkOut: '2026-09-07',
      createdAt: new Date('2026-09-06T10:00:00.000Z'),
      status: 'Cancelled'
    },
    {
      bookingId: 'BK-95429',
      room: '201 · Deluxe Room',
      roomNumber: '201',
      roomType: 'Deluxe Room',
      originalAmount: 5800,
      discountAmount: 0,
      couponCode: null,
      amount: 5800,
      totalAmount: 5800,
      netAmount: 5800,
      paidAmount: 5800,
      nights: 2,
      checkIn: '2026-09-04',
      checkOut: '2026-09-06',
      createdAt: new Date('2026-09-04T10:00:00.000Z'),
      status: 'Checked-out'
    },
    {
      bookingId: 'BK280125',
      room: '301 · Executive Suite',
      roomNumber: '301',
      roomType: 'Executive Suite',
      originalAmount: 11500,
      discountAmount: 2300,
      couponCode: 'LUXURY20',
      amount: 9200,
      totalAmount: 9200,
      netAmount: 9200,
      paidAmount: 9200,
      nights: 2,
      checkIn: '2026-09-01',
      checkOut: '2026-09-03',
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      status: 'Checked-out'
    },
    {
      bookingId: 'BK400763',
      room: '102 · Standard Room',
      roomNumber: '102',
      roomType: 'Standard Room',
      originalAmount: 3500,
      discountAmount: 0,
      couponCode: null,
      amount: 3500,
      totalAmount: 3500,
      netAmount: 3500,
      paidAmount: 3500,
      nights: 2,
      checkIn: '2026-08-28',
      checkOut: '2026-08-30',
      createdAt: new Date('2026-08-28T10:00:00.000Z'),
      status: 'Checked-out'
    },
    {
      bookingId: 'BK431552',
      room: '202 · Deluxe Room',
      roomNumber: '202',
      roomType: 'Deluxe Room',
      originalAmount: 5200,
      discountAmount: 0,
      couponCode: null,
      amount: 5200,
      totalAmount: 5200,
      netAmount: 5200,
      paidAmount: 5200,
      nights: 2,
      checkIn: '2026-08-25',
      checkOut: '2026-08-27',
      createdAt: new Date('2026-08-25T10:00:00.000Z'),
      status: 'Checked-out'
    }
  ];

  for (const item of updates) {
    await db.collection('bookings').updateOne(
      { bookingId: item.bookingId },
      {
        $set: {
          ...item,
          balance: 0,
          paymentStatus: item.status === 'Cancelled' ? 'Refundable' : 'Paid'
        }
      }
    );

    await db.collection('payments').updateOne(
      { bookingId: item.bookingId },
      {
        $set: {
          amount: item.amount,
          paidAmount: item.paidAmount,
          originalAmount: item.originalAmount,
          discountAmount: item.discountAmount,
          couponCode: item.couponCode,
          status: item.status === 'Cancelled' ? 'Refunded' : 'Settled',
          roomNumber: item.roomNumber,
          createdAt: item.createdAt
        }
      },
      { upsert: false }
    );
  }

  // Also update Room 201 status in rooms collection to Occupied
  await db.collection('rooms').updateOne({ roomNumber: '201' }, { $set: { status: 'Occupied' } });

  const bookings = await db.collection('bookings').find({ guest: /sunny/i }).sort({ checkIn: -1 }).toArray();
  console.log('--- SUNNY BOOKINGS (LATEST AT TOP) ---');
  bookings.forEach(b => console.log(b.bookingId, '| Room:', b.room, '| Tariff: ₹' + b.amount, '| Gross: ₹' + b.originalAmount, '| Disc: ₹' + b.discountAmount, '| Status:', b.status, '| Dates:', b.checkIn, '→', b.checkOut));

  console.log('✅ Sunny latest booking successfully configured to Room 201, ₹4,560, Checked-in!');
  process.exit(0);
}

updateRecords().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
