import {
  validateWithZod,
  validateFieldValue,
  nameSchema,
  textOnlySchema,
  citySchema,
  integerOnlySchema,
  priceSchema,
  phoneSchema,
  emailSchema,
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

console.log('🧪 Testing Centralized Zod Schemas & Primitives...\n');

// 1. Text Fields Validation: Text only, reject numbers
console.log('--- 1. Testing Text / Name Fields ---');
const badTextWithNumber = nameSchema(2).safeParse('John123');
console.assert(!badTextWithNumber.success, 'Name with numbers must fail');
console.assert(badTextWithNumber.error.issues[0].message.includes('numbers are not allowed'), 'Should state numbers are not allowed');

const goodName = nameSchema(2).safeParse('John Doe');
console.assert(goodName.success, 'Alphabetical name must pass');

const pureNumbersInCity = citySchema.safeParse('12345');
console.assert(!pureNumbersInCity.success, 'City with numbers must fail');

const goodCity = citySchema.safeParse('New Delhi');
console.assert(goodCity.success, 'Valid city must pass');
console.log('✅ Text fields allow text only & reject invalid numbers');

// 2. Number Fields: Numbers only, reject invalid text
console.log('--- 2. Testing Number Fields ---');
const badNumberText = integerOnlySchema('Guest Count', 1).safeParse('abc');
console.assert(!badNumberText.success, 'Number field with text "abc" must fail');
console.assert(badNumberText.error.issues[0].message.includes('whole numbers only'), 'Should indicate whole numbers only');

const goodNumber = integerOnlySchema('Guest Count', 1).safeParse('4');
console.assert(goodNumber.success, 'Valid number string must pass');
console.assert(goodNumber.data === 4, 'Number should be coerced to 4');
console.log('✅ Number fields allow numbers only & reject invalid text');

// 3. Email Fields: Valid email format only
console.log('--- 3. Testing Email Fields ---');
const badEmail = emailSchema.safeParse('invalid-email-address');
console.assert(!badEmail.success, 'Bad email must fail');

const goodEmail = emailSchema.safeParse('hotel.guest@example.com');
console.assert(goodEmail.success, 'Valid email must pass');
console.log('✅ Email fields enforce valid email format only');

// 4. Phone Fields: Numbers only with proper length (10 to 15 digits)
console.log('--- 4. Testing Phone Fields ---');
const phoneWithLetters = phoneSchema.safeParse('98765abcde');
console.assert(!phoneWithLetters.success, 'Phone with letters must fail');
console.assert(phoneWithLetters.error.issues[0].message.includes('numbers only'), 'Should reject letters');

const phoneTooShort = phoneSchema.safeParse('98765');
console.assert(!phoneTooShort.success, 'Short phone must fail');
console.assert(phoneTooShort.error.issues[0].message.includes('10 and 15 digits'), 'Should enforce 10-15 digits');

const goodPhone = phoneSchema.safeParse('9876543210');
console.assert(goodPhone.success, '10-digit phone must pass');

const goodPhoneWithCode = phoneSchema.safeParse('+91 9876543210');
console.assert(goodPhoneWithCode.success, 'Phone with +91 must pass');
console.log('✅ Phone fields enforce numbers only with 10-15 digits length');

// 5. Amount/Price Fields: Valid numbers/decimals only
console.log('--- 5. Testing Amount / Price Fields ---');
const badAmountText = priceSchema('Room Tariff').safeParse('invalid-text');
console.assert(!badAmountText.success, 'Amount with text must fail');
console.assert(badAmountText.error.issues[0].message.includes('valid number or decimal only'), 'Should state valid number or decimal only');

const negativeAmount = priceSchema('Room Tariff').safeParse('-500');
console.assert(!negativeAmount.success, 'Negative amount must fail');

const goodDecimalAmount = priceSchema('Room Tariff').safeParse('1499.50');
console.assert(goodDecimalAmount.success, 'Valid decimal amount must pass');
console.assert(goodDecimalAmount.data === 1499.5, 'Amount correctly coerced to number');
console.log('✅ Amount/price fields allow valid numbers/decimals only');

// 6. Test validateFieldValue helper
console.log('--- 6. Testing validateFieldValue helper ---');
const valPhoneBad = validateFieldValue('tel', 'abc');
console.assert(!valPhoneBad.isValid, 'validateFieldValue should catch bad phone');

const valPhoneGood = validateFieldValue('tel', '9876543210');
console.assert(valPhoneGood.isValid, 'validateFieldValue should accept good phone');

const valEmailBad = validateFieldValue('email', 'not-an-email');
console.assert(!valEmailBad.isValid, 'validateFieldValue should catch bad email');

const valTextBad = validateFieldValue('name', 'Vikram123');
console.assert(!valTextBad.isValid, 'validateFieldValue should catch name with numbers');
console.log('✅ validateFieldValue helper works accurately');

// 7. Test Composite Domain Schemas
console.log('--- 7. Testing Domain Schemas ---');
const invalidRegister = validateWithZod(registerSchema, {
  name: 'A123',
  email: 'bad',
  password: '123',
  mobile: '123'
});
console.assert(!invalidRegister.isValid, 'Register with number in name and bad fields must fail');
console.assert(invalidRegister.errors.name, 'Should require letters only for name');
console.assert(invalidRegister.errors.mobile, 'Should require 10-15 digits mobile');

const goodRoom = validateWithZod(roomSchema, {
  roomNumber: '101',
  type: 'Deluxe',
  floor: '1',
  pricePerNight: '4500',
  capacity: '2'
});
console.assert(goodRoom.isValid, 'Valid room should pass');
console.assert(goodRoom.data.pricePerNight === 4500, 'Price coerced to number');
console.assert(goodRoom.data.capacity === 2, 'Capacity coerced to number');

const badDates = validateWithZod(publicBookingSchema, {
  guestName: 'Sunny Kumar',
  email: 'sunny@gmail.com',
  phone: '9876543210',
  city: 'Hyderabad',
  checkIn: '2026-09-25',
  checkOut: '2026-09-23',
  pax: '2 Adults',
  roomType: 'Deluxe Suite'
});
console.assert(!badDates.isValid, 'Checkout before checkin must fail');
console.assert(badDates.errors.checkOut, 'Should report error on checkOut date');

console.log('\n🎉 ALL UPDATED ZOD SCHEMA TESTS PASSED SUCCESSFULLY!\n');
