import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from '../config/db.config.js';
import Booking from '../models/booking.model.js';
import { Room } from '../models/managerData.model.js';
import { isBookingMatchingRoom, parseDateToDayUtc, isStayDateOverlapping, isBookingStatusActive } from '../utils/roomHelper.js';

async function check() {
  await connectDB();

  const sunnyBookings = await Booking.find({ $or: [{ guest: /sunny/i }, { email: /sunny/i }] });
  console.log('Sunny bookings count:', sunnyBookings.length);
  for (const b of sunnyBookings) {
    console.log('Booking:', {
      bookingId: b.bookingId,
      guest: b.guest,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      roomId: b.roomId,
      roomNumber: b.roomNumber,
      room: b.room,
      roomType: b.roomType,
      status: b.status,
      propertyId: b.propertyId
    });
  }

  const rooms = await Room.find();
  console.log('\nTotal rooms in DB:', rooms.length);
  for (const rm of rooms) {
    console.log('Room:', {
      _id: rm._id,
      roomNumber: rm.roomNumber,
      category: rm.category,
      status: rm.status,
      propertyId: rm.propertyId
    });
  }

  console.log('\n--- Checking overlap for 2026-10-07 to 2026-10-08 ---');
  const reqInDay = parseDateToDayUtc('2026-10-07');
  const reqOutDay = parseDateToDayUtc('2026-10-08');

  for (const rm of rooms) {
    const matchedBookings = sunnyBookings.filter(b => isBookingMatchingRoom(b, rm));
    console.log(`Room ${rm.roomNumber} (${rm.category}) matched bookings:`, matchedBookings.length);
    for (const b of matchedBookings) {
      const overlap = isStayDateOverlapping(reqInDay, reqOutDay, b.checkIn, b.checkOut);
      console.log(`  -> Overlap with booking ${b.bookingId} (${b.checkIn} to ${b.checkOut}): ${overlap}`);
    }
  }

  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
