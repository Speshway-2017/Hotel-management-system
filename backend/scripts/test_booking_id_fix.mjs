import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import { connectDB } from '../config/db.config.js';
import Booking from '../models/booking.model.js';
import { buildBookingLookupQuery, isObjectId, formatBooking } from '../utils/bookingHelper.js';

const runTest = async () => {
  try {
    await connectDB();
    console.log('Connected to Database');

    // 1. Check helper logic
    console.log('Testing isObjectId:');
    console.log('isObjectId("BK-20101") ===', isObjectId('BK-20101')); // false
    console.log('isObjectId("65f12345678901234567890a") ===', isObjectId('65f12345678901234567890a')); // true

    console.log('Testing buildBookingLookupQuery:');
    const q1 = buildBookingLookupQuery('BK-20101');
    console.log('Query for BK-20101:', JSON.stringify(q1));

    const q2 = buildBookingLookupQuery('65f12345678901234567890a');
    console.log('Query for ObjectId:', JSON.stringify(q2));

    // 2. Clean or seed a test booking with bookingId "BK-20101"
    await Booking.deleteMany({ bookingId: { $in: ['BK-20101', 'BK-99999'] } });

    const testBk = await Booking.create({
      bookingId: 'BK-20101',
      guest: 'Test Guest 20101',
      email: 'testguest20101@example.com',
      phone: '9876543210',
      propertyId: 'HS-9HQ8P',
      room: '201 · Deluxe Room',
      roomNumber: '201',
      roomType: 'Deluxe Room',
      checkIn: '2026-09-24',
      checkOut: '2026-09-26',
      amount: 4000,
      totalAmount: 4000,
      balance: 4000,
      status: 'Confirmed',
      source: 'Website'
    });
    console.log('Created test booking:', testBk._id, testBk.bookingId);

    // 3. Test Booking.findById with "BK-20101"
    console.log('\n--- Test 3: Booking.findById("BK-20101") ---');
    const foundByRef = await Booking.findById('BK-20101');
    console.log('Found by BK-20101:', foundByRef ? `YES (id: ${foundByRef._id}, bookingId: ${foundByRef.bookingId})` : 'NO');
    if (!foundByRef) throw new Error('Failed to find booking by reference BK-20101');

    // 4. Test Booking.findById with ObjectId
    console.log('\n--- Test 4: Booking.findById(ObjectId) ---');
    const foundByObjId = await Booking.findById(testBk._id.toString());
    console.log('Found by ObjectId:', foundByObjId ? `YES (id: ${foundByObjId._id}, bookingId: ${foundByObjId.bookingId})` : 'NO');
    if (!foundByObjId) throw new Error('Failed to find booking by ObjectId');

    // 5. Test Booking.findByIdAndUpdate with "BK-20101"
    console.log('\n--- Test 5: Booking.findByIdAndUpdate("BK-20101") ---');
    const updatedByRef = await Booking.findByIdAndUpdate('BK-20101', { balance: 2000 }, { new: true });
    console.log('Updated balance by BK-20101:', updatedByRef?.balance);
    if (updatedByRef?.balance !== 2000) throw new Error('Failed to update booking by reference BK-20101');

    // 6. Test Booking.findOne with buildBookingLookupQuery("BK-20101")
    console.log('\n--- Test 6: Booking.findOne(buildBookingLookupQuery("BK-20101")) ---');
    const foundLookup = await Booking.findOne(buildBookingLookupQuery('BK-20101'));
    console.log('Found via buildBookingLookupQuery:', foundLookup?.guest);
    if (!foundLookup) throw new Error('Failed to find booking via buildBookingLookupQuery');

    // 7. Test formatBooking
    const formatted = formatBooking(foundLookup);
    console.log('Formatted booking id:', formatted.id, '_id:', formatted._id, 'bookingId:', formatted.bookingId);
    if (formatted.bookingId !== 'BK-20101') throw new Error('Formatted bookingId mismatch');

    // 8. Clean up
    await Booking.findByIdAndDelete('BK-20101');
    console.log('Successfully deleted test booking BK-20101');

    console.log('\n✅ ALL DATABASE TESTS PASSED WITHOUT CASTERRORED OBJECTID EXCEPTIONS!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTest();
