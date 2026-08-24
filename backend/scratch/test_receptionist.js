import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';
import User from '../models/user.model.js';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI not found");
    
    // Set Google DNS if SRV fails
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      dbName: 'hourstay_hms',
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB Atlas!');
    
    console.log('Fetching all receptionists in database...');
    const list = await User.find({ role: 'receptionist' });
    console.log('RECEPTIONISTS IN DB:', JSON.stringify(list, null, 2));
  } catch (err) {
    console.error('FAILED TO QUERY DATABASE:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
