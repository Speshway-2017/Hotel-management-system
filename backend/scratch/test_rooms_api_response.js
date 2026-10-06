import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/db.config.js';
import { Room } from '../models/managerData.model.js';
import Booking from '../models/booking.model.js';
import { parseDateToDayUtc, isBookingStatusActive, isBookingMatchingRoom, isStayDateOverlapping } from '../utils/roomHelper.js';

async function test() {
  await connectDB();
  const targetPropId = 'HS-9HQ8P';
  const checkIn = '2026-10-07';
  const checkOut = '2026-10-08';

  let dbRooms = await Room.find({ propertyId: targetPropId }).sort({ roomNumber: 1 });
  if (!dbRooms || dbRooms.length === 0) {
    dbRooms = await Room.find().sort({ roomNumber: 1 });
  }

  const allBookings = await Booking.find({
    $or: [{ propertyId: targetPropId }, { hotelId: targetPropId }]
  });
  const activeBookings = allBookings.filter(b => isBookingStatusActive(b.status));

  const reqInDay = parseDateToDayUtc(checkIn);
  const reqOutDay = parseDateToDayUtc(checkOut);

  const mapped = dbRooms.map((rm) => {
    const roomBookings = activeBookings.filter(b => isBookingMatchingRoom(b, rm));
    let matchedBooking = null;
    let isOccupied = false;
    let isReserved = false;

    if (reqInDay !== null && reqOutDay !== null) {
      for (const b of roomBookings) {
        if (isStayDateOverlapping(reqInDay, reqOutDay, b.checkIn, b.checkOut)) {
          matchedBooking = b;
          const bStatus = String(b.status || '').toLowerCase();
          if (bStatus.includes('checked-in') || bStatus.includes('stay') || bStatus.includes('occup') || bStatus.includes('in-house')) {
            isOccupied = true;
          } else {
            isReserved = true;
          }
          break;
        }
      }
    }

    let displayStatus = rm.status || "Available";
    if (rm.status !== 'Blocked' && rm.status !== 'Maintenance') {
      if (isOccupied || rm.status === 'Occupied') {
        displayStatus = 'Occupied';
      } else if (isReserved || rm.status === 'Reserved') {
        displayStatus = 'Reserved';
      } else if (rm.status === 'Available' || rm.status === 'Vacant Clean' || !rm.status) {
        displayStatus = 'Available';
      }
    }

    const isAvailable = displayStatus === "Available";

    return {
      roomNumber: rm.roomNumber,
      category: rm.category,
      displayStatus: displayStatus,
      isReserved: displayStatus === 'Reserved',
      isAvailable: isAvailable,
      matchedGuest: matchedBooking ? matchedBooking.guest : null
    };
  });

  console.log('--- Room Availability Results for 2026-10-07 to 2026-10-08 ---');
  for (const r of mapped) {
    console.log(`Room ${r.roomNumber} (${r.category}): status=${r.displayStatus}, isAvailable=${r.isAvailable}, isReserved=${r.isReserved}, guest=${r.matchedGuest}`);
  }

  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
