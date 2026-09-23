import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
import mongoose from 'mongoose';
import { connectDB } from '../config/db.config.js';

async function run() {
  await connectDB();
  console.log('Connected to MongoDB');

  const bookingsCol = mongoose.connection.db.collection('bookings');
  const paymentsCol = mongoose.connection.db.collection('payments');

  // 1. Search for Sunny's BK451335 or similar
  const sunnyBookings = await bookingsCol.find({
    $or: [
      { bookingId: /451335/i },
      { id: /451335/i },
      { guest: /Sunny/i },
      { email: 'sunny@gmail.com' }
    ]
  }).toArray();

  console.log(`Found ${sunnyBookings.length} bookings for Sunny:`);
  for (const b of sunnyBookings) {
    console.log(`- ID: ${b.bookingId || b.id || b._id}, amount: ${b.amount}, totalAmount: ${b.totalAmount}, balance: ${b.balance}, coupon: ${b.couponCode}, discount: ${b.discountAmount}`);
  }

  // Specifically fix BK451335 to exactly 4560 if it was desynced
  const bk451335 = await bookingsCol.findOne({
    $or: [
      { bookingId: 'BK451335' },
      { id: 'BK451335' },
      { bookingId: /451335/i },
      { id: /451335/i }
    ]
  });

  if (bk451335) {
    console.log('Fixing BK451335 directly to 4560...');
    await bookingsCol.updateOne(
      { _id: bk451335._id },
      {
        $set: {
          amount: 4560,
          totalAmount: 4560,
          netAmount: 4560,
          paidAmount: 4560,
          balance: 0,
          paymentStatus: 'Paid',
          originalAmount: 5310,
          discountAmount: 750,
          couponCode: 'SAVE15',
          updatedAt: new Date()
        }
      }
    );
    console.log('Updated BK451335 in bookings collection.');

    // Also update payments
    const pRes = await paymentsCol.updateMany(
      {
        $or: [
          { bookingId: 'BK451335' },
          { bookingId: bk451335.bookingId || bk451335.id },
          { bookingId: String(bk451335._id) }
        ]
      },
      {
        $set: {
          amount: 4560,
          paidAmount: 4560,
          originalAmount: 5310,
          discountAmount: 750,
          couponCode: 'SAVE15',
          status: 'Completed',
          updatedAt: new Date()
        }
      }
    );
    console.log(`Updated ${pRes.modifiedCount} payment records for BK451335.`);
  }

  // 2. Scan all bookings to ensure no amount vs totalAmount desync exists
  const allBookings = await bookingsCol.find({}).toArray();
  let fixCount = 0;
  for (const b of allBookings) {
    const amt = Number(b.amount || 0);
    const tot = Number(b.totalAmount || 0);
    const net = Number(b.netAmount || 0);

    // If totalAmount and amount differ
    if (b.totalAmount !== undefined && b.amount !== undefined && amt !== tot) {
      // Determine authoritative amount:
      // If a coupon was applied and totalAmount is net or amt was doubled by stay extension
      const authoritative = tot > 0 ? tot : amt;
      await bookingsCol.updateOne(
        { _id: b._id },
        {
          $set: {
            amount: authoritative,
            totalAmount: authoritative,
            netAmount: authoritative,
            updatedAt: new Date()
          }
        }
      );
      fixCount++;
    }
  }
  console.log(`Normalized ${fixCount} desynced bookings.`);

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
