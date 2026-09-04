import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function updatePasswords() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const hash123 = await bcrypt.hash('password123', 10);
  const hashMounika = await bcrypt.hash('Mounika@123', 10);

  // Update Surya
  const resSurya = await db.collection('users').updateOne(
    { email: 'surya@gmail.com' },
    { $set: { password: hash123, status: 'Active' } }
  );
  console.log('Surya updated:', resSurya.matchedCount, resSurya.modifiedCount);

  // Update Mounika
  const resMounika = await db.collection('users').updateOne(
    { email: 'mounika@gmail.com' },
    { $set: { password: hashMounika, status: 'Active' } }
  );
  console.log('Mounika updated:', resMounika.matchedCount, resMounika.modifiedCount);

  // Update Admin, Manager, Receptionist
  await db.collection('users').updateOne({ email: 'admin@hourstay.com' }, { $set: { password: hash123, status: 'Active' } });
  await db.collection('users').updateOne({ email: 'manager@hourstay.com' }, { $set: { password: hash123, status: 'Active' } });
  await db.collection('users').updateOne({ email: 'receptionist@hourstay.com' }, { $set: { password: hash123, status: 'Active' } });
  console.log('Admin/Manager/Receptionist passwords verified.');

  await mongoose.disconnect();
}

updatePasswords().catch(console.error);
