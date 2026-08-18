import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const propertySchema = new mongoose.Schema({
  _id: String,
  name: String,
  city: String,
  status: String
}, { collection: 'properties' });

const MongooseProperty = mongoose.model('PropertyTemp', propertySchema);

async function run() {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'hourstay_hms'
    });
    console.log('Connected successfully.');

    const list = await MongooseProperty.find({});
    console.log(`Found ${list.length} properties in database:`);
    list.forEach(p => {
      console.log(`- ID: ${p._id}, Name: "${p.name}", Status: "${p.status}", City: "${p.city}"`);
    });

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
