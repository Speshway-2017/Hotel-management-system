import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';

dotenv.config();

async function check() {
  const mongoUri = process.env.MONGODB_URI;
  console.log("Connecting to:", mongoUri);
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB!");

  const superAdmin = await User.findOne({ role: 'super-admin' });
  console.log("Super Admin User in DB:", superAdmin);

  const approvedReqs = await SubscriptionRequest.find({ status: 'Approved' });
  console.log("Approved Requests in DB:", approvedReqs);

  await mongoose.disconnect();
}

check().catch(console.error);
