import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';

dotenv.config();

export const runUpdate = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  const isSrv = process.env.MONGODB_URI.startsWith('mongodb+srv://');

  const tryConnect = async (usePublicDns = false) => {
    if (isSrv && usePublicDns) {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'hourstay_hms',
      serverSelectionTimeoutMS: 5000
    });
  };

  try {
    await tryConnect(false);
  } catch (error) {
    await tryConnect(true);
  }

  console.log('Connected to Database successfully!');

  // 1. Update super admin user name to Nandini Rao Rao
  const userUpdate = await User.updateMany(
    { role: 'super-admin' },
    { $set: { name: 'Nandini Rao Rao' } }
  );
  console.log('Updated super-admin users:', userUpdate);

  // 2. Update subscription requests decidedBy to Nandini Rao Rao
  const reqUpdate = await SubscriptionRequest.updateMany(
    { status: 'Approved' },
    { $set: { decidedBy: 'Nandini Rao Rao' } }
  );
  console.log('Updated approved requests decidedBy:', reqUpdate);

  await mongoose.disconnect();
  console.log('Disconnected.');
};

runUpdate().catch(console.error);
