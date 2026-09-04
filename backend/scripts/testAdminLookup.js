import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import User from '../models/user.model.js';

async function testAdminQuery() {
  await mongoose.connect(process.env.MONGODB_URI);
  const id = '6a7d98a915abe6fb220216d0';
  
  // 1. Raw collection findOne
  const raw = await mongoose.connection.db.collection('users').findOne({ $or: [{ _id: id }, { id: id }] });
  console.log('1. Raw findOne:', !!raw, raw?.email);

  // 2. Mongoose model findOne with lean
  const modelFind = await mongoose.model('User').findOne({ $or: [{ _id: id }, { id: id }] });
  console.log('2. Model findOne:', !!modelFind, modelFind?.email);

  // 3. User.findById
  const userWrapper = await User.findById(id);
  console.log('3. User.findById wrapper:', !!userWrapper, userWrapper?.email);

  await mongoose.disconnect();
}
testAdminQuery().catch(console.error);
