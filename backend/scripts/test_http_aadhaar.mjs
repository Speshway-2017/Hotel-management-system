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

async function testHttpEndpoints() {
  console.log('--- Testing Aadhaar Consistency HTTP Endpoints ---');
  await connectDB();

  const BASE_URL = 'http://localhost:5000/api';
  let staffUser = null;
  let guestUser = null;
  let bookingA = null;
  let bookingB = null;

  try {
    // 1. Find or create a receptionist staff user
    staffUser = await User.findOne({ role: 'receptionist', status: 'Active' });
    if (!staffUser) {
      staffUser = await User.create({
        name: 'Test Receptionist',
        email: `receptionist.${Date.now()}@hotel.com`,
        password: 'Password123!',
        role: 'receptionist',
        status: 'Active'
      });
    }

    const token = jwt.sign(
      { id: staffUser._id, role: staffUser.role, email: staffUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const guestEmail = `guest.http.${Date.now()}@example.com`;
    const guestPhone = '9' + String(Date.now()).slice(-9);

    guestUser = await User.create({
      name: 'HTTP Test Guest',
      email: guestEmail,
      mobile: guestPhone,
      password: 'Password123!',
      role: 'guest',
      status: 'Active'
    });

    bookingA = await Booking.create({
      bookingId: `BK-HTTP-${Date.now()}-A`,
      guest: 'HTTP Test Guest',
      email: guestEmail,
      phone: guestPhone,
      guestId: guestUser._id,
      room: '201',
      roomNumber: '201',
      roomType: 'Deluxe Room',
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000),
      status: 'Confirmed',
      source: 'Website',
      idVerification: 'Pending'
    });

    bookingB = await Booking.create({
      bookingId: `BK-HTTP-${Date.now()}-B`,
      guest: 'HTTP Test Guest',
      email: guestEmail,
      phone: guestPhone,
      guestId: guestUser._id,
      room: '202',
      roomNumber: '202',
      roomType: 'Deluxe Room',
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000),
      status: 'Confirmed',
      source: 'Website',
      idVerification: 'Pending'
    });

    // ------------------------------------------------------------------------
    // Step 1: Check guest-aadhaar-status before any verification
    // ------------------------------------------------------------------------
    console.log('\n[HTTP Test 1] GET /guest-aadhaar-status (Pre-verification)');
    const resPreStatus = await fetch(`${BASE_URL}/receptionist/reservations/${bookingA._id}/guest-aadhaar-status`, {
      headers: authHeaders
    });
    const preStatusData = await resPreStatus.json();
    console.log('Response:', preStatusData);
    if (!preStatusData.success || preStatusData.data.hasExistingAadhaar !== false) {
      throw new Error(`Expected hasExistingAadhaar: false, got: ${JSON.stringify(preStatusData)}`);
    }
    console.log('✓ HTTP Test 1 Passed: Returns hasExistingAadhaar: false for new guest.');

    // ------------------------------------------------------------------------
    // Step 2: Verify ID with valid Aadhaar on Booking A
    // ------------------------------------------------------------------------
    console.log('\n[HTTP Test 2] POST /verify-id (First verification)');
    const resVerifyA = await fetch(`${BASE_URL}/receptionist/reservations/${bookingA._id}/verify-id`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idDocType: 'Aadhaar Card',
        idDocNumber: '4567 8901 2345',
        notes: 'Initial check-in verification'
      })
    });
    const verifyAData = await resVerifyA.json();
    console.log('Response:', verifyAData);
    if (!verifyAData.success || verifyAData.data.idVerification !== 'Verified') {
      throw new Error(`Expected successful verification, got: ${JSON.stringify(verifyAData)}`);
    }
    console.log('✓ HTTP Test 2 Passed: First booking verified and registered Aadhaar successfully.');

    // ------------------------------------------------------------------------
    // Step 3: Check guest-aadhaar-status on Booking B (should return masked Aadhaar)
    // ------------------------------------------------------------------------
    console.log('\n[HTTP Test 3] GET /guest-aadhaar-status (On repeat booking)');
    const resStatusB = await fetch(`${BASE_URL}/receptionist/reservations/${bookingB._id}/guest-aadhaar-status`, {
      headers: authHeaders
    });
    const statusBData = await resStatusB.json();
    console.log('Response:', statusBData);
    if (!statusBData.success || !statusBData.data.hasExistingAadhaar || statusBData.data.maskedAadhaar !== '•••• •••• 2345') {
      throw new Error(`Expected masked Aadhaar ending in 2345, got: ${JSON.stringify(statusBData)}`);
    }
    console.log('✓ HTTP Test 3 Passed: Discovered registered Aadhaar with secure masking (•••• •••• 2345).');

    // ------------------------------------------------------------------------
    // Step 4: Verify Booking B with DIFFERENT Aadhaar (Aadhaar Mismatch!)
    // ------------------------------------------------------------------------
    console.log('\n[HTTP Test 4] POST /verify-id with Mismatched Aadhaar (Expected: HTTP 400)');
    const resMismatch = await fetch(`${BASE_URL}/receptionist/reservations/${bookingB._id}/verify-id`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idDocType: 'Aadhaar Card',
        idDocNumber: '9999 8888 7777', // DIFFERENT!
        notes: 'Trying different Aadhaar'
      })
    });
    const mismatchData = await resMismatch.json();
    console.log(`Status: ${resMismatch.status}, Body:`, mismatchData);
    if (resMismatch.status !== 400 || mismatchData.success !== false) {
      throw new Error(`Expected HTTP 400 rejection, got status: ${resMismatch.status}`);
    }
    if (!mismatchData.message.includes('Mismatch')) {
      throw new Error(`Expected Mismatch error message, got: ${mismatchData.message}`);
    }
    console.log('✓ HTTP Test 4 Passed: Server responded with HTTP 400 and clear mismatch message.');

    // ------------------------------------------------------------------------
    // Step 5: Check-in blocked when Aadhaar is mismatched
    // ------------------------------------------------------------------------
    console.log('\n[HTTP Test 5] PUT /status (Check-In) with Mismatched Aadhaar (Expected: HTTP 400)');
    const resCheckIn = await fetch(`${BASE_URL}/receptionist/reservations/${bookingB._id}/status`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'Checked-in',
        room: '202',
        idDocType: 'Aadhaar Card',
        idDocNumber: '9999 8888 7777' // Mismatched number
      })
    });
    const checkInData = await resCheckIn.json();
    console.log(`Status: ${resCheckIn.status}, Body:`, checkInData);
    if (resCheckIn.status !== 400 || checkInData.success !== false) {
      throw new Error(`Expected Check-In to be blocked with HTTP 400, got status: ${resCheckIn.status}`);
    }
    console.log('✓ HTTP Test 5 Passed: Check-in strictly blocked with HTTP 400 on Aadhaar mismatch.');

    // ------------------------------------------------------------------------
    // Step 6: Verify Booking B with MATCHING Aadhaar succeeds
    // ------------------------------------------------------------------------
    console.log('\n[HTTP Test 6] POST /verify-id with MATCHING Aadhaar');
    const resMatching = await fetch(`${BASE_URL}/receptionist/reservations/${bookingB._id}/verify-id`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        idDocType: 'Aadhaar Card',
        idDocNumber: '4567 8901 2345', // SAME number as Booking A!
        notes: 'Correct matching Aadhaar'
      })
    });
    const matchingData = await resMatching.json();
    console.log('Response:', matchingData);
    if (!matchingData.success || matchingData.data.idVerification !== 'Verified') {
      throw new Error(`Expected successful matching verification, got: ${JSON.stringify(matchingData)}`);
    }
    console.log('✓ HTTP Test 6 Passed: Repeat booking with matching Aadhaar verified successfully.');

    console.log('\n======================================================');
    console.log('ALL HTTP AADHAAR ENDPOINT TESTS PASSED SUCCESSFULLY! ✓');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ HTTP Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (guestUser) await User.findByIdAndDelete(guestUser._id);
    if (bookingA) await Booking.findByIdAndDelete(bookingA._id);
    if (bookingB) await Booking.findByIdAndDelete(bookingB._id);
    await mongoose.connection.close();
  }
}

testHttpEndpoints();
