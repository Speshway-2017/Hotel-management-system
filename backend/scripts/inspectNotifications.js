import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hourstay_hms';

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const notifs = await db.collection('notifications').find({}).toArray();
  console.log(`\n🔔 Total Notifications in MongoDB: ${notifs.length}`);
  notifs.forEach(n => {
    console.log(`- [${n.role || 'all'} | ${n.propertyId || 'all'} | ${n.category}] ${n.title}: ${n.message}`);
  });

  const mgrNotifs = await db.collection('managernotifications').find({}).toArray();
  console.log(`\n👔 Total ManagerNotifications in MongoDB: ${mgrNotifs.length}`);
  mgrNotifs.forEach(n => {
    console.log(`- [${n.propertyId || 'all'} | ${n.category}] ${n.title}: ${n.message}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
