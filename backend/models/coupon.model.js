import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/coupons.json');

const couponSchema = new mongoose.Schema({
  _id: { type: String, default: () => `CPN-${Math.random().toString(36).substring(2, 9).toUpperCase()}` },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    unique: true
  },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'flat'],
    required: true,
    default: 'percentage'
  },
  discountValue: { type: Number, required: true },
  maxDiscount: { type: Number, default: 0 }, // 0 = unlimited cap
  minBookingAmount: { type: Number, default: 0 },
  minimumSubscriptionAmount: { type: Number, default: 0 },
  applicableSubscriptionPlans: { type: [String], default: [] },
  validFrom: { type: String, required: true }, // ISO Date YYYY-MM-DD
  validUntil: { type: String, required: true }, // ISO Date YYYY-MM-DD
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited usage
  usedCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  propertyId: { type: String, default: 'all' }, // 'all' or specific hotel ID
  applicableSource: { type: String, default: 'website' } // 'website' or 'all'
}, {
  timestamps: true
});

couponSchema.index({ status: 1, validUntil: 1 });
couponSchema.index({ propertyId: 1 });

let MongooseCoupon;
try {
  MongooseCoupon = mongoose.model('Coupon');
} catch (e) {
  MongooseCoupon = mongoose.model('Coupon', couponSchema);
}

// File-based Mock Implementation for offline/fallback
const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const defaultCoupons = [
      {
        id: "CPN-WELCOME20",
        _id: "CPN-WELCOME20",
        code: "WELCOME20",
        title: "Welcome Special 20% Off",
        description: "Get 20% instant discount on direct website bookings above ₹1,500.",
        discountType: "percentage",
        discountValue: 20,
        maxDiscount: 2500,
        minBookingAmount: 1500,
        validFrom: "2026-01-01",
        validUntil: "2027-12-31",
        usageLimit: 500,
        usedCount: 0,
        status: "Active",
        propertyId: "all",
        applicableSource: "website",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "CPN-WELCOME",
        _id: "CPN-WELCOME",
        code: "WELCOME10",
        title: "Welcome Special",
        description: "Get 10% instant discount on your first direct website booking.",
        discountType: "percentage",
        discountValue: 10,
        maxDiscount: 2000,
        minBookingAmount: 1500,
        validFrom: "2026-01-01",
        validUntil: "2027-12-31",
        usageLimit: 500,
        usedCount: 24,
        status: "Active",
        propertyId: "all",
        applicableSource: "website",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "CPN-FESTIVE",
        _id: "CPN-FESTIVE",
        code: "STAY500",
        title: "Flat ₹500 Off",
        description: "Enjoy flat ₹500 off on reservations above ₹3,000 booked on the official website.",
        discountType: "fixed",
        discountValue: 500,
        maxDiscount: 500,
        minBookingAmount: 3000,
        validFrom: "2026-01-01",
        validUntil: "2027-12-31",
        usageLimit: 200,
        usedCount: 15,
        status: "Active",
        propertyId: "all",
        applicableSource: "website",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "CPN-LUXURY20",
        _id: "CPN-LUXURY20",
        code: "LUXURY20",
        title: "Heritage & Suite Offer",
        description: "Save 20% up to ₹4,000 on luxury villas and executive suites.",
        discountType: "percentage",
        discountValue: 20,
        maxDiscount: 4000,
        minBookingAmount: 8000,
        validFrom: "2026-01-01",
        validUntil: "2027-12-31",
        usageLimit: 100,
        usedCount: 8,
        status: "Active",
        propertyId: "all",
        applicableSource: "website",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultCoupons, null, 2));
  }
};

const readCoupons = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeCoupons = (coupons) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(coupons, null, 2));
};

class CouponInstance {
  constructor(data) {
    Object.assign(this, data);
    const cleanId = data.id || data._id;
    this.id = cleanId;
    this._id = cleanId;
  }
  async save() {
    const coupons = readCoupons();
    const cleanId = this.id || this._id;
    const index = coupons.findIndex(c => c.id === cleanId || c._id === cleanId || c.code === this.code);
    this.updatedAt = new Date().toISOString();
    const updated = { ...this, id: cleanId, _id: cleanId };
    if (index !== -1) {
      coupons[index] = updated;
    } else {
      coupons.push(updated);
    }
    writeCoupons(coupons);
    return this;
  }
}

