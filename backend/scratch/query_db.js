import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/property.model.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;
console.log('Connecting to:', mongoUri);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const properties = await Property.find({});
    console.log('Total properties in DB:', properties.length);
    console.log('Properties:', JSON.stringify(properties, null, 2));
    
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
