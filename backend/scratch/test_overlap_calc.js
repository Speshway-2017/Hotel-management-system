import { parseDateSafe } from '../utils/dateUtils.js';
import { parseDateToDayUtc, isStayDateOverlapping, isBookingMatchingRoom } from '../utils/roomHelper.js';

console.log('Testing parseDateSafe:');
console.log('2026-10-07 ->', parseDateSafe('2026-10-07'));
console.log('07-10-2026 ->', parseDateSafe('07-10-2026'));
console.log('1791331200000 ->', parseDateSafe(1791331200000));
console.log('"1791331200000" ->', parseDateSafe('1791331200000'));

const reqIn = '2026-10-07';
const reqOut = '2026-10-08';
const bIn = '2026-10-07';
const bOut = '2026-10-08';

console.log('\nTesting parseDateToDayUtc:');
console.log('reqIn Day UTC:', parseDateToDayUtc(reqIn));
console.log('reqOut Day UTC:', parseDateToDayUtc(reqOut));
console.log('bIn Day UTC:', parseDateToDayUtc(bIn));
console.log('bOut Day UTC:', parseDateToDayUtc(bOut));

const reqInDay = parseDateToDayUtc(reqIn);
const reqOutDay = parseDateToDayUtc(reqOut);

console.log('\nDirect Overlap:', isStayDateOverlapping(reqIn, reqOut, bIn, bOut));
console.log('With UTC timestamps:', isStayDateOverlapping(reqInDay, reqOutDay, bIn, bOut));
