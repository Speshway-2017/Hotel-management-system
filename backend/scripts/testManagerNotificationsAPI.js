import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hourstay_hms';

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const allBookings = await db.collection('bookings').find({}).sort({ createdAt: -1 }).toArray();
  console.log(`Found ${allBookings.length} bookings in DB`);

  for (const b of allBookings) {
    const bId = b.bookingId || String(b._id) || b.id;
    const guestName = b.guest || b.guestName || b.customerName || 'Guest';
    const roomInfo = b.room || b.roomType || 'Standard Room';
    const checkIn = b.checkIn || b.checkInDate || 'Today';
    const checkOut = b.checkOut || b.checkOutDate || 'Tomorrow';
    const amount = b.totalAmount || b.amount || 0;
    const targetProp = b.propertyId || 'HS-9HQ8P';

    const title = 'New Online Reservation';
    const message = `Guest ${guestName} booked ${roomInfo} (${checkIn} → ${checkOut}) for ₹${amount}. [Ref: #${bId}]`;

    const existsInManager = await db.collection('managernotifications').findOne({
      $or: [
        { message: { $regex: bId, $options: 'i' } },
        { title: { $regex: bId, $options: 'i' } }
      ]
    });

    if (!existsInManager) {
      await db.collection('managernotifications').insertOne({
        title,
        message,
        category: 'Reservations',
        isRead: false,
        propertyId: targetProp,
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date()
      });
      console.log(`+ Created ManagerNotification for ${guestName} (${bId})`);
    }

    const existsInNotif = await db.collection('notifications').findOne({
      role: 'manager',
      $or: [
        { message: { $regex: bId, $options: 'i' } },
        { title: { $regex: bId, $options: 'i' } }
      ]
    });

    if (!existsInNotif) {
      await db.collection('notifications').insertOne({
        role: 'manager',
        propertyId: targetProp,
        title,
        message,
        category: 'Reservations',
        isRead: false,
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date()
      });
      console.log(`+ Created Notification for ${guestName} (${bId})`);
    }
  }

  const finalNotifs = await db.collection('managernotifications').find({}).toArray();
  console.log(`\n👔 Total ManagerNotifications: ${finalNotifs.length}`);
  finalNotifs.forEach(n => {
    console.log(`- [${n.propertyId} | ${n.category}] ${n.title}: ${n.message}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
