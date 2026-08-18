import mongoose from 'mongoose';

const promoCouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'flat'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  validFrom: {
    type: String,
    required: true
  },
  validUntil: {
    type: String,
    required: true
  },
  usageLimit: {
    type: Number,
    required: true,
    min: 1
  },
  usedCount: {
    type: Number,
    default: 0
  },
  minimumSubscriptionAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  applicableSubscriptionPlans: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, {
  timestamps: true
});

const PromoCoupon = mongoose.model('PromoCoupon', promoCouponSchema);

export default PromoCoupon;
