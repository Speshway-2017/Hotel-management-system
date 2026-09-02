import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/bookings.json');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String },
  guest: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  room: { type: String },
  roomType: { type: String },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  nights: { type: Number, default: 1 },
  pax: { type: String },
  source: { type: String, default: 'Direct' },
  status: { type: String, default: 'Confirmed' },
  paymentStatus: { type: String, default: 'Paid' },
  amount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  city: { type: String, default: 'Hyderabad' },
  balance: { type: Number, default: 0 },
  propertyId: { type: String, required: true }
}, {
  timestamps: true,
  strict: false
});

bookingSchema.pre('validate', function(next) {
  if (!this.amount || isNaN(this.amount) || Number(this.amount) <= 0) {
    this.amount = Number(this.totalAmount) || 7080;
  }
  if (!this.totalAmount || isNaN(this.totalAmount) || Number(this.totalAmount) <= 0) {
    this.totalAmount = Number(this.amount) || 7080;
  }
  next();
});

let MongooseBooking;
if (mongoose.models.Booking) {
  delete mongoose.models.Booking;
}
MongooseBooking = mongoose.model('Booking', bookingSchema);

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const defaultBookings = [
      {
        id: "BK-10301",
        _id: "BK-10301",
        bookingId: "BK-10301",
        guest: "Surya",
        phone: "+91 98765 10301",
        email: "surya@gmail.com",
        room: "103 · Standard Room",
        roomNumber: "103",
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
        id: "BK-20203",
        _id: "BK-20203",
        bookingId: "BK-20203",
        guest: "Aswini",
        phone: "+91 98840 20203",
        email: "aswini@gmail.com",
        room: "202 · Deluxe Room",
        roomNumber: "202",
        roomType: "Deluxe Room",
        checkIn: "2026-09-02",
        checkOut: "2026-09-04",
        nights: 2,
        pax: "2 Adults",
        source: "Direct Web",
        status: "Confirmed",
        amount: 14500,
        totalAmount: 14500,
        balance: 0,
        paymentStatus: "Paid",
        propertyId: "HS-JAI"
      },
      {
        id: "BK-20402",
        _id: "BK-20402",
        bookingId: "BK-20402",
        guest: "Mounika",
        phone: "+91 99443 88120",
        email: "mounika@gmail.com",
        room: "101 · Standard Room",
        roomNumber: "101",
        roomType: "Standard Room",
        checkIn: "2026-09-02",
        checkOut: "2026-09-03",
        nights: 1,
        pax: "2 Adults",
        source: "MakeMyTrip",
        status: "Checked-in",
        amount: 11400,
        totalAmount: 11400,
        balance: 0,
        paymentStatus: "Paid",
        propertyId: "HS-JAI"
      },
      {
        id: "BK-10202",
        _id: "BK-10202",
        bookingId: "BK-10202",
        guest: "Vamsi",
        phone: "+91 98765 10202",
        email: "vamsi@gmail.com",
        room: "102 · Standard Room",
        roomNumber: "102",
        roomType: "Standard Room",
        checkIn: "2026-09-02",
        checkOut: "2026-09-03",
        nights: 1,
        pax: "2 Adults",
        source: "Direct Web",
        status: "Checked-in",
        amount: 3000,
        totalAmount: 3000,
        balance: 0,
        paymentStatus: "Paid",
        propertyId: "HS-JAI"
      },
      {
        id: "HS24-10241",
        _id: "HS24-10241",
        bookingId: "HS24-10241",
        guest: "Aarav Mehta",
        phone: "+91 98204 33121",
        email: "aarav.mehta@gmail.com",
        room: "312 · Premier Haveli",
        roomNumber: "312",
        checkIn: "2026-09-01",
        checkOut: "2026-09-04",
        nights: 3,
        pax: "2 Adults",
        source: "Direct",
        status: "Confirmed",
        amount: 37200,
        totalAmount: 37200,
        balance: 0,
        paymentStatus: "Paid",
        propertyId: "HS-JAI"
      },
      {
        id: "HS24-10243",
        _id: "HS24-10243",
        bookingId: "HS24-10243",
        guest: "Rohan & Sneha Kulkarni",
        phone: "+91 99870 21145",
        email: "rohan.k@gmail.com",
        room: "501 · Maharaja Suite",
        roomNumber: "501",
        checkIn: "2026-09-03",
        checkOut: "2026-09-07",
        nights: 4,
        pax: "2 Adults, 1 Child",
        source: "Booking.com",
        status: "Confirmed",
        amount: 98000,
        totalAmount: 98000,
        balance: 49000,
        paymentStatus: "Partial",
        propertyId: "HS-JAI"
      },
      {
        id: "HS24-10244",
        _id: "HS24-10244",
        bookingId: "HS24-10244",
        guest: "Devendra Shastri",
        phone: "+91 93450 09912",
        email: "devendra@shastri.com",
        room: "108 · Deluxe Courtyard",
        roomNumber: "108",
        checkIn: "2026-08-31",
        checkOut: "2026-09-01",
        nights: 1,
        pax: "1 Adult",
        source: "Walk-in",
        status: "Checked-out",
        amount: 9400,
        totalAmount: 9400,
        balance: 0,
        paymentStatus: "Paid",
        propertyId: "HS-JAI"
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
      city: data.city || 'Hyderabad',
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
    this.sortFields = [];
    this.limitVal = null;
    this.skipVal = null;
  }
  select(fields) { this.selectFields.push(fields); return this; }
  sort(fields) { this.sortFields.push(fields); return this; }
  limit(n) { this.limitVal = n; return this; }
  skip(n) { this.skipVal = n; return this; }
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
        for (const sFields of this.sortFields) {
          query = query.sort(sFields);
        }
        if (this.limitVal !== null) {
          query = query.limit(this.limitVal);
        }
        if (this.skipVal !== null) {
          query = query.skip(this.skipVal);
        }
        result = await query;
      } else {
        result = await this.executor(false);
        if (Array.isArray(result)) {
          for (const sFields of this.sortFields) {
            if (typeof sFields === 'object') {
              const keys = Object.keys(sFields);
              result.sort((a, b) => {
                for (const key of keys) {
                  const dir = sFields[key];
                  if (a[key] < b[key]) return dir === -1 ? 1 : -1;
                  if (a[key] > b[key]) return dir === -1 ? -1 : 1;
                }
                return 0;
              });
            }
          }
          if (this.skipVal) {
            result = result.slice(this.skipVal);
          }
          if (this.limitVal) {
            result = result.slice(0, this.limitVal);
          }
        }
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
  findOneAndUpdate: (query, update, options) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseBooking.findOneAndUpdate(query, update, { new: true, ...options });
      return MockBooking.findOneAndUpdate(query, update, options);
    });
  },
  findOneAndDelete: (query) => {
    return new QueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseBooking.findOneAndDelete(query);
      return MockBooking.findOneAndDelete(query);
    });
  },
  create: async (data) => {
    const cleanData = { ...data };
    const numAmount = Number(cleanData.amount || cleanData.totalAmount || 7080);
    cleanData.amount = (isNaN(numAmount) || numAmount <= 0) ? 7080 : numAmount;
    cleanData.totalAmount = cleanData.amount;
    cleanData.guest = cleanData.guest || cleanData.guestName || 'Guest';
    cleanData.checkIn = cleanData.checkIn || cleanData.checkInDate || '2026-09-01';
    cleanData.checkOut = cleanData.checkOut || cleanData.checkOutDate || '2026-09-03';
    cleanData.propertyId = cleanData.propertyId || 'HS-9HQ8P';
    cleanData.city = cleanData.city || cleanData.hotelCity || 'Hyderabad';

    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseBooking.create(cleanData);
      } catch (err) {
        console.warn("⚠️ MongooseBooking.create failed, falling back to local store:", err.message);
        return await MockBooking.create(cleanData);
      }
    }
    return await MockBooking.create(cleanData);
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
