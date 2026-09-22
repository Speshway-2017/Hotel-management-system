import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

async function checkPasswords() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ email: { $in: ['meghana@hourstay.com', 'sunny@gmail.com', 'mounika@gmail.com', 'receptionist@hourstay.com'] } }).toArray();

  for (const u of users) {
    const is123 = await bcrypt.compare('password123', u.password || '');
    console.log(`User: ${u.email} (${u.role}) | Has pass: ${!!u.password} | matches 'password123': ${is123}`);
  }
  process.exit(0);
}

checkPasswords();
