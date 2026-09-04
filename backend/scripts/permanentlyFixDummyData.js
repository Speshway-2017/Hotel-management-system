import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.log('DNS resolver notice:', e.message);
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hourstay_hms';

const REAL_GUESTS = [
  {
    name: 'Sravan',
    email: 'sravan@gmail.com',
    role: 'guest',
    mobile: '+91 99887 76655',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    address: 'Madhapur, Hyderabad',
    status: 'Active',
    type: 'Regular'
  },
  {
    name: 'Mounika',
    email: 'mounika@gmail.com',
    role: 'guest',
    mobile: '+91 99443 88120',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    address: 'Gachibowli, Hyderabad',
    status: 'Active',
    type: 'VIP'
  },
  {
    name: 'Aswini',
    email: 'aswini@gmail.com',
    role: 'guest',
    mobile: '+91 98840 20203',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    address: 'Kondapur, Hyderabad',
    status: 'Active',
    type: 'VIP'
  },
  {
    name: 'Vamsi',
    email: 'vamsi@gmail.com',
    role: 'guest',
    mobile: '+91 98765 10202',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    address: 'Jubilee Hills, Hyderabad',
    status: 'Active',
    type: 'Regular'
  },
  {
    name: 'Sai',
    email: 'sai@gmail.com',
    role: 'guest',
    mobile: '+91 98765 10404',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    address: 'Banjara Hills, Hyderabad',
    status: 'Active',
    type: 'VIP'
  }
];

const REAL_BOOKINGS = [
  {
    bookingId: 'BK-10301',
    guest: 'Surya',
    email: 'surya@gmail.com',
    phone: '+91 47362 54654',
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
    email: 'mounika@gmail.com',
    phone: '+91 99443 88120',
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
    email: 'aswini@gmail.com',
    phone: '+91 98840 20203',
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
    email: 'vamsi@gmail.com',
    phone: '+91 98765 10202',
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
    email: 'sai@gmail.com',
    phone: '+91 98765 10404',
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

async function permanentlyFix() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  const db = mongoose.connection.db;

  // 1. Clean users.json
  const usersPath = path.join(__dirname, '../data/users.json');
  const rawUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const staffUsers = rawUsers.filter(u => u.role !== 'guest');

  // Upsert real guests into users list
  const realGuestEmails = new Set(REAL_GUESTS.map(g => g.email));
  const finalUsers = [...staffUsers];

  REAL_GUESTS.forEach(g => {
    const existing = rawUsers.find(u => u.email === g.email);
    finalUsers.push({
      id: existing?.id || existing?._id || `usr-gst-${g.name.toLowerCase()}`,
      _id: existing?.id || existing?._id || `usr-gst-${g.name.toLowerCase()}`,
      name: g.name,
      email: g.email,
      password: existing?.password || '$2a$10$G6wXLQtzsp0VNUAwKypZMuJxxw7dR1ME05dyz18gTYX887VFG.5wK',
      role: 'guest',
      mobile: g.mobile,
      propertyId: null,
      status: 'Active',
      dept: 'Front Desk',
      shift: 'Morning (06:00 - 14:00)',
      avatar: null,
      city: g.city,
      state: g.state,
      country: g.country,
      address: g.address,
      type: g.type,
      preferences: 'High floor preference',
      idDocType: 'Aadhaar Card',
      idDocNumber: 'XXXX-XXXX-1234',
      notes: 'Verified real guest account.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  fs.writeFileSync(usersPath, JSON.stringify(finalUsers, null, 2));
  console.log(`💾 Cleaned and saved backend/data/users.json (${finalUsers.length} total users, exactly 5 real guests)`);

  // 2. Clean bookings.json
  const bookingsPath = path.join(__dirname, '../data/bookings.json');
  fs.writeFileSync(bookingsPath, JSON.stringify(REAL_BOOKINGS, null, 2));
  console.log(`💾 Cleaned and saved backend/data/bookings.json (exactly 5 real bookings)`);

  // 3. Purge MongoDB users collection: remove all guests not in the 5 real guests
  const deletedUsers = await db.collection('users').deleteMany({
    role: 'guest',
    email: { $nin: Array.from(realGuestEmails) }
  });
  console.log(`🧹 Deleted ${deletedUsers.deletedCount} dummy/test guest users from MongoDB.`);

  // Also ensure all staff users and real guests exist in MongoDB
  for (const u of finalUsers) {
    const { _id, ...updateFields } = u;
    await db.collection('users').updateOne(
      { email: u.email },
      { $set: updateFields },
      { upsert: true }
    );
  }
  console.log(`✅ Upserted all verified staff and 5 real guest users into MongoDB Atlas.`);

  // 4. Purge MongoDB bookings collection: remove any bookings not in REAL_BOOKINGS
  const keepBookingIds = REAL_BOOKINGS.map(b => b.bookingId);
  const deletedBookings = await db.collection('bookings').deleteMany({
    bookingId: { $nin: keepBookingIds }
  });
  console.log(`🧹 Deleted ${deletedBookings.deletedCount} dummy/test bookings from MongoDB.`);

  for (const b of REAL_BOOKINGS) {
    const { _id, ...bookingFields } = b;
    await db.collection('bookings').updateOne(
      { bookingId: b.bookingId },
      { $set: bookingFields },
      { upsert: true }
    );
  }
  console.log(`✅ Upserted 5 real bookings into MongoDB Atlas.`);

  // 5. Clean auxiliary collections (approvals, feedback, notifications)
  try {
    await db.collection('approvals').deleteMany({
      $or: [
        { requestedBy: /aarav|neha/i },
        { reason: /malfunctioning in Room 302/i }
      ]
    });
    console.log(`🧹 Cleaned dummy approval requests.`);
  } catch (e) {}

  try {
    await db.collection('feedbacks').deleteMany({
      guestName: { $nin: ['Surya', 'Mounika', 'Aswini', 'Vamsi', 'Sai'] }
    });
    console.log(`🧹 Cleaned dummy feedback.`);
  } catch (e) {}

  try {
    await db.collection('receptionistnotifications').deleteMany({
      message: /Meera Iyer|HS24-10245/i
    });
    console.log(`🧹 Cleaned dummy receptionist notifications.`);
  } catch (e) {}

  try {
    await db.collection('managernotifications').deleteMany({
      message: /Kabir Dev|Neha Patel/i
    });
    console.log(`🧹 Cleaned dummy manager notifications.`);
  } catch (e) {}

  // 6. Output final verification
  const currentGuests = await db.collection('users').find({ role: 'guest' }).toArray();
  console.log(`\n🎉 Verification: MongoDB Atlas now contains ${currentGuests.length} guest users:`);
  currentGuests.forEach(g => console.log(`- ${g.name} (${g.email}, ${g.mobile})`));

  const currentBookings = await db.collection('bookings').find({}).toArray();
  console.log(`\n🎉 Verification: MongoDB Atlas now contains ${currentBookings.length} bookings:`);
  currentBookings.forEach(b => console.log(`- [${b.bookingId}] ${b.guest} (${b.room}) - Status: ${b.status}`));

  await mongoose.disconnect();
}

permanentlyFix().catch(console.error);
