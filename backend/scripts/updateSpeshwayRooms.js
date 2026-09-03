import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['Available', 'Occupied', 'Blocked'], default: 'Available' },
  ratePlan: { type: String, default: 'Standard Plan' },
  baseRate: { type: Number, default: 3500 },
  currentRate: { type: Number, default: 3500 },
  dailyRate: { type: Number, default: 3500 },
  floor: { type: String, default: 'Floor 1' },
  capacity: { type: String, default: '2 Adults' },
  bedType: { type: String, default: 'King Bed' },
  amenities: { type: mongoose.Schema.Types.Mixed },
  description: { type: String, default: '' },
  images: [{ type: String }],
  propertyId: { type: String, required: true }
}, { timestamps: true });

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);

async function updateSpeshwayRooms() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { dbName: 'hourstay_hms' });
  const db = mongoose.connection.db;

  console.log('1. Updating Property document for Speshway in properties collection...');
  const propUpdateRes = await db.collection('properties').updateMany(
    { $or: [{ _id: 'HS-9HQ8P' }, { id: 'HS-9HQ8P' }, { name: /Speshway/i }] },
    {
      $set: {
        name: 'Speshway Luxury Hotel',
        rooms: 14,
        'settings.name': 'Speshway Luxury Hotel',
        'settings.hotelName': 'Speshway Luxury Hotel',
        'settings.city': 'Madhapur, Hyderabad',
        city: 'Madhapur, Hyderabad'
      }
    }
  );
  console.log(`Updated property records: ${propUpdateRes.modifiedCount}`);

  console.log('\n2. Ensuring all 14 rooms exist for HS-9HQ8P...');
  
  const all14Rooms = [
    {
      roomNumber: '101',
      category: 'Standard Room',
      floor: 'Floor 1',
      baseRate: 3000,
      currentRate: 3000,
      dailyRate: 3000,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160110/hourstay_hms_assets/gcvimdwyma48fdua8fxg.jpg']
    },
    {
      roomNumber: '102',
      category: 'Standard Room',
      floor: 'Floor 1',
      baseRate: 3000,
      currentRate: 3000,
      dailyRate: 3000,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160143/hourstay_hms_assets/vjoyzbrpc80wpzgxnvvz.jpg']
    },
    {
      roomNumber: '103',
      category: 'Standard Room',
      floor: 'Floor 1',
      baseRate: 3000,
      currentRate: 3000,
      dailyRate: 3000,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160157/hourstay_hms_assets/jd5xytphasmujocqz8ln.jpg']
    },
    {
      roomNumber: '201',
      category: 'Deluxe Room',
      floor: 'Floor 2',
      baseRate: 4500,
      currentRate: 4500,
      dailyRate: 4500,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160189/hourstay_hms_assets/win4vnjsb2f6gs8yxz6t.jpg']
    },
    {
      roomNumber: '202',
      category: 'Deluxe Room',
      floor: 'Floor 2',
      baseRate: 4500,
      currentRate: 4500,
      dailyRate: 4500,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160210/hourstay_hms_assets/qeum1fhoj8lfakjvcwgz.jpg']
    },
    {
      roomNumber: '203',
      category: 'Deluxe Room',
      floor: 'Floor 2',
      baseRate: 4500,
      currentRate: 4500,
      dailyRate: 4500,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160229/hourstay_hms_assets/ulb9k5bgugp94ivdcyp1.jpg']
    },
    {
      roomNumber: '301',
      category: 'Executive Suite',
      floor: 'Floor 3',
      baseRate: 6500,
      currentRate: 6500,
      dailyRate: 6500,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160250/hourstay_hms_assets/b04x9vyzbi2n0c80pqru.jpg']
    },
    {
      roomNumber: '302',
      category: 'Executive Suite',
      floor: 'Floor 3',
      baseRate: 6500,
      currentRate: 6500,
      dailyRate: 6500,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160274/hourstay_hms_assets/v4tp6yq3cdnekzoe6kkt.jpg']
    },
    {
      roomNumber: '303',
      category: 'Executive Suite',
      floor: 'Floor 3',
      baseRate: 6500,
      currentRate: 6500,
      dailyRate: 6500,
      ratePlan: 'Standard Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160332/hourstay_hms_assets/i4l2j8umtjv7udp5drci.jpg']
    },
    {
      roomNumber: '401',
      category: 'Deluxe Room',
      floor: 'Floor 4',
      baseRate: 4500,
      currentRate: 4500,
      dailyRate: 4500,
      ratePlan: 'Deluxe Plan',
      capacity: '2 Adults + 1 Child',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      amenities: 'Balcony View, Smart TV, Mini Bar, Breakfast included',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788161399/hourstay_hms_assets/yi8dpvbspfhjhsne92fj.jpg']
    },
    {
      roomNumber: '402',
      category: 'Deluxe Room',
      floor: 'Floor 4',
      baseRate: 4500,
      currentRate: 4500,
      dailyRate: 4500,
      ratePlan: 'Deluxe Plan',
      capacity: '2 Adults + 1 Child',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      amenities: 'Balcony View, Smart TV, Mini Bar, Breakfast included',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788161454/hourstay_hms_assets/o7fyts64ymoifg3wyfqf.jpg']
    },
    {
      roomNumber: '403',
      category: 'Deluxe Room',
      floor: 'Floor 4',
      baseRate: 4500,
      currentRate: 4500,
      dailyRate: 4500,
      ratePlan: 'Deluxe Plan',
      capacity: '2 Adults + 1 Child',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      amenities: 'Balcony View, Smart TV, Mini Bar, Breakfast included',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788161492/hourstay_hms_assets/x8kwcqcytgfzjurlpm62.jpg']
    },
    {
      roomNumber: '501',
      category: 'Penthouse Suite',
      floor: 'Floor 5',
      baseRate: 5500,
      currentRate: 5500,
      dailyRate: 5500,
      ratePlan: 'Penthouse Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      amenities: 'Air Conditioning, High-speed Wi-Fi, Flat Screen TV, Jacuzzi, Balcony View',
      description: 'Luxury Penthouse Suite with panoramic city view, private terrace and premium amenities.',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160332/hourstay_hms_assets/i4l2j8umtjv7udp5drci.jpg']
    },
    {
      roomNumber: '502',
      category: 'Penthouse Suite',
      floor: 'Floor 5',
      baseRate: 5500,
      currentRate: 5500,
      dailyRate: 5500,
      ratePlan: 'Penthouse Plan',
      capacity: '2 Adults',
      bedType: 'King Bed',
      status: 'Available',
      propertyId: 'HS-9HQ8P',
      amenities: 'Air Conditioning, High-speed Wi-Fi, Flat Screen TV, Jacuzzi, Balcony View',
      description: 'Luxury Penthouse Suite with panoramic city view, private terrace and premium amenities.',
      images: ['https://res.cloudinary.com/dg9sqvxen/image/upload/v1788160332/hourstay_hms_assets/i4l2j8umtjv7udp5drci.jpg']
    }
  ];

  for (const r of all14Rooms) {
    const existing = await db.collection('rooms').findOne({ roomNumber: r.roomNumber, propertyId: r.propertyId });
    if (!existing) {
      await db.collection('rooms').insertOne({
        ...r,
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0
      });
      console.log(`+ Inserted missing Room ${r.roomNumber} (${r.category})`);
    } else {
      await db.collection('rooms').updateOne(
        { _id: existing._id },
        {
          $set: {
            category: r.category,
            floor: r.floor,
            baseRate: r.baseRate,
            currentRate: r.currentRate,
            dailyRate: r.dailyRate,
            ratePlan: r.ratePlan,
            capacity: r.capacity,
            bedType: r.bedType
          }
        }
      );
      console.log(`= Verified Room ${r.roomNumber} (${r.category})`);
    }
  }

  // Also verify room count
  const updatedRooms = await db.collection('rooms').find({ propertyId: 'HS-9HQ8P' }).sort({ roomNumber: 1 }).toArray();
  console.log(`\nFinal verified rooms count for Speshway Luxury Hotel in MongoDB: ${updatedRooms.length} rooms.`);
  updatedRooms.forEach(rm => {
    console.log(`- Room ${rm.roomNumber}: ${rm.category} | ${rm.floor} | ₹${rm.baseRate} | ${rm.status}`);
  });

  const pFinal = await db.collection('properties').findOne({ _id: 'HS-9HQ8P' }) || await db.collection('properties').findOne({ id: 'HS-9HQ8P' });
  console.log(`\nProperty in DB: Name = "${pFinal.name}", Rooms count = ${pFinal.rooms}`);

  await mongoose.disconnect();
  console.log('\nAll updates completed successfully in MongoDB Atlas!');
}

updateSpeshwayRooms();
