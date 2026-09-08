import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testDashboardOutput() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Booking = (await import('../models/booking.model.js')).default;
  const { Room } = await import('../models/managerData.model.js');
  const { isToday } = await import('../utils/dateUtils.js');

  const bookings = await Booking.find({}).sort({ createdAt: -1 });
  console.log('Current Date in JS:', new Date().toISOString(), 'Today is:', new Date().toLocaleDateString());

  const arrivals = bookings.filter(b => isToday(b.checkIn) && (b.status === 'Confirmed' || b.status === 'Paid' || b.status === 'Pending' || b.status === 'Pre-checked'));
  console.log('\nArrivals count today:', arrivals.length);
  arrivals.forEach(a => console.log('Arrival:', a.guest, a.room, a.checkIn, a.status));

  const departures = bookings.filter(b => isToday(b.checkOut) && (b.status === 'Checked-in' || b.status === 'Checked In' || b.status === 'Staying' || b.status === 'Checked-out' || b.status === 'Checked Out'));
  console.log('\nDepartures count today:', departures.length);
  departures.forEach(d => console.log('Departure:', d.guest, d.room, d.checkOut, d.status));

  const inStay = bookings.filter(b => b.status === 'Checked-in' || b.status === 'Checked In' || b.status === 'Staying');
  console.log('\nIn-Stay count:', inStay.length);
  inStay.forEach(s => console.log('In-Stay:', s.guest, s.room, s.checkIn, '->', s.checkOut, s.status));

  // Check rooms occupancy
  const rooms = await Room.find({});
  console.log('\nRooms in DB count:', rooms.length);
  rooms.forEach(r => console.log(`Room ${r.roomNumber}: status=${r.status}, category=${r.category}`));

  await mongoose.disconnect();
}
testDashboardOutput();
