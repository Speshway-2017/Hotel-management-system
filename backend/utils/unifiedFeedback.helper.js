import { Feedback } from '../models/managerData.model.js';

/**
 * Fetches feedback records from the single 'feedbacks' MongoDB collection,
 * normalized and sorted newest first.
 */
export async function getUnifiedFeedbacksAndReviews(query = {}) {
  try {
    let filter = {};
    if (query.$or) {
      filter = query;
    } else if (query.propertyId && query.propertyId !== 'all') {
      filter = {
        $or: [
          { propertyId: query.propertyId },
          { propertyId: { $exists: false } },
          { propertyId: '' },
          { propertyId: 'all' },
          { propertyId: 'HS-JAI' }
        ]
      };
    } else {
      filter = query || {};
    }

    const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });

    return feedbacks.map(f => {
      const raw = f.toObject ? f.toObject() : f;
      const commentText = raw.comment || raw.comments || '';
      return {
        ...raw,
        _id: String(raw._id || raw.id),
        id: String(raw._id || raw.id),
        comment: commentText,
        comments: commentText,
        sourceModel: 'Feedback'
      };
    });
  } catch (err) {
    console.warn('Feedback query error:', err.message);
    return [];
  }
}

export default getUnifiedFeedbacksAndReviews;
