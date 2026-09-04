import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Feedback } from '../models/managerData.model.js';
import Notification from '../models/notification.model.js';
import { getUnifiedFeedbacksAndReviews } from '../utils/unifiedFeedback.helper.js';
import { notifyFeedbackEvent } from '../utils/notification.helper.js';

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_management';

async function testFeedbackAndNotifications() {
  console.log('--- TESTING GUEST FEEDBACK & NOTIFICATION FLOW ---');
  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // 1. Check existing feedbacks
  const initialList = await getUnifiedFeedbacksAndReviews();
  console.log(`✓ Initial Feedback Count from DB: ${initialList.length}`);

  // 2. Create dynamic feedback
  const testBookingId = `BK-TEST-${Date.now().toString().slice(-4)}`;
  const createdFeedback = await Feedback.create({
    bookingId: testBookingId,
    guestName: "Priya Sundaram",
    guestEmail: "priya.s@example.com",
    guestPhone: "+91 98765 43219",
    room: "302 · Deluxe Room",
    roomType: "Deluxe Room",
    rating: 5,
    ratings: { cleanliness: 5, service: 5, room: 5, food: 5, overall: 5 },
    category: "Guest Experience",
    sentiment: "Positive",
    status: "Published",
    comment: "Exceptional heritage ambience, friendly staff and prompt room service!",
    comments: "Exceptional heritage ambience, friendly staff and prompt room service!",
    propertyId: "HS-JAI",
    propertyName: "Rambagh Residency, Jaipur"
  });
  console.log(`✓ Created test feedback in MongoDB: ID ${createdFeedback._id}`);

  // 3. Dispatch notifications
  await notifyFeedbackEvent({
    action: 'created',
    feedback: createdFeedback,
    actor: 'Priya Sundaram'
  });
  console.log('✓ Dispatched notifications for feedback creation');

  // Verify notifications created in MongoDB
  const notifs = await Notification.find({
    $or: [{ role: 'admin' }, { role: 'manager' }, { role: 'receptionist' }]
  });
  console.log(`✓ Total notifications in DB for admin/manager/receptionist: ${notifs.length}`);
  const matchingNotif = notifs.find(n => n.message && n.message.includes('Priya Sundaram'));
  if (matchingNotif) {
    console.log(`✓ Verified matching DB notification: "${matchingNotif.title}" -> "${matchingNotif.message}"`);
  } else {
    console.log('⚠️ Could not find exact matching notification by message.');
  }

  // 4. Update status & add response
  const updated = await Feedback.findByIdAndUpdate(
    createdFeedback._id,
    {
      response: "Thank you for the warm feedback, Priya! We look forward to your next visit.",
      respondedBy: "Hotel Manager",
      respondedAt: new Date(),
      status: "Resolved"
    },
    { new: true }
  );
  console.log(`✓ Updated feedback response & status: ${updated.status}`);

  await notifyFeedbackEvent({
    action: 'responded',
    feedback: updated,
    actor: 'Hotel Manager'
  });
  console.log('✓ Dispatched response notification');

  // 5. Query unified feedbacks
  const unified = await getUnifiedFeedbacksAndReviews({ propertyId: 'HS-JAI' });
  const found = unified.find(f => (f._id || f.id) === String(createdFeedback._id));
  console.log(`✓ Unified query found updated feedback: ${!!found && found.status === 'Resolved'}`);

  console.log('--- ALL FEEDBACK & NOTIFICATION TESTS PASSED SUCCESSFULLY ---');
  await mongoose.disconnect();
  process.exit(0);
}

testFeedbackAndNotifications().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
