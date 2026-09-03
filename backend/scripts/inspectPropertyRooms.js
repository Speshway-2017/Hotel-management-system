import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  
  console.log('--- PROPERTIES ---');
  const properties = await db.collection('properties').find({}).toArray();
  properties.forEach(p => {
    console.log(p._id, '-> name:', p.name, '| roomsCount:', p.rooms, '| city:', p.city, '| settings.roomTypes:', p.settings?.roomTypes?.length);
  });
  
  console.log('\n--- ROOMS ---');
  const rooms = await db.collection('rooms').find({}).toArray();
  console.log('Total rooms count in db:', rooms.length);
  rooms.forEach(r => {
    console.log('Room:', r.roomNumber, '| Category:', r.category, '| Status:', r.status, '| propertyId:', r.propertyId, '| floor:', r.floor);
  });
  
  await mongoose.disconnect();
}
check();
