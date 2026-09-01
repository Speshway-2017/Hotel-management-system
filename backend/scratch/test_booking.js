import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
    console.log('Connected to MongoDB Atlas');
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));

    await Booking.deleteMany({ $or: [{ room: /103/ }, { roomNumber: '103' }, { guest: 'Surya' }, { guest: 'Mounika' }] });

    const realBookings = [
      {
        bookingId: "BK-10301",
        guest: "Surya",
        phone: "+91 98765 10301",
        email: "surya@gmail.com",
        room: "103 · Deluxe Room",
        roomNumber: "103",
        roomType: "Deluxe Room",
        checkIn: "2026-09-01",
        checkOut: "2026-09-02",
        nights: 1,
        pax: "2 Adults",
        source: "Direct Web",
        status: "Checked-in",
        amount: 8500,
        totalAmount: 8500,
        balance: 0,
        paymentStatus: "Paid",
        propertyId: "HS-JAI"
      },
      {
        bookingId: "BK-20402",
        guest: "Mounika",
        phone: "+91 99443 88120",
        email: "mounika@gmail.com",
        room: "204 · Executive Suite",
        roomNumber: "204",
        roomType: "Executive Suite",
        checkIn: "2026-09-02",
        checkOut: "2026-09-03",
        nights: 1,
        pax: "2 Adults",
        source: "MakeMyTrip",
        status: "Confirmed",
        amount: 11400,
        totalAmount: 11400,
        balance: 0,
        paymentStatus: "Paid",
        propertyId: "HS-JAI"
      }
    ];

    await Booking.insertMany(realBookings);
    console.log('✅ Real MongoDB Bookings seeded successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

run();
