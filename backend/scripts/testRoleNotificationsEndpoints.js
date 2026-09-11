import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import jwt from 'jsonwebtoken';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hourstay_hms';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

async function testEndpointForUser(userEmail) {
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: userEmail });
  if (!user) {
    console.log(`User ${userEmail} not found`);
    return;
  }

  const token = jwt.sign(
    { id: user.id || user._id, role: user.role, propertyId: user.propertyId },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const res = await fetch('http://localhost:5000/api/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const json = await res.json();
  console.log(`\n=== Notifications for ${user.role} (${user.email} | ${user.propertyId}) ===`);
  console.log(`Total returned: ${json.data ? json.data.length : 0}`);
  if (json.data) {
    const mounikaNotifs = json.data.filter(n => (n.message || '').includes('Mounika') || (n.title || '').includes('Mounika') || (n.message || '').includes('BK-10101'));
    console.log(`Mounika notifications found: ${mounikaNotifs.length}`);
    mounikaNotifs.forEach(m => console.log(`  -> [${m.category}] ${m.title}: ${m.message}`));
    console.log(`Top 3 notifications:`);
    json.data.slice(0, 3).forEach(n => console.log(`  -> [${n.category}] ${n.title}: ${n.message}`));
  }
}

async function run() {
  await mongoose.connect(MONGO_URI);
  
  await testEndpointForUser('admin@hourstay.com');
  await testEndpointForUser('manager@hourstay.com');
  await testEndpointForUser('meghana@hourstay.com');
  await testEndpointForUser('receptionist@hourstay.com');
  await testEndpointForUser('superadmin@hourstay.com');

  await mongoose.disconnect();
}

run().catch(console.error);
