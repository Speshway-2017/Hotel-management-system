import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import { connectDB } from '../config/db.config.js';
import { Feedback } from '../models/managerData.model.js';

async function migrateReviewsToFeedbacks() {
  await connectDB();
  console.log('Connected to DB for migration');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const hasReviewsCollection = collections.some(c => c.name === 'reviews');

  if (!hasReviewsCollection) {
    console.log('No "reviews" collection found in database. All records already unified in "feedbacks".');
    process.exit(0);
  }

  const reviews = await db.collection('reviews').find({}).toArray();
  console.log(`Found ${reviews.length} documents in legacy "reviews" collection.`);

  let migratedCount = 0;
  for (const r of reviews) {
    const cleanliness = r.categories?.cleanliness || 5;
    const service = r.categories?.service || 5;
    const room = r.categories?.room || 5;
    const food = r.categories?.food || 5;
    const overall = Number(r.rating || r.categories?.overall || Math.round((cleanliness + service + room + food) / 4)) || 5;
    const sentiment = r.sentiment || (overall >= 4 ? 'Positive' : overall === 3 ? 'Neutral' : 'Negative');
    const commentText = r.comments || r.comment || '';

    const feedbackDoc = {
      bookingId: r.bookingId || `BK-${Date.now().toString().slice(-5)}`,
      guestName: r.guestName || 'Valued Guest',
      guestEmail: r.guestEmail || '',
      guestPhone: r.guestPhone || '',
      room: r.room || '101 · Standard Room',
      roomType: r.roomType || 'Standard Room',
      rating: overall,
      ratings: {
        cleanliness,
        service,
        room,
        food,
        overall
      },
      category: r.category || 'Guest Stay Review',
      sentiment,
      status: r.status || 'Published',
      comment: commentText,
      comments: commentText,
      response: r.response || '',
      respondedAt: r.respondedAt || null,
      propertyId: r.propertyId || 'HS-JAI'
    };

    // Upsert by matching bookingId & guestEmail or create
    const existing = await Feedback.findOne({
      $or: [
        { bookingId: feedbackDoc.bookingId, guestEmail: feedbackDoc.guestEmail },
        { comment: feedbackDoc.comment, guestName: feedbackDoc.guestName }
      ]
    });

    if (!existing) {
      await Feedback.create(feedbackDoc);
      migratedCount++;
    }
  }

  console.log(`Successfully migrated ${migratedCount} new feedback records into "feedbacks" collection.`);

  // Drop the old collection
  try {
    await db.collection('reviews').drop();
    console.log('Dropped legacy "reviews" collection.');
  } catch (err) {
    console.warn('Could not drop "reviews" collection:', err.message);
  }

  const totalFeedbacks = await Feedback.countDocuments({});
  console.log(`Total records in unified "feedbacks" collection now: ${totalFeedbacks}`);

  process.exit(0);
}

migrateReviewsToFeedbacks().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
