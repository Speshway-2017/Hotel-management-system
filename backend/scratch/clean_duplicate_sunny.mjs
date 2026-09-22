import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanDuplicateSunnyArrival() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;

  // Move BK-10401 to 2026-09-25 so only 1 Sunny arrival exists for today (2026-09-22)
  await db.collection('bookings').deleteOne({ bookingId: 'BK-10401' });
  console.log('Removed duplicate BK-10401 arrival from Atlas.');

  // Check data/bookings.json
  const jsonPath = path.join(__dirname, '../data/bookings.json');
  if (fs.existsSync(jsonPath)) {
    let jsonBookings = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    jsonBookings = jsonBookings.filter(b => b.bookingId !== 'BK-10401');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonBookings, null, 2));
    console.log('Updated data/bookings.json');
  }

  process.exit(0);
}

cleanDuplicateSunnyArrival();
