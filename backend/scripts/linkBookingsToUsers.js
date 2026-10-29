import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectDB } from '../config/db.config.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';

const linkAll = async () => {
  await connectDB();
  console.log('🔗 Accurately linking each booking to its specific guest user account...');

  const users = await User.find({ role: 'guest' });
  console.log(`Found ${users.length} guest users.`);

  let totalUpdated = 0;
  for (const user of users) {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userPhone = (user.mobile || user.phone || '').trim();
    const cleanPhone = userPhone.replace(/[^0-9]/g, '');

    const emailFilter = [];
    if (userEmail) {
      emailFilter.push(
        { email: userEmail },
        { guestEmail: userEmail },
        { email: new RegExp(`^${userEmail}$`, 'i') },
        { guestEmail: new RegExp(`^${userEmail}$`, 'i') }
      );
    }
    if (userPhone) {
      emailFilter.push({ phone: userPhone }, { guestPhone: userPhone });
    }
    if (cleanPhone.length >= 10) {
      emailFilter.push({ phone: { $regex: cleanPhone.slice(-10) } }, { guestPhone: { $regex: cleanPhone.slice(-10) } });
    }

    if (emailFilter.length > 0) {
      const res = await Booking.updateMany(
        { $or: emailFilter },
        {
          $set: {
            userId: String(user._id || user.id),
            guestId: String(user._id || user.id)
          }
        }
      );
      console.log(`  Linked ${res.modifiedCount} bookings for ${user.name} (${user.email}) -> userId/guestId: ${user._id}`);
      totalUpdated += res.modifiedCount;
    }
  }

  console.log(`✅ Finished linking! Total bookings updated: ${totalUpdated}`);
  process.exit(0);
};

linkAll().catch(err => {
  console.error('Error linking bookings:', err);
  process.exit(1);
});
