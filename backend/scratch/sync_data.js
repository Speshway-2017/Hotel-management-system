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

  // 1. In-stay guest: Mani in Room 101, Checked-in
  await Booking.findOneAndUpdate(
    { $or: [{ guest: 'Mounika' }, { guest: 'Mani' }] },
    { guest: 'Mani', status: 'Checked-in', room: '101 · Standard Room', roomNumber: '101', balance: 0, paymentStatus: 'Paid' },
    { upsert: true, new: true }
  );

  // 2. Arrivals guest: Vamsi in Room 102, Confirmed (Arrivals = 1)
  await Booking.findOneAndUpdate(
    { guest: 'Vamsi' },
    { status: 'Confirmed', room: '102 · Standard Room', roomNumber: '102', balance: 0, paymentStatus: 'Paid' }
  );

  // 3. Checked-out guests: Surya, Aswini, Sai
  await Booking.findOneAndUpdate({ guest: 'Surya' }, { status: 'Checked-out', room: '103 · Standard Room', roomNumber: '103', balance: 0, paymentStatus: 'Paid' });
  await Booking.findOneAndUpdate({ guest: 'Aswini' }, { status: 'Checked-out', room: '202 · Deluxe Room', roomNumber: '202', balance: 0, paymentStatus: 'Paid' });
  await Booking.findOneAndUpdate({ guest: 'Sai' }, { status: 'Checked-out', room: '301 · Executive Suite', roomNumber: '301', balance: 0, paymentStatus: 'Paid' });

  // 4. Ensure exactly 14 rooms exist in the Room collection
  const targetRooms = [
    { roomNumber: '101', category: 'Standard Room', floor: 'Floor 1', price: 8500, status: 'Occupied' }, // Mani
    { roomNumber: '102', category: 'Standard Room', floor: 'Floor 1', price: 7000, status: 'Available' }, // Vamsi (Arrival)
    { roomNumber: '103', category: 'Standard Room', floor: 'Floor 1', price: 8500, status: 'Available' }, // Surya (Checked-out)
    { roomNumber: '104', category: 'Standard Room', floor: 'Floor 1', price: 8500, status: 'Available' },
    { roomNumber: '201', category: 'Deluxe Room', floor: 'Floor 2', price: 12000, status: 'Available' },
    { roomNumber: '202', category: 'Deluxe Room', floor: 'Floor 2', price: 14500, status: 'Available' }, // Aswini (Checked-out)
    { roomNumber: '203', category: 'Deluxe Room', floor: 'Floor 2', price: 12000, status: 'Available' },
    { roomNumber: '204', category: 'Deluxe Room', floor: 'Floor 2', price: 12000, status: 'Available' },
    { roomNumber: '301', category: 'Executive Suite', floor: 'Floor 3', price: 21000, status: 'Available' }, // Sai (Checked-out)
    { roomNumber: '302', category: 'Executive Suite', floor: 'Floor 3', price: 21000, status: 'Available' },
    { roomNumber: '303', category: 'Executive Suite', floor: 'Floor 3', price: 21000, status: 'Available' },
    { roomNumber: '304', category: 'Executive Suite', floor: 'Floor 3', price: 21000, status: 'Available' },
    { roomNumber: '401', category: 'Presidential Suite', floor: 'Floor 4', price: 35000, status: 'Available' },
    { roomNumber: '402', category: 'Presidential Suite', floor: 'Floor 4', price: 35000, status: 'Available' }
  ];

  for (const r of targetRooms) {
    await Room.findOneAndUpdate(
      { roomNumber: r.roomNumber },
      { 
        roomNumber: r.roomNumber,
        category: r.category,
        roomType: r.category,
        floor: r.floor,
        price: r.price,
        rate: r.price,
        status: r.status,
        propertyName: 'Speshway Luxury Hotel',
        propertyId: 'HS-JAI'
      },
      { upsert: true, new: true }
    );
  }

  const allBookings = await Booking.find({});
  console.log('Final Bookings State:');
  allBookings.forEach(b => {
    console.log(`- Guest: ${b.guest} | Room: ${b.roomNumber} | Status: ${b.status} | BookingId: ${b.bookingId}`);
  });

  const allRooms = await Room.find({});
  const occupied = allRooms.filter(r => r.status === 'Occupied').length;
  const available = allRooms.filter(r => r.status === 'Available').length;
  console.log(`Total Rooms: ${allRooms.length} | Occupied: ${occupied} | Available: ${available}`);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
