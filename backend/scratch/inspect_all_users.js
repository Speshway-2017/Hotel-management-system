import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel-management');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log('All MongoDB users:', users.map(u => ({ _id: u._id, id: u.id, name: u.name, email: u.email, mobile: u.mobile, phone: u.phone, city: u.city, address: u.address, role: u.role })));
  const bookings = await db.collection('bookings').find({}).toArray();
  console.log('Total bookings in Mongo:', bookings.length);
  process.exit(0);
}
run().catch(console.error);
