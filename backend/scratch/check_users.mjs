import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

async function checkUsers() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log(`Total users in DB: ${users.length}`);
  users.forEach(u => {
    console.log(`- ${u.name} | ${u.email} | Role: ${u.role} | Status: ${u.status}`);
  });
  process.exit(0);
}

checkUsers();
