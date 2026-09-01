import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  const Room = mongoose.model('Room', new mongoose.Schema({}, { strict: false }));

  const rooms = await Room.find({});
  const activeBookings = await Booking.find({ status: { $in: ['Confirmed', 'Paid', 'Pending', 'Checked-in'] } });

  console.log('Active Bookings:', activeBookings.map(b => ({ id: b._id, guest: b.guest, room: b.room, roomType: b.roomType, status: b.status })));

  const roomBookingMap = new Map();
  const unassignedCategoryBookings = [];

  for (const b of activeBookings) {
    if (b.status === 'Cancelled' || b.status === 'Checked-out' || b.status === 'No-show') continue;

    const bRoomNum = b.roomId || (b.room ? String(b.room).match(/\b\d{3,4}\b/)?.[0] : null);
    let matchedRm = null;

    if (b.roomId) {
      matchedRm = rooms.find(r => String(r._id) === String(b.roomId) || String(r.id) === String(b.roomId));
    }
    if (!matchedRm && bRoomNum) {
      matchedRm = rooms.find(r => String(r.roomNumber).trim() === String(bRoomNum).trim());
    }
    if (!matchedRm && b.room && !b.room.includes("Standard Room") && !b.room.includes("Deluxe Room") && !b.room.includes("Executive Suite") && !b.room.includes("Villa Suite")) {
      matchedRm = rooms.find(r => String(b.room).includes(String(r.roomNumber)));
    }

    if (matchedRm) {
      roomBookingMap.set(String(matchedRm._id), b);
    } else {
      unassignedCategoryBookings.push(b);
    }
  }

  for (const b of unassignedCategoryBookings) {
    const targetCategory = b.roomType || b.category || b.room;
    if (!targetCategory) continue;

    const candidate = rooms.find(r => {
      if (roomBookingMap.has(String(r._id))) return false;
      if (r.status === 'Blocked') return false;

      const rCat = String(r.category || '').toLowerCase();
      const bCat = String(targetCategory).toLowerCase();
      return rCat === bCat || bCat.includes(rCat) || rCat.includes(bCat);
    });

    if (candidate) {
      roomBookingMap.set(String(candidate._id), b);
    }
  }

  rooms.forEach(rm => {
    const b = roomBookingMap.get(String(rm._id));
    let status = rm.status;
    if (rm.status !== 'Blocked' && b) {
      status = b.status === 'Checked-in' ? 'Occupied' : 'Reserved';
    }
    console.log(`Room ${rm.roomNumber} (${rm.category}) => Status: ${status} ${b ? `[Guest: ${b.guest}]` : ''}`);
  });

  process.exit(0);
}

run().catch(console.error);
