import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  yearlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  propertyLimit: {
    type: Number,
    required: true,
    min: 1
  },
  roomLimit: {
    type: Number,
    required: true,
    min: 1
  },
  includedFeatures: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  activeSubscribers: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