const MockCoupon = {
  find: async (query = {}) => {
    let list = readCoupons();
    if (query.code) {
      list = list.filter(c => c.code === query.code.toUpperCase());
    }
    if (query.status) {
      list = list.filter(c => c.status === query.status);
    }
    if (query.propertyId && query.propertyId !== 'all') {
      list = list.filter(c => c.propertyId === 'all' || c.propertyId === query.propertyId);
    }
    return list.map(c => new CouponInstance(c));
  },
  findOne: async (query) => {
    const coupons = readCoupons();
    const match = coupons.find(c => {
      if (query.code && c.code !== query.code.toUpperCase()) return false;
      if (query.status && c.status !== query.status) return false;
      if (query._id && (c.id !== query._id && c._id !== query._id)) return false;
      return true;
    });
    return match ? new CouponInstance(match) : null;
  },
  findById: async (id) => {
    const coupons = readCoupons();
    const match = coupons.find(c => c.id === id || c._id === id);
    return match ? new CouponInstance(match) : null;
  },
  create: async (data) => {
    const coupons = readCoupons();
    const id = data.id || data._id || `CPN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const newCoupon = {
      id,
      _id: id,
      code: String(data.code || '').trim().toUpperCase(),
      title: data.title || '',
      description: data.description || '',
      discountType: data.discountType || 'percentage',
      discountValue: Number(data.discountValue) || 0,
      maxDiscount: Number(data.maxDiscount) || 0,
      minBookingAmount: Number(data.minBookingAmount) || 0,
      validFrom: data.validFrom || new Date().toISOString().split('T')[0],
      validUntil: data.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      usageLimit: Number(data.usageLimit) || 0,
      usedCount: Number(data.usedCount) || 0,
      status: data.status || 'Active',
      propertyId: data.propertyId || 'all',
      applicableSource: 'website',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    coupons.push(newCoupon);
    writeCoupons(coupons);
    return new CouponInstance(newCoupon);
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    const list = readCoupons();
    const idx = list.findIndex(c => c.id === id || c._id === id);
    if (idx === -1) return null;
    const current = list[idx];
    const updated = {
      ...current,
      ...update,
      code: update.code ? String(update.code).trim().toUpperCase() : current.code,
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    writeCoupons(list);
    return new CouponInstance(updated);
  },
  findByIdAndDelete: async (id) => {
    const list = readCoupons();
    const idx = list.findIndex(c => c.id === id || c._id === id);
    if (idx === -1) return null;
    const removed = list.splice(idx, 1)[0];
    writeCoupons(list);
    return new CouponInstance(removed);
  }
};

class CouponQueryWrapper {
  constructor(executor) {
    this.executor = executor;
    this.sortFields = null;
  }
  sort(fields) {
    this.sortFields = fields;
    return this;
  }
  lean() {
    return this;
  }
  async then(onFulfilled, onRejected) {
    try {
      let result;
      if (mongoose.connection.readyState === 1) {
        let query = this.executor(true);
        if (this.sortFields && query.sort) {
          query = query.sort(this.sortFields);
        }
        result = await query;
        if (!result || (Array.isArray(result) && result.length === 0)) {
          // If Mongoose collection is empty, seed defaults and fallback
          const mockItems = await MockCoupon.find();
          if (Array.isArray(result)) {
            for (const item of mockItems) {
              try {
                await MongooseCoupon.create({
                  _id: item._id,
                  code: item.code,
                  title: item.title,
                  description: item.description,
                  discountType: item.discountType,
                  discountValue: item.discountValue,
                  maxDiscount: item.maxDiscount,
                  minBookingAmount: item.minBookingAmount,
                  validFrom: item.validFrom,
                  validUntil: item.validUntil,
                  usageLimit: item.usageLimit,
                  usedCount: item.usedCount,
                  status: item.status,
                  propertyId: item.propertyId,
                  applicableSource: item.applicableSource
                });
              } catch (e) {}
            }
            result = await this.executor(true);
          }
        }
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

export const Coupon = {
  find: (query = {}) => {
    return new CouponQueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseCoupon.find(query);
      return MockCoupon.find(query);
    });
  },
  findOne: (query) => {
    return new CouponQueryWrapper((isMongoose) => {
      if (isMongoose) return MongooseCoupon.findOne(query);
      return MockCoupon.findOne(query);
    });
  },
  findById: (id) => {
    return new CouponQueryWrapper((isMongoose) => {
      if (isMongoose) {
        return MongooseCoupon.findOne({ $or: [{ _id: String(id) }, { _id: id }, { id: String(id) }] });
      }
      return MockCoupon.findById(id);
    });
  },
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      const payload = {
        ...data,
        code: String(data.code || '').trim().toUpperCase()
      };
      const created = await MongooseCoupon.create(payload);
      try {
        await MockCoupon.create(payload);
      } catch (e) {}
      return created;
    }
    return await MockCoupon.create(data);
  },
  findByIdAndUpdate: async (id, update, options = {}) => {
    if (mongoose.connection.readyState === 1) {
      const updated = await MongooseCoupon.findOneAndUpdate(
        { $or: [{ _id: String(id) }, { _id: id }, { id: String(id) }] },
        update,
        { new: true, ...options }
      );
      try {
        await MockCoupon.findByIdAndUpdate(id, update, options);
      } catch (e) {}
      return updated;
    }
    return await MockCoupon.findByIdAndUpdate(id, update, options);
  },
  findByIdAndDelete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      const deleted = await MongooseCoupon.findOneAndDelete({ $or: [{ _id: String(id) }, { _id: id }, { id: String(id) }] });
      try {
        await MockCoupon.findByIdAndDelete(id);
      } catch (e) {}
      return deleted;
    }
    return await MockCoupon.findByIdAndDelete(id);
  }
};

export default Coupon;
