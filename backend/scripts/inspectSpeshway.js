import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectSpeshway() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  
  const p = await db.collection('properties').findOne({ _id: 'HS-9HQ8P' }) || await db.collection('properties').findOne({ name: /Speshway/i });
  if (!p) {
    console.log('Speshway property not found by exact ID, listing all:');
    const all = await db.collection('properties').find({}).toArray();
    all.forEach(x => console.log(x._id, x.name));
    return;
  }
  console.log('Property ID:', p.id || p._id);
  console.log('Property name:', p.name);
  console.log('Hotel Name in settings:', p.settings?.hotelName);
  console.log('City:', p.city, '| in settings:', p.settings?.city);
  console.log('Rooms count field in property:', p.rooms);
  console.log('\nRoom types configured in settings:');
  p.settings?.roomTypes?.forEach((rt, idx) => {
    console.log(`${idx + 1}. [${rt.category}] baseRate: ₹${rt.baseRate}, rooms: [${rt.rooms?.join(', ')}], roomsCount: ${rt.roomsCount}`);
  });

  const rooms = await db.collection('rooms').find({ propertyId: 'HS-9HQ8P' }).sort({ roomNumber: 1 }).toArray();
  console.log(`\nRooms Collection for HS-9HQ8P (${rooms.length} rooms):`);
  rooms.forEach(r => {
    console.log(`- Room ${r.roomNumber}: ${r.category} (Floor: ${r.floor}, Status: ${r.status}, Rate: ₹${r.baseRate})`);
  });
  
  await mongoose.disconnect();
}
inspectSpeshway();
