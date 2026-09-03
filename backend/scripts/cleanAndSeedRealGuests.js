import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.log('DNS set warning:', e.message);
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hourstay_hms';

const REAL_GUEST_USERS = [
  { name: 'Surya', email: 'surya@gmail.com', password: 'password123', role: 'guest', mobile: '+91 47362 54654' },
  { name: 'Mounika', email: 'mounika@gmail.com', password: 'password123', role: 'guest', mobile: '+91 99443 88120' },
  { name: 'Aswini', email: 'aswini@gmail.com', password: 'password123', role: 'guest', mobile: '+91 98840 20203' },
  { name: 'Vamsi', email: 'vamsi@gmail.com', password: 'password123', role: 'guest', mobile: '+91 98765 10202' },
  { name: 'Sai', email: 'sai@gmail.com', password: 'password123', role: 'guest', mobile: '+91 98765 10404' }
];

const REAL_BOOKINGS = [
  {
    bookingId: 'BK-10301',
    guest: 'Surya',
    phone: '+91 47362 54654',
    email: 'surya@gmail.com',
    room: '103 · Standard Room',
    roomNumber: '103',
    roomType: 'Standard Room',
    checkIn: '2026-09-01',
    checkOut: '2026-09-02',
    nights: 1,
    pax: '2 Adults',
    source: 'Direct Web',
    status: 'Checked-out',
    amount: 8500,
    totalAmount: 8500,
    balance: 0,
    paymentStatus: 'Paid',
    propertyId: 'HS-JAI'
  },
  {
    bookingId: 'BK-10101',
    guest: 'Mounika',
    phone: '+91 99443 88120',
    email: 'mounika@gmail.com',
    room: '101 · Standard Room',
    roomNumber: '101',
    roomType: 'Standard Room',
    checkIn: '2026-09-02',
    checkOut: '2026-09-04',
    nights: 2,
    pax: '2 Adults',
    source: 'MakeMyTrip',
    status: 'Checked-in',
    amount: 11400,
    totalAmount: 11400,
    balance: 0,
    paymentStatus: 'Paid',
    propertyId: 'HS-JAI'
  },
  {
    bookingId: 'BK-20202',
    guest: 'Aswini',
    phone: '+91 98840 20203',
    email: 'aswini@gmail.com',
    room: '202 · Deluxe Room',
    roomNumber: '202',
    roomType: 'Deluxe Room',
    checkIn: '2026-09-02',
    checkOut: '2026-09-05',
    nights: 3,
    pax: '2 Adults',
    source: 'Direct Web',
    status: 'Checked-in',
    amount: 14500,
    totalAmount: 14500,
    balance: 0,
    paymentStatus: 'Paid',
    propertyId: 'HS-JAI'
  },
  {
    bookingId: 'BK-10202',
    guest: 'Vamsi',
    phone: '+91 98765 10202',
    email: 'vamsi@gmail.com',
    room: '102 · Standard Room',
    roomNumber: '102',
    roomType: 'Standard Room',
    checkIn: '2026-09-03',
    checkOut: '2026-09-05',
    nights: 2,
    pax: '2 Adults',
    source: 'Direct Web',
    status: 'Confirmed',
    amount: 7000,
    totalAmount: 7000,
    balance: 0,
    paymentStatus: 'Paid',
    propertyId: 'HS-JAI'
  },
  {
    bookingId: 'BK-30101',
    guest: 'Sai',
    phone: '+91 98765 10404',
    email: 'sai@gmail.com',
    room: '301 · Executive Suite',
    roomNumber: '301',
    roomType: 'Executive Suite',
    checkIn: '2026-09-03',
    checkOut: '2026-09-06',
    nights: 3,
    pax: '2 Adults',
    source: 'Booking.com',
    status: 'Confirmed',
    amount: 21000,
    totalAmount: 21000,
    balance: 0,
    paymentStatus: 'Paid',
    propertyId: 'HS-JAI'
  }
];

async function run() {
  console.log('Connecting to MongoDB at:', MONGO_URI.split('@')[1] || MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. Clean dummy bookings & old duplicates
  const keepBookingIds = REAL_BOOKINGS.map(b => b.bookingId);
  const deleteResult = await db.collection('bookings').deleteMany({
    bookingId: { $nin: keepBookingIds }
  });
  console.log(`🧹 Deleted ${deleteResult.deletedCount} dummy/test bookings from MongoDB.`);

  // 2. Ensure real guest users exist
  const usersCollection = db.collection('users');
  for (const u of REAL_GUEST_USERS) {
    const existing = await usersCollection.findOne({ email: u.email });
    const hashedPassword = await bcrypt.hash(u.password, 10);
    if (existing) {
      await usersCollection.updateOne(
        { email: u.email },
        { $set: { name: u.name, mobile: u.mobile, role: 'guest', password: hashedPassword } }
      );
      console.log(`👤 Updated guest user: ${u.name} (${u.email})`);
    } else {
      await usersCollection.insertOne({
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: 'guest',
        mobile: u.mobile,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`👤 Created guest user: ${u.name} (${u.email})`);
    }
  }

  // Fetch updated users to get their _ids
  const dbUsers = await usersCollection.find({ role: 'guest' }).toArray();
  const userMap = {};
  dbUsers.forEach(u => {
    userMap[u.email] = u._id;
  });

  // 3. Upsert real bookings
  const bookingsCollection = db.collection('bookings');
  for (const b of REAL_BOOKINGS) {
    const guestId = userMap[b.email] ? String(userMap[b.email]) : null;
    const bookingDoc = {
      ...b,
      guestId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await bookingsCollection.updateOne(
      { bookingId: b.bookingId },
      { $set: bookingDoc },
      { upsert: true }
    );
    console.log(`📅 Upserted booking: ${b.bookingId} for ${b.guest} (Room: ${b.room}, Status: ${b.status})`);
  }

  // 4. Also update local JSON fallback files if they exist
  const bookingsJsonPath = path.join(__dirname, '../data/bookings.json');
  fs.writeFileSync(bookingsJsonPath, JSON.stringify(REAL_BOOKINGS, null, 2));
  console.log('💾 Synced backend/data/bookings.json');

  const usersJsonPath = path.join(__dirname, '../data/users.json');
  if (fs.existsSync(usersJsonPath)) {
    try {
      const usersData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
      REAL_GUEST_USERS.forEach(ru => {
        const found = usersData.find(u => u.email === ru.email);
        if (!found) {
          usersData.push({
            id: Math.random().toString(36).substring(2, 11),
            name: ru.name,
            email: ru.email,
            password: ru.password,
            role: ru.role,
            mobile: ru.mobile
          });
        }
      });
      fs.writeFileSync(usersJsonPath, JSON.stringify(usersData, null, 2));
      console.log('💾 Synced backend/data/users.json');
    } catch (err) {
      console.log('users.json sync note:', err.message);
    }
  }

  console.log('🎉 Real guest data sync completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
