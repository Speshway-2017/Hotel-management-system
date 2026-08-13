import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/bookings.json');

const bookingSchema = new mongoose.Schema({
  guest: { type: String, required: true },
  phone: { type: String },
  room: { type: String },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  nights: { type: Number, default: 1 },
  pax: { type: String },
  source: { type: String, default: 'Direct' },
  status: { type: String, enum: ['Confirmed', 'Checked-in', 'Checked-out', 'Pending', 'Cancelled'], default: 'Pending' },
  amount: { type: Number, required: true },
  balance: { type: Number, default: 0 },
  propertyId: { type: String, required: true }
}, {
  timestamps: true
});

let MongooseBooking;
try {
  MongooseBooking = mongoose.model('Booking');
} catch (e) {
  MongooseBooking = mongoose.model('Booking', bookingSchema);
}

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const defaultBookings = [
      {
        id: "HS24-10241",
        _id: "HS24-10241",
        guest: "Aarav Mehta",
        phone: "+91 98204 33121",
        room: "312 · Premier Haveli",
        checkIn: "12 Aug 2026",
        checkOut: "15 Aug 2026",
        nights: 3,
        pax: "2 Adults",
        source: "Direct",
        status: "Confirmed",
        amount: 37200,
        balance: 0,
        propertyId: "HS-JAI"
      },
      {
        id: "HS24-10242",
        _id: "HS24-10242",
        guest: "Priya Iyer",
        phone: "+91 90031 87740",
        room: "204 · Deluxe Courtyard",
        checkIn: "12 Aug 2026",
        checkOut: "13 Aug 2026",
        nights: 1,
        pax: "1 Adult",
        source: "MakeMyTrip",
        status: "Checked-in",
        amount: 8900,
        balance: 2100,
        propertyId: "HS-JAI"
      },
      {
        id: "HS24-10243",
        _id: "HS24-10243",
        guest: "Rohan & Sneha Kulkarni",
        phone: "+91 99870 21145",
        room: "501 · Maharaja Suite",
        checkIn: "13 Aug 2026",
        checkOut: "17 Aug 2026",
        nights: 4,
        pax: "2 Adults, 1 Child",
        source: "Booking.com",
        status: "Confirmed",
        amount: 98000,
        balance: 49000,
        propertyId: "HS-UDA"
      },
      {
        id: "HS24-10244",
        _id: "HS24-10244",
        guest: "Devendra Shastri",
        phone: "+91 93450 09912",
        room: "108 · Deluxe Courtyard",
        checkIn: "11 Aug 2026",
        checkOut: "12 Aug 2026",
        nights: 1,
        pax: "1 Adult",
        source: "Walk-in",
        status: "Checked-out",
        amount: 9400,
        balance: 0,
        propertyId: "HS-JAI"
      },
      {
        id: "HS24-10245",
        _id: "HS24-10245",
        guest: "Ananya Bose",
        phone: "+91 98311 55420",
        room: "410 · Premier Haveli",
        checkIn: "14 Aug 2026",
        checkOut: "16 Aug 2026",
        nights: 2,
        pax: "2 Adults",
        source: "Goibibo",
        status: "Pending",
        amount: 24800,
        balance: 24800,
        propertyId: "HS-GOA"
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultBookings, null, 2));
  }
};

const readBookings = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeBookings = (bookings) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
};

class BookingInstance {
  constructor(data) {
    Object.assign(this, data);
    const cleanId = data.id || data._id;
    this.id = cleanId;
    this._id = cleanId;
  }

  async save() {
    const bookings = readBookings();
    const cleanId = this.id || this._id || "HS24-" + Math.floor(10000 + Math.random() * 90000);
    this.id = cleanId;
    this._id = cleanId;
    const index = bookings.findIndex(b => b.id === cleanId);
    
    this.updatedAt = new Date().toISOString();
    if (!this.createdAt) this.createdAt = new Date().toISOString();

    const record = { ...this };
    if (index !== -1) {
      bookings[index] = record;
    } else {
      bookings.push(record);
    }
    writeBookings(bookings);
    return this;
  }
}

const MockBooking = {
  find: async (query = {}) => {
    let list = readBookings();
    if (query.propertyId) {
      list = list.filter(b => b.propertyId === query.propertyId);
    }
    if (query.status) {
      list = list.filter(b => b.status === query.status);
    }
    return list.map(b => new BookingInstance(b));
  },
  findOne: async (query) => {
    const list = readBookings();
    const b = list.find(item => {
      const qId = query._id || query.id;
      if (qId) return item.id === qId || item._id === qId;
      return false;
    });
    return b ? new BookingInstance(b) : null;
  },
  findById: async (id) => {
    const list = readBookings();
    const b = list.find(item => item.id === id || item._id === id);
    return b ? new BookingInstance(b) : null;
  },
  create: async (data) => {
    const list = readBookings();
    const id = "HS24-" + Math.floor(10000 + Math.random() * 90000);
    const newBooking = {
      id: id,
      _id: id,
      guest: data.guest,
      phone: data.phone || '',
      room: data.room || '',
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights: Number(data.nights) || 1,
      pax: data.pax || '2 Adults',
      source: data.source || 'Direct',
      status: data.status || 'Pending',
      amount: Number(data.amount) || 0,
      balance: Number(data.balance) || 0,
      propertyId: data.propertyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.push(newBooking);
    writeBookings(list);
    return new BookingInstance(newBooking);
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    const list = readBookings();
    const idx = list.findIndex(b => b.id === id || b._id === id);
    if (idx === -1) return null;

    const current = list[idx];
    const updated = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString()
    };

    if (update.amount !== undefined) updated.amount = Number(update.amount);
    if (update.balance !== undefined) updated.balance = Number(update.balance);
    if (update.nights !== undefined) updated.nights = Number(update.nights);

    list[idx] = updated;
    writeBookings(list);
    return new BookingInstance(updated);
  },
  findByIdAndDelete: async (id) => {
    const list = readBookings();
    const idx = list.findIndex(b => b.id === id || b._id === id);
    if (idx === -1) return null;
    const removed = list.splice(idx, 1)[0];
    writeBookings(list);
    return new BookingInstance(removed);
  }
};

class QueryWrapper {
  constructor(executor) {
    this.executor = executor;
    this.selectFields = [];
  }
  select(fields) { this.selectFields.push(fields); return this; }
  lean() { return this; }
  populate() { return this; }
  async then(onFulfilled, onRejected) {
    try {
      let result;
      if (mongoose.connection.readyState === 1) {
        let query = this.executor(true);
        for (const fields of this.selectFields) {
          query = query.select(fields);
        }
        result = await query;
      } else {
        result = await this.executor(false);
      }
      return onFulfilled ? onFulfilled(result) : result;
    } catch (err) {
      if (onRejected) return onRejected(err);
      throw err;
    }
  }
}

const Booking = {
  find: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseBooking.find(query);
      return MockBooking.find(query);
    });
  },
  findOne: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseBooking.findOne(query);
      return MockBooking.findOne(query);
    });
  },
  findById: (id) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseBooking.findById(id);
      return MockBooking.findById(id);
    });
  },
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseBooking.create(data);
    }
    return await MockBooking.create(data);
  },
  findByIdAndUpdate: async (id, update, options) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseBooking.findByIdAndUpdate(id, update, { new: true, ...options });
    }
    return await MockBooking.findByIdAndUpdate(id, update, options);
  },
  findByIdAndDelete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseBooking.findByIdAndDelete(id);
    }
    return await MockBooking.findByIdAndDelete(id);
  }
};

export default Booking;
