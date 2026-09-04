import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB } from '../config/db.config.js';
import { Feedback } from '../models/managerData.model.js';
import Review from '../models/review.model.js';
import jwt from 'jsonwebtoken';

async function testUnifiedFeedback() {
  await connectDB();
  console.log('Connected to DB');

  // 1. Create a dummy test Feedback (if not exists)
  const feedbackData = {
    bookingId: 'BK-TEST-FB-001',
    guestName: 'Surya Test Feedback',
    guestEmail: 'surya.fb@test.com',
    guestPhone: '9944388120',
    room: '101',
    rating: 5,
    ratings: { overall: 5, cleanliness: 5, staff: 5, amenities: 5, value: 5 },
    comment: 'Feedback collection test comment from Surya',
    sentiment: 'positive',
    category: 'service'
  };
  await Feedback.findOneAndUpdate({ bookingId: feedbackData.bookingId }, feedbackData, { upsert: true, new: true });
  console.log('Upserted test Feedback in feedbacks collection');

  // 2. Create a dummy test Review (if not exists)
  const reviewData = {
    bookingId: 'BK-TEST-REV-001',
    hotelName: 'Grand Hotel',
    guestName: 'Surya Test Review',
    guestEmail: 'surya.rev@test.com',
    guestPhone: '9944388120',
    rating: 4,
    categories: { cleanliness: 4, comfort: 4, staff: 4, location: 4, valueForMoney: 4 },
    comments: 'Reviews collection test comment from Surya',
    status: 'approved'
  };
  await Review.findOneAndUpdate({ bookingId: reviewData.bookingId }, reviewData, { upsert: true, new: true });
  console.log('Upserted test Review in reviews collection');

  // 3. Test unified feedback helper directly
  const { getUnifiedFeedbacksAndReviews } = await import('../utils/unifiedFeedback.helper.js');
  const unified = await getUnifiedFeedbacksAndReviews({});
  console.log(`Unified helper returned ${unified.length} items`);

  const foundFB = unified.find(i => i.bookingId === 'BK-TEST-FB-001');
  const foundRev = unified.find(i => i.bookingId === 'BK-TEST-REV-001');

  console.log('Found Feedback item:', foundFB ? { id: foundFB._id, source: foundFB.source, guestName: foundFB.guestName, comment: foundFB.comment } : 'MISSING');
  console.log('Found Review item:', foundRev ? { id: foundRev._id, source: foundRev.source, guestName: foundRev.guestName, comment: foundRev.comment } : 'MISSING');

  if (foundFB && foundRev) {
    console.log('SUCCESS: Unified feedback retrieves both Feedback and Review models correctly!');
  } else {
    console.error('FAILED: One or both items were not found in unified output.');
  }

  process.exit(0);
}

testUnifiedFeedback().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
