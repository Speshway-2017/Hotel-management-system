import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const paymentSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  guestName: { type: String, required: true },
  roomNumber: { type: String, default: '101' },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'UPI' },
  status: { type: String, default: 'Settled' },
  propertyId: { type: String, required: true }
}, { timestamps: true });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

async function seedPayments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Remove any existing payments
    await Payment.deleteMany({});
    console.log('Cleared existing payments collection');

    const realPayments = [
      {
        bookingId: 'BK-10301',
        guestName: 'Surya',
        roomNumber: '103',
        amount: 8500,
        paymentMethod: 'UPI',
        status: 'Settled',
        propertyId: 'HS-JAI'
      },
      {
        bookingId: 'BK-10101',
        guestName: 'Mounika',
        roomNumber: '101',
        amount: 11400,
        paymentMethod: 'Card',
        status: 'Settled',
        propertyId: 'HS-JAI'
      },
      {
        bookingId: 'BK-20202',
        guestName: 'Aswini',
        roomNumber: '202',
        amount: 14500,
        paymentMethod: 'UPI',
        status: 'Settled',
        propertyId: 'HS-JAI'
      },
      {
        bookingId: 'BK-10202',
        guestName: 'Vamsi',
        roomNumber: '102',
        amount: 7000,
        paymentMethod: 'UPI',
        status: 'Settled',
        propertyId: 'HS-JAI'
      },
      {
        bookingId: 'BK-30101',
        guestName: 'Sai',
        roomNumber: '301',
        amount: 21000,
        paymentMethod: 'Net Banking',
        status: 'Settled',
        propertyId: 'HS-JAI'
      },
      {
        bookingId: 'BK-10301',
        guestName: 'Surya',
        roomNumber: '103',
        amount: 8500,
        paymentMethod: 'UPI',
        status: 'Settled',
        propertyId: 'HS-9HQ8P'
      },
      {
        bookingId: 'BK-10101',
        guestName: 'Mounika',
        roomNumber: '101',
        amount: 11400,
        paymentMethod: 'Card',
        status: 'Settled',
        propertyId: 'HS-9HQ8P'
      },
      {
        bookingId: 'BK-20202',
        guestName: 'Aswini',
        roomNumber: '202',
        amount: 14500,
        paymentMethod: 'UPI',
        status: 'Settled',
        propertyId: 'HS-9HQ8P'
      },
      {
        bookingId: 'BK-10202',
        guestName: 'Vamsi',
        roomNumber: '102',
        amount: 7000,
        paymentMethod: 'UPI',
        status: 'Settled',
        propertyId: 'HS-9HQ8P'
      },
      {
        bookingId: 'BK-30101',
        guestName: 'Sai',
        roomNumber: '301',
        amount: 21000,
        paymentMethod: 'Net Banking',
        status: 'Settled',
        propertyId: 'HS-9HQ8P'
      }
    ];

    const result = await Payment.insertMany(realPayments);
    console.log(`Successfully seeded ${result.length} real payment transactions into MongoDB Atlas!`);
    result.forEach(p => {
      console.log(`- [${p.bookingId}] ${p.guestName} in Room ${p.roomNumber} -> ₹${p.amount} (${p.paymentMethod} - ${p.status})`);
    });

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error seeding payments:', err);
    process.exit(1);
  }
}

seedPayments();
