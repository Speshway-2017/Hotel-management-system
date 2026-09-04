import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';
import { Room } from '../models/managerData.model.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  // Today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]; // 2026-09-04
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const inTwoDays = new Date(Date.now() + 172800000).toISOString().split('T')[0];
  const inThreeDays = new Date(Date.now() + 259200000).toISOString().split('T')[0];

  console.log(`Setting dates relative to Today (${today}):`);
  console.log(`- Yesterday: ${yesterday}`);
  console.log(`- Today: ${today}`);
  console.log(`- Tomorrow: ${tomorrow}`);

  // 1. Mani (BK-10102): Checked-in guest departing TODAY
  await Booking.findOneAndUpdate(
    { guest: 'Mani' },
    {
      bookingId: 'BK-10102',
      guest: 'Mani',
      email: 'mani@gmail.com',
      phone: '+91 98765 43210',
      room: '101 · Standard Room',
      roomNumber: '101',
      roomType: 'Standard Room',
      checkIn: yesterday,
      checkOut: today,
      nights: 1,
      pax: '2 Adults',
      source: 'Direct Web',
      status: 'Checked-in',
      amount: 8500,
      totalAmount: 8500,
      balance: 0,
      paymentStatus: 'Paid',
      propertyId: 'HS-JAI'
    },
    { upsert: true, new: true }
  );

  // 2. Kavya (BK-10401): Confirmed guest arriving TODAY
  await Booking.findOneAndUpdate(
    { guest: 'Kavya' },
    {
      bookingId: 'BK-10401',
      guest: 'Kavya',
      email: 'kavya@gmail.com',
      phone: '+91 98765 10401',
      room: '104 · Standard Room',
      roomNumber: '104',
      roomType: 'Standard Room',
      checkIn: today,
      checkOut: inTwoDays,
      nights: 2,
      pax: '2 Adults',
      source: 'Direct Web',
      status: 'Confirmed',
      amount: 8500,
      totalAmount: 8500,
      balance: 0,
      paymentStatus: 'Paid',
      propertyId: 'HS-JAI'
    },
    { upsert: true, new: true }
  );

  // 3. Vamsi (BK-10202): Upcoming guest arriving TOMORROW (MUST NOT be in Today's Arrivals or Departures)
  await Booking.findOneAndUpdate(
    { guest: 'Vamsi' },
    {
      bookingId: 'BK-10202',
      guest: 'Vamsi',
      email: 'vamsi@gmail.com',
      phone: '+91 98765 10202',
      room: '102 · Standard Room',
      roomNumber: '102',
      roomType: 'Standard Room',
      checkIn: tomorrow,
      checkOut: inThreeDays,
      nights: 2,
      pax: '2 Adults',
      source: 'Direct Web',
      status: 'Confirmed',
      amount: 7000,
      totalAmount: 7000,
      balance: 0,
      paymentStatus: 'Paid',
      propertyId: 'HS-JAI'
    },
    { upsert: true, new: true }
  );

  // 4. Past Checked-out guests
  await Booking.findOneAndUpdate(
    { guest: 'Surya' },
    {
      bookingId: 'BK-10301',
      guest: 'Surya',
      email: 'surya@gmail.com',
      phone: '+91 47362 54654',
      room: '103 · Standard Room',
      roomNumber: '103',
      roomType: 'Standard Room',
      checkIn: '2026-09-01',
      checkOut: '2026-09-02',
      nights: 1,
      status: 'Checked-out',
      amount: 8500,
      totalAmount: 8500,
      balance: 0,
      paymentStatus: 'Paid',
      propertyId: 'HS-JAI'
    },
    { upsert: true, new: true }
  );

  await Booking.findOneAndUpdate(
    { guest: 'Aswini' },
    {
      bookingId: 'BK-20202',
      guest: 'Aswini',
      email: 'aswini@gmail.com',
      phone: '+91 98840 20203',
      room: '202 · Deluxe Room',
      roomNumber: '202',
      roomType: 'Deluxe Room',
      checkIn: '2026-09-01',
      checkOut: '2026-09-03',
      nights: 2,
      status: 'Checked-out',
      amount: 14500,
      totalAmount: 14500,
      balance: 0,
      paymentStatus: 'Paid',
      propertyId: 'HS-JAI'
    },
    { upsert: true, new: true }
  );

  // Update room statuses: Room 101 occupied by Mani
  await Room.findOneAndUpdate({ roomNumber: '101' }, { status: 'Occupied' });
  await Room.findOneAndUpdate({ roomNumber: '102' }, { status: 'Available' });
  await Room.findOneAndUpdate({ roomNumber: '103' }, { status: 'Available' });
  await Room.findOneAndUpdate({ roomNumber: '104' }, { status: 'Available' });

  console.log('Successfully synchronized bookings with today-relative dates.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
