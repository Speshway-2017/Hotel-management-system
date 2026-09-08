import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function listAllBookings() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.db.collection('bookings').find({}).toArray();
  console.log('Total bookings in DB:', docs.length);
  docs.forEach(d => {
    console.log({
      _id: d._id,
      id: d.id,
      bookingId: d.bookingId,
      guest: d.guest || d.name,
      room: d.room,
      roomNumber: d.roomNumber,
      roomType: d.roomType,
      checkIn: d.checkIn,
      checkOut: d.checkOut,
      status: d.status,
      propertyId: d.propertyId
    });
  });

  // Also check static bookings or seed bookings in backend routes or files!
  await mongoose.disconnect();
}
listAllBookings();
