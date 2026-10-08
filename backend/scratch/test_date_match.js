import { parseDateToDayUtc, isStayDateOverlapping, isBookingMatchingRoom } from '../utils/roomHelper.js';
import { parseDateSafe } from '../utils/dateUtils.js';

const now = new Date();
console.log("Now ISO:", now.toISOString());
console.log("Now local:", now.toString());
console.log("parseDateToDayUtc(new Date()):", parseDateToDayUtc(new Date()));
console.log("parseDateToDayUtc('2026-10-07'):", parseDateToDayUtc('2026-10-07'));
console.log("parseDateToDayUtc('2026-10-07T00:00:00.000Z'):", parseDateToDayUtc('2026-10-07T00:00:00.000Z'));
console.log("parseDateToDayUtc('2026-10-07T12:00:00.000'):", parseDateToDayUtc('2026-10-07T12:00:00.000'));
console.log("parseDateToDayUtc('07-10-2026'):", parseDateToDayUtc('07-10-2026'));

const todayUtc = parseDateToDayUtc(new Date());
const bIn = parseDateToDayUtc("2026-10-07");
const bOut = parseDateToDayUtc("2026-10-08");

console.log("todayUtc >= bIn && todayUtc < bOut:", todayUtc >= bIn && todayUtc < bOut);
console.log("isStayDateOverlapping('2026-10-07', '2026-10-08', '2026-10-07', '2026-10-08'):", isStayDateOverlapping('2026-10-07', '2026-10-08', '2026-10-07', '2026-10-08'));

// Test room matching
const testRoom = { _id: '6a8d2e258522fdc5c544707e', roomNumber: '101', category: 'Standard Room' };
const testBooking1 = { roomId: '6a8d2e258522fdc5c544707e', room: '101 · Standard Room', roomNumber: '101', checkIn: '2026-10-07', checkOut: '2026-10-08' };
const testBooking2 = { roomId: null, room: '101 AC', roomNumber: '101 AC', checkIn: '2026-10-07', checkOut: '2026-10-08' };
const testBooking3 = { roomId: null, room: '101 AC Room', roomNumber: '101', checkIn: '2026-10-07', checkOut: '2026-10-08' };
const testBooking4 = { roomId: null, room: 'Standard Room (Room 101)', roomType: '101 AC', checkIn: '2026-10-07', checkOut: '2026-10-08' };
const testBooking5 = { roomId: null, room: '101', checkIn: '2026-10-07', checkOut: '2026-10-08' };

console.log("Match 1:", isBookingMatchingRoom(testBooking1, testRoom));
console.log("Match 2:", isBookingMatchingRoom(testBooking2, testRoom));
console.log("Match 3:", isBookingMatchingRoom(testBooking3, testRoom));
console.log("Match 4:", isBookingMatchingRoom(testBooking4, testRoom));
console.log("Match 5:", isBookingMatchingRoom(testBooking5, testRoom));
