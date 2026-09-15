import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import { Payment } from '../models/managerData.model.js';
import Property from '../models/property.model.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const users = await User.find({ role: 'guest' });
  console.log('Guest users found:', users.map(u => ({ name: u.name, email: u.email, id: u._id })));

  for (const guestUser of users) {
    const userId = guestUser._id;
    const query = [{ guestId: userId }];
    if (guestUser?.email) query.push({ email: guestUser.email });
    if (guestUser?.mobile) query.push({ phone: guestUser.mobile });
    if (guestUser?.name) query.push({ guest: guestUser.name });

    const guestBookings = await Booking.find({ $or: query }).sort({ createdAt: -1 });
    console.log(`Guest ${guestUser.name} bookings count:`, guestBookings.length);
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
