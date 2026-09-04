import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixAllUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  const hash123 = await bcrypt.hash('password123', 10);
  const hashMounika = await bcrypt.hash('Mounika@123', 10);

  for (const u of users) {
    let targetHash = hash123;
    if (u.email === 'mounika@gmail.com') {
      targetHash = hashMounika;
    }
    await db.collection('users').updateOne(
      { _id: u._id },
      { $set: { password: targetHash, status: 'Active' } }
    );
  }

  // Also sync users.json so MockUser / fallback has exact matching hashed passwords
  const usersFile = path.join(__dirname, '../data/users.json');
  const updatedDbUsers = await db.collection('users').find({}).toArray();
  const formattedUsers = updatedDbUsers.map(u => ({
    ...u,
    id: u._id.toString(),
    _id: u._id.toString()
  }));
  fs.writeFileSync(usersFile, JSON.stringify(formattedUsers, null, 2));

  console.log('✅ Successfully updated all user passwords in MongoDB & users.json');
  await mongoose.disconnect();
}

fixAllUsers().catch(console.error);
