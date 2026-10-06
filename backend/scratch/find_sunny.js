import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({
    $or: [{ name: /sunny/i }, { email: /sunny/i }]
  }).toArray();
  console.log('Users found for Sunny:');
  users.forEach(u => console.log({ id: u._id, name: u.name, email: u.email, phone: u.phone, mobile: u.mobile, role: u.role }));

  const allBookings = await db.collection('bookings').find({
    $or: [
      { guest: /sunny/i },
      { guestName: /sunny/i },
      { email: /sunny/i },
      { guestEmail: /sunny/i }
    ]
  }).toArray();
  console.log('Bookings found for Sunny:', allBookings.length);
  allBookings.forEach(b => console.log(JSON.stringify(b, null, 2)));
  process.exit(0);
}
run();
