import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function syncAllPasswords() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  const hash123 = await bcrypt.hash('password123', 10);

  const res = await db.collection('users').updateMany(
    {},
    { $set: { password: hash123, status: 'Active' } }
  );
  console.log(`Updated ${res.modifiedCount} users with password123 in Atlas DB.`);

  // Also update data/users.json
  const jsonPath = path.join(__dirname, '../data/users.json');
  if (fs.existsSync(jsonPath)) {
    const users = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    users.forEach(u => {
      u.password = hash123;
      u.status = 'Active';
    });
    fs.writeFileSync(jsonPath, JSON.stringify(users, null, 2));
    console.log('Updated data/users.json');
  }

  process.exit(0);
}

syncAllPasswords();
