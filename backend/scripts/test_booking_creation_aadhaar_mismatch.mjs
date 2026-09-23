import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectDB } from '../config/db.config.js';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';

async function runTests() {
  console.log('================================================================');
  console.log('  TESTING PERMANENT AADHAAR MISMATCH BLOCK ON BOOKING CREATION  ');
  console.log('================================================================\n');

  await connectDB();

  const BASE_URL = 'http://localhost:5000/api';
  const createdUserIds = [];
  const createdBookingIds = [];

  try {
    // 1. Setup staff users and auth tokens
    let receptionist = await User.findOne({ role: 'receptionist', status: 'Active' });
    if (!receptionist) {
      receptionist = await User.create({
        name: 'Test Receptionist',
        email: `receptionist.test.${Date.now()}@hotel.com`,
        password: 'Password123!',
        role: 'receptionist',
        status: 'Active'
      });
      createdUserIds.push(receptionist._id);
    }
    const recToken = jwt.sign(
      { id: receptionist._id, role: 'receptionist', email: receptionist.email, propertyId: 'HS-9HQ8P' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    let manager = await User.findOne({ role: 'manager', status: 'Active' });
    if (!manager) {
      manager = await User.create({
        name: 'Test Manager',
        email: `manager.test.${Date.now()}@hotel.com`,
        password: 'Password123!',
        role: 'manager',
        status: 'Active'
      });
      createdUserIds.push(manager._id);
    }
    const mgrToken = jwt.sign(
      { id: manager._id, role: 'manager', email: manager.email, propertyId: 'HS-9HQ8P' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    let admin = await User.findOne({ role: { $in: ['super-admin', 'admin'] }, status: 'Active' });
    if (!admin) {
      admin = await User.create({
        name: 'Test Admin',
        email: `admin.test.${Date.now()}@hotel.com`,
        password: 'Password123!',
        role: 'super-admin',
        status: 'Active'
      });
      createdUserIds.push(admin._id);
    }
    const adminToken = jwt.sign(
      { id: admin._id, role: admin.role, email: admin.email, propertyId: 'HS-9HQ8P' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Setup Existing Guest with Verified Aadhaar
    const timestamp = Date.now();
    const existingGuestEmail = `rajesh.kumar.${timestamp}@example.com`;
    const existingGuestPhone = '987' + String(timestamp).slice(-7);
    const registeredAadhaar = '5432 1098 7654'; // 12 digits

    const existingGuest = await User.create({
      name: 'Rajesh Kumar',
      email: existingGuestEmail,
      mobile: existingGuestPhone,
      password: 'Password123!',
      role: 'guest',
      status: 'Active',
      idDocType: 'Aadhaar Card',
      idDocNumber: registeredAadhaar,
      idProofType: 'Aadhaar Card',
      idProofNumber: registeredAadhaar,
      verifiedAadhaar: registeredAadhaar,
      verifiedAadhaarLast4: '7654',
      isAadhaarVerified: true,
      aadhaarVerifiedAt: new Date()
    });
    createdUserIds.push(existingGuest._id);

    console.log(`[SETUP] Created existing guest: ${existingGuest.name}`);
    console.log(`        Email: ${existingGuestEmail}, Phone: ${existingGuestPhone}`);
    console.log(`        Verified Aadhaar on file: ${registeredAadhaar} (ends in 7654)\n`);

    const wrongAadhaar = '9999 8888 1234'; // Different Aadhaar!

    // -------------------------------------------------------------
    // TEST 1: Receptionist POST /reservations with WRONG Aadhaar
    // -------------------------------------------------------------
    console.log('[TEST 1] Receptionist creating booking for existing guest with WRONG Aadhaar...');
    const recRes = await fetch(`${BASE_URL}/receptionist/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recToken}`
      },
      body: JSON.stringify({
        guest: 'Rajesh Kumar',
        email: existingGuestEmail,
        phone: existingGuestPhone,
        idProofType: 'Aadhaar Card',
        idProofNumber: wrongAadhaar,
        room: '101',
        roomType: 'Standard Room',
        checkIn: '2026-10-01',
        checkOut: '2026-10-03',
        nights: 2,
        amount: 6000,
        status: 'Confirmed'
      })
    });
    const recData = await recRes.json();
    console.log(`         HTTP Status: ${recRes.status}`);
    console.log(`         Response message: "${recData.message}"`);
    if (recRes.status === 400 && recData.message && recData.message.toLowerCase().includes('mismatch')) {
      console.log('         >>> PASS: Booking was permanently blocked due to Aadhaar mismatch!\n');
    } else {
      throw new Error(`TEST 1 FAILED: Expected HTTP 400 with Aadhaar mismatch error, got ${recRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST 2: Manager POST /reservations with WRONG Aadhaar
    // -------------------------------------------------------------
    console.log('[TEST 2] Manager creating booking for existing guest with WRONG Aadhaar...');
    const mgrRes = await fetch(`${BASE_URL}/manager/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mgrToken}`
      },
      body: JSON.stringify({
        guest: 'Rajesh Kumar',
        email: existingGuestEmail,
        phone: existingGuestPhone,
        idProofType: 'Aadhaar Card',
        idProofNumber: wrongAadhaar,
        room: '102',
        roomType: 'Standard Room',
        checkIn: '2026-10-05',
        checkOut: '2026-10-07',
        nights: 2,
        amount: 6000,
        status: 'Confirmed'
      })
    });
    const mgrData = await mgrRes.json();
    console.log(`         HTTP Status: ${mgrRes.status}`);
    console.log(`         Response message: "${mgrData.message}"`);
    if (mgrRes.status === 400 && mgrData.message && mgrData.message.toLowerCase().includes('mismatch')) {
      console.log('         >>> PASS: Manager booking was blocked due to Aadhaar mismatch!\n');
    } else {
      throw new Error(`TEST 2 FAILED: Expected HTTP 400 with Aadhaar mismatch error, got ${mgrRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST 3: SuperAdmin POST /reservations with WRONG Aadhaar
    // -------------------------------------------------------------
    console.log('[TEST 3] SuperAdmin creating booking for existing guest with WRONG Aadhaar...');
    const adminRes = await fetch(`${BASE_URL}/super-admin/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        guest: 'Rajesh Kumar',
        email: existingGuestEmail,
        phone: existingGuestPhone,
        idProofType: 'Aadhaar Card',
        idProofNumber: wrongAadhaar,
        room: '103',
        roomType: 'Standard Room',
        checkIn: '2026-10-10',
        checkOut: '2026-10-12',
        nights: 2,
        amount: 6000,
        status: 'Confirmed'
      })
    });
    const adminData = await adminRes.json();
    console.log(`         HTTP Status: ${adminRes.status}`);
    console.log(`         Response message: "${adminData.message}"`);
    if (adminRes.status === 400 && adminData.message && adminData.message.toLowerCase().includes('mismatch')) {
      console.log('         >>> PASS: SuperAdmin booking was blocked due to Aadhaar mismatch!\n');
    } else {
      throw new Error(`TEST 3 FAILED: Expected HTTP 400 with Aadhaar mismatch error, got ${adminRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST 4: Public website POST /bookings with WRONG Aadhaar
    // -------------------------------------------------------------
    console.log('[TEST 4] Public booking with WRONG Aadhaar for existing guest...');
    const pubRes = await fetch(`${BASE_URL}/public/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: 'Rajesh Kumar',
        email: existingGuestEmail,
        phone: existingGuestPhone,
        idProofType: 'Aadhaar Card',
        idProofNumber: wrongAadhaar,
        roomType: 'Standard Room',
        checkIn: '2026-10-15',
        checkOut: '2026-10-17',
        guests: 2,
        amount: 6000
      })
    });
    const pubData = await pubRes.json();
    console.log(`         HTTP Status: ${pubRes.status}`);
    console.log(`         Response message: "${pubData.message}"`);
    if (pubRes.status === 400 && pubData.message && pubData.message.toLowerCase().includes('mismatch')) {
      console.log('         >>> PASS: Public booking was blocked due to Aadhaar mismatch!\n');
    } else {
      throw new Error(`TEST 4 FAILED: Expected HTTP 400 with Aadhaar mismatch error, got ${pubRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST 5: Receptionist creating booking with CORRECT Aadhaar
    // -------------------------------------------------------------
    console.log('[TEST 5] Receptionist creating booking with CORRECT matching Aadhaar...');
    const correctRes = await fetch(`${BASE_URL}/receptionist/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recToken}`
      },
      body: JSON.stringify({
        guest: 'Rajesh Kumar',
        email: existingGuestEmail,
        phone: existingGuestPhone,
        idProofType: 'Aadhaar Card',
        idProofNumber: registeredAadhaar,
        room: '201',
        roomType: 'Deluxe Room',
        checkIn: '2026-10-01',
        checkOut: '2026-10-03',
        nights: 2,
        amount: 9000,
        status: 'Confirmed'
      })
    });
    const correctData = await correctRes.json();
    console.log(`         HTTP Status: ${correctRes.status}`);
    console.log(`         Success: ${correctData.success}`);
    if ((correctRes.status === 200 || correctRes.status === 201) && correctData.success) {
      console.log('         >>> PASS: Booking confirmed successfully when Aadhaar matches!\n');
      const bId = correctData.data?._id || correctData.data?.id;
      if (bId) createdBookingIds.push(bId);
    } else {
      throw new Error(`TEST 5 FAILED: Expected success with matching Aadhaar, got ${correctRes.status}: ${correctData.message}`);
    }

    // -------------------------------------------------------------
    // TEST 6: New Guest creates booking -> Aadhaar registered
    // -------------------------------------------------------------
    const newGuestEmail = `priya.sharma.${timestamp}@example.com`;
    const newGuestPhone = '912' + String(timestamp).slice(-7);
    const newGuestAadhaar = '3344 5566 7788';

    console.log('[TEST 6] New guest creates first booking with valid Aadhaar...');
    const newGuestRes = await fetch(`${BASE_URL}/receptionist/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recToken}`
      },
      body: JSON.stringify({
        guest: 'Priya Sharma',
        email: newGuestEmail,
        phone: newGuestPhone,
        idProofType: 'Aadhaar Card',
        idProofNumber: newGuestAadhaar,
        room: '202',
        roomType: 'Deluxe Room',
        checkIn: '2026-10-05',
        checkOut: '2026-10-07',
        nights: 2,
        amount: 9000,
        status: 'Confirmed'
      })
    });
    const newGuestData = await newGuestRes.json();
    console.log(`         HTTP Status: ${newGuestRes.status}`);
    console.log(`         Success: ${newGuestData.success}`);
    if ((newGuestRes.status === 200 || newGuestRes.status === 201) && newGuestData.success) {
      console.log('         >>> PASS: First booking for new guest confirmed and registered!\n');
      const bId = newGuestData.data?._id || newGuestData.data?.id;
      if (bId) createdBookingIds.push(bId);

      // Verify that Aadhaar was synced to user profile
      const userInDb = await User.findOne({ email: newGuestEmail });
      if (userInDb) {
        createdUserIds.push(userInDb._id);
        console.log(`         Profile sync verification: verifiedAadhaar = ${userInDb.verifiedAadhaar}, last4 = ${userInDb.verifiedAadhaarLast4}`);
        if (userInDb.verifiedAadhaarLast4 === '7788') {
          console.log('         >>> PASS: Aadhaar accurately synced to user profile!\n');
        } else {
          throw new Error('TEST 6 FAILED: User profile verifiedAadhaarLast4 does not match!');
        }
      }
    } else {
      throw new Error(`TEST 6 FAILED: Expected success for new guest, got ${newGuestRes.status}: ${newGuestData.message}`);
    }

    // -------------------------------------------------------------
    // TEST 7: That same guest later tries to book with WRONG Aadhaar
    // -------------------------------------------------------------
    console.log('[TEST 7] Same guest (Priya Sharma) attempts 2nd booking with a DIFFERENT Aadhaar...');
    const secondRes = await fetch(`${BASE_URL}/receptionist/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recToken}`
      },
      body: JSON.stringify({
        guest: 'Priya Sharma',
        email: newGuestEmail,
        phone: newGuestPhone,
        idProofType: 'Aadhaar Card',
        idProofNumber: '4455 6677 8899', // Different from 3344 5566 7788!
        room: '203',
        roomType: 'Deluxe Room',
        checkIn: '2026-10-12',
        checkOut: '2026-10-14',
        nights: 2,
        amount: 9000,
        status: 'Confirmed'
      })
    });
    const secondData = await secondRes.json();
    console.log(`         HTTP Status: ${secondRes.status}`);
    console.log(`         Response message: "${secondData.message}"`);
    if (secondRes.status === 400 && secondData.message && secondData.message.toLowerCase().includes('mismatch')) {
      console.log('         >>> PASS: Subsequent booking with different Aadhaar permanently blocked!\n');
    } else {
      throw new Error(`TEST 7 FAILED: Expected HTTP 400 with Aadhaar mismatch error, got ${secondRes.status}`);
    }

    console.log('================================================================');
    console.log('  ALL 7 TESTS PASSED SUCCESSFULLY!                             ');
    console.log('  AADHAAR CONSISTENCY IS PERMANENTLY ENFORCED ACROSS ALL ROLES ');
    console.log('================================================================');

  } finally {
    // Cleanup created test records
    console.log('\n[CLEANUP] Removing test bookings and users...');
    if (createdBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await mongoose.disconnect();
    console.log('[CLEANUP] Completed.');
  }
}

runTests().catch(err => {
  console.error('\n❌ Test execution encountered error:', err);
  process.exit(1);
});
