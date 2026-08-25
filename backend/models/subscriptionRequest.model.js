import mongoose from 'mongoose';

const subscriptionRequestSchema = new mongoose.Schema({
  propertyId: { type: String, required: true },
  propertyName: { type: String, required: true },
  adminId: { type: String, ref: 'User', required: true },
  adminName: { type: String, required: true },
  planName: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  rejectionReason: { type: String, default: '' },
  decidedBy: { type: String, default: '' },
  decidedAt: { type: Date, default: null }
}, { timestamps: true });

export const SubscriptionRequest = mongoose.models.SubscriptionRequest || mongoose.model('SubscriptionRequest', subscriptionRequestSchema);
