import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const c of collections) {
    const docs = await mongoose.connection.db.collection(c.name).find({}).toArray();
    console.log(`\n=== Collection: ${c.name} (${docs.length} docs) ===`);
    const abhiDocs = docs.filter(d => JSON.stringify(d).toLowerCase().includes('abhi') || JSON.stringify(d).includes('201') || JSON.stringify(d).includes('101'));
    if (abhiDocs.length > 0) {
      console.log(`Found relevant docs in ${c.name}:`);
      abhiDocs.forEach(d => {
        console.log({
          _id: d._id,
          id: d.id,
          bookingId: d.bookingId,
          guest: d.guest || d.name,
          room: d.room || d.roomNumber,
          checkIn: d.checkIn || d.checkInDate,
          checkOut: d.checkOut || d.checkOutDate,
          status: d.status,
          propertyId: d.propertyId
        });
      });
    }
  }

  await mongoose.disconnect();
}

inspect();
