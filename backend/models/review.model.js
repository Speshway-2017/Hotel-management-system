import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  hotelName: { type: String, required: true },
  guestName: { type: String, required: true },
  guestEmail: { type: String },
  guestPhone: { type: String },
  userId: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  categories: {
    cleanliness: { type: Number, default: 5 },
    service: { type: Number, default: 5 },
    room: { type: Number, default: 5 },
    food: { type: Number, default: 5 },
    overall: { type: Number, default: 5 }
  },
  comments: { type: String, required: true },
  status: { type: String, default: 'Published' }
}, { timestamps: true });

export default mongoose.models.Review || mongoose.model('Review', reviewSchema);
