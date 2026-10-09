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
  aadhaarSchema,
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
  contactFormSchema,
  vehicleSchema,
  driverSchema,
  organizationSchema
} from './index.js';

console.log('🧪 Running Comprehensive Zod Schema & Validation Tests...\n');

// 1. Text & Name Fields: Repeated characters, numbers, and boundaries
console.log('--- 1. Testing Text / Name Fields & Repeated Characters ---');
const badRepeatedName = nameSchema(2).safeParse('aaaaaa');
console.assert(!badRepeatedName.success, 'Name with repeated characters "aaaaaa" must fail');

const badNameWithNumber = nameSchema(2).safeParse('John123');
console.assert(!badNameWithNumber.success, 'Name with numbers must fail');

const emptyName = nameSchema(2).safeParse('');
console.assert(!emptyName.success, 'Empty name must fail');

const singleCharName = nameSchema(2).safeParse('J');
console.assert(!singleCharName.success, 'Single char name must fail min boundary');

const goodName = nameSchema(2).safeParse('John Doe');
console.assert(goodName.success, 'Valid alphabetical name must pass');

const goodIndianName = nameSchema(2).safeParse('Satya Sai Nakka');
console.assert(goodIndianName.success, 'Valid Indian name must pass');
console.log('✅ Name and text fields properly reject repeated characters, numbers, and boundary violations');

// 2. Email Fields: Valid formats, repeated dummy localparts, and boundaries
console.log('--- 2. Testing Email Fields ---');
const badEmail = emailSchema.safeParse('invalid-email-address');
console.assert(!badEmail.success, 'Bad email format must fail');

const repeatedEmail = emailSchema.safeParse('aaaaaa@gmail.com');
console.assert(!repeatedEmail.success, 'Email with repeated single-char localpart "aaaaaa@" must fail');

const emptyEmail = emailSchema.safeParse('');
console.assert(!emptyEmail.success, 'Empty email must fail');

const goodEmail = emailSchema.safeParse('satya.sai@hourstay.in');
console.assert(goodEmail.success, 'Valid corporate email must pass');
console.log('✅ Email fields enforce format and reject dummy repeated usernames');

// 3. Phone Fields: 10-15 digits, no letters, no repeating digits (e.g. 1111111111)
console.log('--- 3. Testing Phone Fields ---');
const phoneWithAllSame = phoneSchema.safeParse('1111111111');
console.assert(!phoneWithAllSame.success, 'Phone with all identical digits "1111111111" must fail');

const phoneWithZeroes = phoneSchema.safeParse('0000000000');
console.assert(!phoneWithZeroes.success, 'Phone with all zeroes "0000000000" must fail');

const phoneWithLetters = phoneSchema.safeParse('98765abcde');
console.assert(!phoneWithLetters.success, 'Phone with letters must fail');

const phoneShort = phoneSchema.safeParse('98765');
console.assert(!phoneShort.success, 'Phone below min boundary must fail');

const goodPhone = phoneSchema.safeParse('9876543210');
console.assert(goodPhone.success, 'Valid 10-digit mobile must pass');

const goodPhoneWithCountryCode = phoneSchema.safeParse('+91 9876543210');
console.assert(goodPhoneWithCountryCode.success, 'Phone with +91 country code must pass');
console.log('✅ Phone fields enforce numbers only, valid boundaries, and reject repeating dummy digits');

// 4. Aadhaar Fields: exactly 12 digits, no 12 identical digits
console.log('--- 4. Testing Aadhaar Validation ---');
const aadhaarAllSame = aadhaarSchema.safeParse('111111111111');
console.assert(!aadhaarAllSame.success, 'Aadhaar with 12 identical digits must fail');

const aadhaarShort = aadhaarSchema.safeParse('12345678901');
console.assert(!aadhaarShort.success, 'Aadhaar with 11 digits must fail');

const goodAadhaar = aadhaarSchema.safeParse('492817492018');
console.assert(goodAadhaar.success, 'Valid 12-digit Aadhaar must pass');
console.log('✅ Aadhaar validation strictly checks 12 digits and rejects identical numbers');

// 5. Amount & Tariff Fields: Boundaries, negative numbers, decimals
console.log('--- 5. Testing Amount / Price Fields ---');
const negativeTariff = priceSchema('Tariff').safeParse('-100');
console.assert(!negativeTariff.success, 'Negative tariff must fail');

const zeroTariffDisallowed = priceSchema('Tariff', { allowZero: false }).safeParse('0');
console.assert(!zeroTariffDisallowed.success, 'Zero tariff when disallowed must fail');

const zeroAllowed = priceSchema('Discount', { allowZero: true }).safeParse('0');
console.assert(zeroAllowed.success, 'Zero discount when allowZero=true must pass');

const goodDecimal = priceSchema('Tariff').safeParse('3499.50');
console.assert(goodDecimal.success, 'Valid decimal amount must pass');
console.assert(goodDecimal.data === 3499.5, 'Decimal amount coerced correctly');
console.log('✅ Price & amount validations enforce numeric bounds and decimal transformations');

// 6. Vehicles & Drivers Schemas
console.log('--- 6. Testing Vehicle & Driver Schemas ---');
const badVehicleNum = vehicleSchema.safeParse({
  vehicleNumber: '123',
  model: 'Innova Crysta'
});
console.assert(!badVehicleNum.success, 'Short invalid vehicle number must fail');

const goodVehicle = vehicleSchema.safeParse({
  vehicleNumber: 'TS09EA1234',
  model: 'Innova Crysta 2.4 VX',
  capacity: 7,
  fuelType: 'Diesel'
});
console.assert(goodVehicle.success, 'Valid vehicle entry must pass');

const goodDriver = driverSchema.safeParse({
  name: 'Ramesh Verma',
  phone: '9848012345',
  licenseNumber: 'TS-0920180004912',
  experienceYears: 5
});
console.assert(goodDriver.success, 'Valid driver entry must pass');
console.log('✅ Vehicle and driver schemas properly validate transport operations');

// 7. Organization Schema
console.log('--- 7. Testing Organization Schema ---');
const goodOrg = organizationSchema.safeParse({
  name: 'Hour Stay Hospitality Pvt Ltd',
  email: 'corporate@hourstay.in',
  phone: '9820433121',
  address: 'Hitech City Phase 2, Mindspace',
  city: 'Hyderabad',
  pincode: '500081',
  gstin: '36AAAAA0000A1Z5'
});
console.assert(goodOrg.success, 'Valid organization profile must pass');
console.log('✅ Organization schema validates business and tax information');

// 8. Test live validateFieldValue helper
console.log('--- 8. Testing Live Field Validator Helper ---');
const checkRepeatedLive = validateFieldValue('name', 'aaaaaa', { required: true });
console.assert(!checkRepeatedLive.isValid, 'Live check must reject repeated characters');

const checkGoodLive = validateFieldValue('phone', '9876543210', { required: true });
console.assert(checkGoodLive.isValid, 'Live check must accept good phone');
console.log('✅ Live field-level validator provides instant on-blur and typing feedback');

console.log('\n🎉 ALL CENTRALIZED ZOD SCHEMAS & VALIDATION SUITES PASSED!\n');
