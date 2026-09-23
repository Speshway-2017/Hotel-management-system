import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:5000/api';

import { connectDB } from '../config/db.config.js';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running Strict Check-In & Auto Check-Out Verification');
  console.log('====================================================\n');

  // Test 1: Server time endpoint
  console.log('▶ Test 1: Fetching Server Time from API...');
  const timeRes = await fetch(`${API_BASE}/public/server-time`);
  const timeData = await timeRes.json();
  console.log('  Status:', timeRes.status);
  console.log('  Formatted IST:', timeData?.data?.formattedIST);
  if (!timeData.success || !timeData.data.serverTime) {
    throw new Error('Test 1 Failed: Server time endpoint not responding properly');
  }
  console.log('  ✔ Test 1 Passed: Server time is ' + timeData.data.formattedIST);

  // Test 2: Connect to MongoDB via robust connectDB helper
  await connectDB();
  console.log('\n▶ Connected to MongoDB successfully.');

  const Booking = mongoose.connection.collection('bookings');
  const Room = mongoose.connection.collection('rooms');
  const Folio = mongoose.connection.collection('folios');
  const User = mongoose.connection.collection('users');

  // Find staff user
  const staffUser = await User.findOne({ role: { $in: ['receptionist', 'manager', 'admin', 'super-admin'] } });
  if (!staffUser) {
    throw new Error('No staff user found in database');
  }
  console.log('  Staff user identified:', staffUser.email, `(${staffUser.role})`);

  // Generate auth token
  const authToken = jwt.sign(
    {
      id: staffUser._id.toString(),
      email: staffUser.email,
      role: staffUser.role,
      propertyId: staffUser.propertyId || 'HS-9HQ8P'
    },
    process.env.JWT_SECRET || 'hourstay_hms_jwt_secret_token_12345!',
    { expiresIn: '1d' }
  );
  console.log('  ✔ Auth token generated successfully');

  // Test 3: Create a test booking with FUTURE check-in date (2026-09-30 12:00 PM)
  console.log('\n▶ Test 3: Verifying Early Check-In Rejection...');
  const futureBookingId = 'TEST-FUT-' + Date.now();
  const testRoomNum = 'TEST-RM-99';
  
  await Room.updateOne(
    { roomNumber: testRoomNum },
    { $set: { roomNumber: testRoomNum, roomType: 'Standard Room', status: 'Available', cleanStatus: 'Clean' } },
    { upsert: true }
  );

  const futureBookingDoc = {
    bookingId: futureBookingId,
    guest: 'Test Future Guest',
    email: 'testguest@example.com',
    phone: '9876543210',
    checkIn: '2026-09-30',
    checkOut: '2026-10-02',
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
    room: testRoomNum,
    roomNumber: testRoomNum,
    roomType: 'Standard Room',
    status: 'Confirmed',
    amount: 5000,
    balance: 0,
    source: 'Website',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const insertResult = await Booking.insertOne(futureBookingDoc);
  const createdId = insertResult.insertedId.toString();

  // Try checking in early via API
  const checkinEndpoint = staffUser.role === 'receptionist'
    ? `${API_BASE}/v1/receptionist/reservations/${createdId}/status`
    : `${API_BASE}/v1/manager/reservations/${createdId}`;

  const payload = staffUser.role === 'receptionist'
    ? { status: 'Checked-in', roomNumber: testRoomNum }
    : { status: 'Checked-in' };

  const checkinRes = await fetch(checkinEndpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  });

  const checkinData = await checkinRes.json();
  console.log('  Early check-in response status:', checkinRes.status);
  console.log('  Early check-in message:', checkinData.message);

  if (checkinRes.status === 400 && checkinData.message && (checkinData.message.includes('Check-in is only permitted') || checkinData.message.includes('Check-in is not permitted'))) {
    console.log('  ✔ Test 3 Passed: Backend strictly blocked early check-in using server time!');
  } else {
    throw new Error(`Test 3 Failed: Early check-in was not rejected as expected. Status: ${checkinRes.status}, Body: ${JSON.stringify(checkinData)}`);
  }

  // Test 3b: User Specific Example: 23 Sep 2026, 12:00 PM (past now -> permitted) vs 5:00 PM (future -> locked)
  console.log('\n▶ Test 3b: Verifying Same-Day Check-in (12:00 PM vs 5:00 PM)...');
  const lockedSameDayId = 'TEST-TODAY-5PM-' + Date.now();
  const lockedSameDayDoc = {
    bookingId: lockedSameDayId,
    guest: 'Test Same Day 5PM Guest',
    email: 'test5pm@example.com',
    phone: '9876543212',
    checkIn: '2026-09-23',
    checkOut: '2026-09-24',
    checkInTime: '05:00 PM', // Later today -> must be locked
    checkOutTime: '11:00 AM',
    room: testRoomNum,
    roomNumber: testRoomNum,
    roomType: 'Standard Room',
    status: 'Confirmed',
    amount: 4000,
    balance: 0,
    source: 'Walk-in',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const lockedSameDayInsert = await Booking.insertOne(lockedSameDayDoc);
  const lockedSameDayEndpoint = staffUser.role === 'receptionist'
    ? `${API_BASE}/v1/receptionist/reservations/${lockedSameDayInsert.insertedId}/status`
    : `${API_BASE}/v1/manager/reservations/${lockedSameDayInsert.insertedId}`;

  const lockedRes = await fetch(lockedSameDayEndpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
    body: JSON.stringify(payload)
  });
  const lockedData = await lockedRes.json();
  console.log('  23 Sep 5:00 PM check-in status:', lockedRes.status);
  console.log('  23 Sep 5:00 PM check-in message:', lockedData.message);
  if (lockedRes.status !== 400) {
    throw new Error('Test 3b Failed: Same-day future hour check-in was not blocked!');
  }
  console.log('  ✔ 23 Sep 5:00 PM correctly BLOCKED before 5:00 PM!');

  // Now test 23 Sep 12:00 PM (which has arrived since server time is ~2:15 PM)
  const allowedSameDayId = 'TEST-TODAY-12PM-' + Date.now();
  const allowedSameDayDoc = {
    bookingId: allowedSameDayId,
    guest: 'Test Same Day 12PM Guest',
    email: 'test12pm@example.com',
    phone: '9876543213',
    checkIn: '2026-09-23',
    checkOut: '2026-09-24',
    checkInTime: '12:00 PM', // 12:00 PM has already arrived today!
    checkOutTime: '11:00 AM',
    room: testRoomNum,
    roomNumber: testRoomNum,
    roomType: 'Standard Room',
    status: 'Confirmed',
    amount: 4000,
    balance: 0,
    source: 'Walk-in',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const allowedSameDayInsert = await Booking.insertOne(allowedSameDayDoc);
  const allowedSameDayEndpoint = staffUser.role === 'receptionist'
    ? `${API_BASE}/v1/receptionist/reservations/${allowedSameDayInsert.insertedId}/status`
    : `${API_BASE}/v1/manager/reservations/${allowedSameDayInsert.insertedId}`;

  const allowedRes = await fetch(allowedSameDayEndpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
    body: JSON.stringify(payload)
  });
  const allowedData = await allowedRes.json();
  console.log('  23 Sep 12:00 PM check-in status:', allowedRes.status);
  console.log('  23 Sep 12:00 PM check-in success:', allowedData.success);
  if (allowedRes.status !== 200 || !allowedData.success) {
    throw new Error(`Test 3b Failed: 23 Sep 12:00 PM was not allowed! Status: ${allowedRes.status}, Body: ${JSON.stringify(allowedData)}`);
  }
  console.log('  ✔ 23 Sep 12:00 PM correctly PERMITTED and checked in!');

  // Clean up 3b bookings
  await Booking.deleteOne({ _id: lockedSameDayInsert.insertedId });
  await Booking.deleteOne({ _id: allowedSameDayInsert.insertedId });

  // Test 4: Auto-checkout test for DUE checkout booking
  console.log('\n▶ Test 4: Verifying Auto-Checkout Service for Overdue Booking...');
  const pastCheckoutBookingId = 'TEST-DUE-' + Date.now();
  const testOccupiedRoomNum = '998';

  await Room.updateOne(
    { roomNumber: testOccupiedRoomNum },
    { $set: { roomNumber: testOccupiedRoomNum, category: 'Standard Room', propertyId: 'HS-9HQ8P', status: 'Occupied', cleanStatus: 'Clean' } },
    { upsert: true }
  );

  const pastBookingDoc = {
    bookingId: pastCheckoutBookingId,
    guest: 'Test Overdue Guest',
    email: 'overdue@example.com',
    phone: '9876543211',
    propertyId: 'HS-9HQ8P',
    checkIn: '2026-09-20',
    checkOut: '2026-09-22',
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM', // 22 Sep 11:00 AM is before current server time 23 Sep
    room: testOccupiedRoomNum,
    roomNumber: testOccupiedRoomNum,
    roomType: 'Standard Room',
    status: 'Checked-in',
    folioStatus: 'Open',
    amount: 6000,
    balance: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const overdueObjectId = new mongoose.Types.ObjectId();
  const overdueId = overdueObjectId.toString();
  pastBookingDoc._id = overdueObjectId;

  // Create associated folio before booking insertion
  await Folio.updateOne(
    { reservationId: overdueId },
    {
      $set: {
        reservationId: overdueId,
        bookingId: pastCheckoutBookingId,
        guestName: 'Test Overdue Guest',
        roomNumber: testOccupiedRoomNum,
        status: 'Open',
        totalCharges: 6000,
        totalPayments: 6000,
        balance: 0
      }
    },
    { upsert: true }
  );

  const overdueInsert = await Booking.insertOne(pastBookingDoc);

  console.log(`  Inserted active booking ${pastCheckoutBookingId} with checkOut: 2026-09-22 11:00 AM, room: ${testOccupiedRoomNum} (Occupied)`);

  // Run the auto-checkout service
  const { processAutoCheckouts } = await import('../services/autoCheckout.service.js');
  const result = await processAutoCheckouts(null);
  console.log('  Auto-checkout process result:', result);

  // Verify booking status
  const updatedBooking = await Booking.findOne({ _id: overdueInsert.insertedId });
  console.log('  Updated booking status:', updatedBooking?.status, '| folioStatus:', updatedBooking?.folioStatus);

  // Verify room status
  const updatedRoom = await Room.findOne({ roomNumber: testOccupiedRoomNum });
  console.log('  Updated room status:', updatedRoom?.status);

  // Verify folio status
  const updatedFolio = await Folio.findOne({ reservationId: overdueId });
  console.log('  Updated folio status:', updatedFolio?.status);

  if (updatedBooking?.status === 'Checked-out' && updatedRoom?.status === 'Available' && updatedFolio?.status === 'Closed') {
    console.log('  ✔ Test 4 Passed: Auto-checkout automatically updated Booking -> Checked-out, Room -> Available, Folio -> Closed!');
  } else {
    throw new Error('Test 4 Failed: Auto-checkout did not update all records correctly');
  }

  // Test 5: Verify extend stay is blocked on checked-out booking
  console.log('\n▶ Test 5: Verifying Extend Stay Blocked on Checked-Out Booking...');
  const extendEndpoint = staffUser.role === 'receptionist'
    ? `${API_BASE}/v1/receptionist/reservations/extend/${overdueId}`
    : `${API_BASE}/v1/manager/reservations/${overdueId}/extend`;

  const extendRes = await fetch(extendEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      newCheckOut: '2026-09-25',
      additionalNights: 3,
      additionalAmount: 1500
    })
  });

  const extendData = await extendRes.json();
  console.log('  Extend response status:', extendRes.status);
  console.log('  Extend response message:', extendData.message);

  if (extendRes.status === 400 && extendData.message && (extendData.message.toLowerCase().includes('checked-out') || extendData.message.toLowerCase().includes('checked out'))) {
    console.log('  ✔ Test 5 Passed: Extend Stay strictly rejected for checked-out booking!');
  } else {
    throw new Error(`Test 5 Failed: Extend stay was not blocked. Status: ${extendRes.status}, Body: ${JSON.stringify(extendData)}`);
  }

  // Clean up test documents
  await Booking.deleteOne({ _id: insertResult.insertedId });
  await Booking.deleteOne({ _id: overdueInsert.insertedId });
  await Room.deleteOne({ roomNumber: testRoomNum });
  await Room.deleteOne({ roomNumber: testOccupiedRoomNum });
  await Folio.deleteOne({ reservationId: overdueId });

  console.log('\n====================================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
