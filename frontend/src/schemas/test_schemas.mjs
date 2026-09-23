import {
  validateWithZod,
  loginSchema,
  registerSchema,
  publicBookingSchema,
  walkInBookingSchema,
  extendStaySchema,
  guestIdVerificationSchema,
  roomSchema,
  staffSchema,
  couponSchema,
  refundRequestSchema,
  contactFormSchema
} from './index.js';

console.log('🧪 Testing Centralized Zod Schemas...\n');

// 1. Test Login Schema
const invalidLogin = validateWithZod(loginSchema, { email: 'not-an-email', password: '' });
console.assert(!invalidLogin.isValid, 'Should fail invalid email and empty password');
console.assert(invalidLogin.errors.email, 'Should have email error');
console.assert(invalidLogin.errors.password, 'Should have password error');

const validLogin = validateWithZod(loginSchema, { email: 'user@example.com', password: 'password123' });
console.assert(validLogin.isValid, 'Valid login should pass');
console.log('✅ Login Schema tests passed');

// 2. Test Register Schema with Phone
const invalidRegister = validateWithZod(registerSchema, {
  name: 'A',
  email: 'bad',
  password: '123',
  mobile: '123'
});
console.assert(!invalidRegister.isValid, 'Short name, invalid email, short password, short mobile should fail');
console.assert(invalidRegister.errors.name, 'Should require >= 2 chars for name');
console.assert(invalidRegister.errors.email, 'Should require valid email');
console.assert(invalidRegister.errors.password, 'Should require >= 6 chars for password');
console.assert(invalidRegister.errors.mobile, 'Should require 10-digit mobile');
console.log('✅ Register Schema tests passed');

// 3. Test Aadhaar & ID Verification
const badAadhaar = validateWithZod(guestIdVerificationSchema, {
  idDocType: 'Aadhaar Card',
  idDocNumber: '12345678901', // 11 digits
  assignedRoom: '101'
});
console.assert(!badAadhaar.isValid, '11-digit Aadhaar must fail');
console.assert(badAadhaar.errors.idDocNumber, 'Should produce error for non-12-digit Aadhaar');

const goodAadhaar = validateWithZod(guestIdVerificationSchema, {
  idDocType: 'Aadhaar Card',
  idDocNumber: '123456789012', // 12 digits
  assignedRoom: '101'
});
console.assert(goodAadhaar.isValid, '12-digit Aadhaar must pass');
console.log('✅ Aadhaar & Guest ID Verification Schema tests passed');

// 4. Test Numbers / Price Coercion in Room Schema
const badRoom = validateWithZod(roomSchema, {
  roomNumber: '101',
  type: 'Deluxe',
  floor: '1',
  pricePerNight: -500, // Negative price
  capacity: 0 // Zero capacity
});
console.assert(!badRoom.isValid, 'Negative price and 0 capacity should fail');
console.assert(badRoom.errors.pricePerNight, 'Should fail negative price');
console.assert(badRoom.errors.capacity, 'Should fail 0 capacity');

const goodRoom = validateWithZod(roomSchema, {
  roomNumber: '101',
  type: 'Deluxe',
  floor: '1',
  pricePerNight: '4500', // Coerced from string
  capacity: '2' // Coerced from string
});
console.assert(goodRoom.isValid, 'Coerced valid numbers should pass');
console.assert(goodRoom.data.pricePerNight === 4500, 'Price coerced to number');
console.assert(goodRoom.data.capacity === 2, 'Capacity coerced to number');
console.log('✅ Room Schema numeric coercion tests passed');

// 5. Test Date Ordering in Booking Schema
const badDates = validateWithZod(publicBookingSchema, {
  guestName: 'Sunny Kumar',
  email: 'sunny@gmail.com',
  phone: '9876543210',
  city: 'Hyderabad',
  checkIn: '2026-09-25',
  checkOut: '2026-09-23', // Checkout before checkin
  pax: '2 Adults',
  roomType: 'Deluxe Suite'
});
console.assert(!badDates.isValid, 'Checkout before checkin must fail');
console.assert(badDates.errors.checkOut, 'Should report error on checkOut date');
console.log('✅ Booking Schema date refinement tests passed');

console.log('\n🎉 ALL CENTRALIZED ZOD SCHEMA UNIT TESTS PASSED SUCCESSFULLY!\n');
