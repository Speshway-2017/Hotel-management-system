import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
import mongoose from 'mongoose';
import { connectDB } from '../config/db.config.js';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import {
  normalizeAadhaar,
  isValidAadhaar,
  maskAadhaar,
  formatAadhaar,
  findExistingVerifiedAadhaar,
  validateAadhaarConsistency,
  syncVerifiedAadhaarToGuestProfile
} from '../utils/aadhaarValidator.js';

async function runTests() {
  console.log('--- Starting Aadhaar Consistency Verification Tests ---');
  await connectDB();

  const testEmail = `test.aadhaar.${Date.now()}@example.com`;
  const testPhone = '9' + String(Date.now()).slice(-9);
  const testGuestName = 'Aadhaar Test Guest';
  const validAadhaar1 = '2345 6789 0123';
  const validAadhaar2 = '9876 5432 1098';
  const invalidAadhaarFormat = '1234567890'; // 10 digits

  let createdUser = null;
  let booking1 = null;
  let booking2 = null;

  try {
    // ------------------------------------------------------------------------
    // Step 1: Unit level format & masking checks
    // ------------------------------------------------------------------------
    console.log('\n[Test 1] Aadhaar Format & Masking');
    if (normalizeAadhaar('2345 6789 0123') !== '234567890123') {
      throw new Error('normalizeAadhaar failed');
    }
    if (!isValidAadhaar('234567890123')) {
      throw new Error('isValidAadhaar failed on valid Aadhaar');
    }
    if (isValidAadhaar('012345678901')) {
      throw new Error('isValidAadhaar should reject Aadhaar starting with 0');
    }
    if (isValidAadhaar('123456789012')) {
      throw new Error('isValidAadhaar should reject Aadhaar starting with 1');
    }
    if (isValidAadhaar(invalidAadhaarFormat)) {
      throw new Error('isValidAadhaar should reject 10 digit number');
    }
    const masked = maskAadhaar('234567890123');
    if (masked !== '•••• •••• 0123') {
      throw new Error(`maskAadhaar returned unexpected string: ${masked}`);
    }
    console.log('✓ Test 1 Passed: Format validation and secure masking (•••• •••• 0123) working correctly.');

    // ------------------------------------------------------------------------
    // Step 2: Create a fresh guest user & initial booking
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] First-Time Guest ID Verification');
    createdUser = await User.create({
      name: testGuestName,
      email: testEmail,
      mobile: testPhone,
      password: 'TestPassword123!',
      role: 'guest'
    });

    booking1 = await Booking.create({
      bookingId: `BK-TEST-${Date.now()}-1`,
      guest: testGuestName,
      email: testEmail,
      phone: testPhone,
      guestId: createdUser._id,
      room: '101',
      roomNumber: '101',
      roomType: 'Standard Room',
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000),
      status: 'Confirmed',
      source: 'Website',
      idVerification: 'Pending'
    });

    // Check no Aadhaar exists yet
    const preCheck = await findExistingVerifiedAadhaar({ booking: booking1, email: testEmail, phone: testPhone });
    if (preCheck?.existingAadhaar) {
      throw new Error(`Expected no existing verified Aadhaar for new guest, but found: ${preCheck.existingAadhaar}`);
    }

    // Validate consistency for first-time verification
    const validation1 = await validateAadhaarConsistency({
      booking: booking1,
      idDocType: 'Aadhaar Card',
      newAadhaar: validAadhaar1
    });

    if (!validation1.isValid || !validation1.isFirstTime) {
      throw new Error(`Validation failed for new guest: ${validation1.message}`);
    }

    // Sync verified Aadhaar to booking and user profile
    await syncVerifiedAadhaarToGuestProfile({
      booking: booking1,
      cleanAadhaar: validation1.cleanAadhaar,
      verifiedBy: 'Test Receptionist',
      verifiedAt: new Date()
    });

    // Verify DB state
    const reloadedUser = await User.findById(createdUser._id);
    if (normalizeAadhaar(reloadedUser.idDocNumber) !== '234567890123') {
      throw new Error(`User record idDocNumber was not updated: ${reloadedUser.idDocNumber}`);
    }
    const reloadedBooking1 = await Booking.findById(booking1._id);
    if (reloadedBooking1.idVerification !== 'Verified' || normalizeAadhaar(reloadedBooking1.idDocNumber) !== '234567890123') {
      throw new Error('Booking 1 was not marked Verified with Aadhaar.');
    }
    console.log('✓ Test 2 Passed: First-time guest verified successfully and Aadhaar persisted to profile & booking without duplicate identity.');

    // ------------------------------------------------------------------------
    // Step 3: Repeat booking by the same guest with the SAME Aadhaar
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] Repeat Booking with Identical Aadhaar');
    booking2 = await Booking.create({
      bookingId: `BK-TEST-${Date.now()}-2`,
      guest: testGuestName,
      email: testEmail,
      phone: testPhone,
      guestId: createdUser._id,
      room: '102',
      roomNumber: '102',
      roomType: 'Deluxe Room',
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000),
      status: 'Confirmed',
      source: 'Website',
      idVerification: 'Pending'
    });

    // Existing Aadhaar should be discovered
    const existingOnRecord = await findExistingVerifiedAadhaar({
      booking: booking2,
      guestId: createdUser._id,
      email: testEmail,
      phone: testPhone
    });

    const existingLast4 = existingOnRecord?.existingAadhaar ? existingOnRecord.existingAadhaar.slice(-4) : '';
    if (!existingOnRecord?.existingAadhaar || existingLast4 !== '0123') {
      throw new Error(`Failed to lookup verified Aadhaar on record. Result: ${JSON.stringify(existingOnRecord)}`);
    }

    const validationRepeatMatch = await validateAadhaarConsistency({
      booking: booking2,
      idDocType: 'Aadhaar Card',
      newAadhaar: validAadhaar1
    });

    if (!validationRepeatMatch.isValid || validationRepeatMatch.isMismatch) {
      throw new Error(`Repeat booking with identical Aadhaar should be valid, got: ${validationRepeatMatch.message}`);
    }
    console.log('✓ Test 3 Passed: Repeat booking with identical Aadhaar accepted and verified.');

    // ------------------------------------------------------------------------
    // Step 4: Repeat booking with a DIFFERENT Aadhaar (Aadhaar Mismatch!)
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Repeat Booking with DIFFERENT Aadhaar (Mismatch Protection)');
    const validationMismatch = await validateAadhaarConsistency({
      booking: booking2,
      idDocType: 'Aadhaar Card',
      newAadhaar: validAadhaar2 // Different Aadhaar!
    });

    if (validationMismatch.isValid || !validationMismatch.isMismatch) {
      throw new Error('Expected validation to fail with isMismatch: true, but it succeeded!');
    }
    console.log(`✓ Mismatch caught as expected: "${validationMismatch.message}"`);
    console.log('✓ Test 4 Passed: Different Aadhaar for same guest strictly blocked with clear mismatch message.');

    // ------------------------------------------------------------------------
    // Step 5: Check-in blocked on Mismatch
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Check-In Block on Aadhaar Mismatch');
    // Simulate booking marked as Mismatch
    booking2.idVerification = 'Mismatch';
    booking2.idDocType = 'Aadhaar Card';
    booking2.idDocNumber = '987654321098';
    await booking2.save();

    // Verify consistency check before check-in blocks it
    const checkinConsistency = await validateAadhaarConsistency({
      booking: booking2,
      idDocType: 'Aadhaar Card',
      newAadhaar: booking2.idDocNumber
    });

    if (checkinConsistency.isValid) {
      throw new Error('Check-in should have been blocked because Aadhaar is mismatched!');
    }
    console.log('✓ Test 5 Passed: Check-in is blocked when booking has a mismatched Aadhaar.');

    // ------------------------------------------------------------------------
    // Step 6: Verify no duplicate guest identities were created
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] Guest Identity Uniqueness Check');
    const guestUsers = await User.find({ email: testEmail });
    if (guestUsers.length !== 1) {
      throw new Error(`Expected exactly 1 User record for email ${testEmail}, found ${guestUsers.length}`);
    }
    console.log('✓ Test 6 Passed: No duplicate guest identities created; unified guest profile maintained.');

    console.log('\n======================================================');
    console.log('ALL 6 AADHAAR CONSISTENCY TESTS PASSED SUCCESSFULLY! ✓');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup test records
    console.log('\nCleaning up test records...');
    if (createdUser) await User.findByIdAndDelete(createdUser._id);
    if (booking1) await Booking.findByIdAndDelete(booking1._id);
    if (booking2) await Booking.findByIdAndDelete(booking2._id);
    await mongoose.connection.close();
    console.log('Clean up completed and DB disconnected.');
  }
}

runTests();
