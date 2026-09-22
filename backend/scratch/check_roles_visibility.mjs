import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  const managerUser = users.find(u => u.email === 'meghana@hourstay.com');
  const adminUser = users.find(u => u.email === 'dileep@hourstay.com');
  const adminUserJai = users.find(u => u.email === 'admin@hourstay.com');
  const receptionistUser = users.find(u => u.email === 'poojitha@hourstay.com');
  const sunnyUser = users.find(u => u.email === 'sunny@gmail.com');
  const mouniUser = users.find(u => u.email === 'mounika@gmail.com');

  console.log('Manager prop:', managerUser?.propertyId);
  console.log('Admin prop:', adminUser?.propertyId, '| admin@:', adminUserJai?.propertyId);
  console.log('Receptionist prop:', receptionistUser?.propertyId);
  console.log('Sunny prop:', sunnyUser?.propertyId);
  console.log('Mounika prop:', mouniUser?.propertyId);

  for (const propId of ['HS-9HQ8P', 'HS-JAI']) {
    const propFilter = { $or: [{ propertyId: propId }, { hotelId: propId }] };
    const rBookings = await db.collection('bookings').find(propFilter).toArray();
    console.log(`\n=== For propertyId: ${propId} ===`);
    console.log(`Total Bookings: ${rBookings.length}`);
    const arrivals = rBookings.filter(b => b.checkIn?.startsWith('2026-09-22') && !['Cancelled', 'Checked-out', 'Checked Out'].includes(b.status));
    const departures = rBookings.filter(b => b.checkOut?.startsWith('2026-09-22') && b.status !== 'Cancelled');
    const inHouse = rBookings.filter(b => ['Checked-in', 'Checked In', 'Staying', 'Occupied'].includes(b.status));
    
    console.log(`Arrivals: ${arrivals.length}`);
    arrivals.forEach(b => console.log(`  Arrival: ${b.bookingId || b._id} | ${b.guest} | Rm: ${b.roomNumber || b.room} | Status: ${b.status}`));
    console.log(`Departures: ${departures.length}`);
    departures.forEach(b => console.log(`  Departure: ${b.bookingId || b._id} | ${b.guest} | Rm: ${b.roomNumber || b.room} | Status: ${b.status}`));
    console.log(`In-House: ${inHouse.length}`);
    inHouse.forEach(b => console.log(`  In-House: ${b.bookingId || b._id} | ${b.guest} | Rm: ${b.roomNumber || b.room} | Status: ${b.status}`));
  }

  process.exit(0);
}

run();
