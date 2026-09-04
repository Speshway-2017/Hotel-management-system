import { Feedback } from './managerData.model.js';

// Re-export Feedback as Review alias so the entire system uses the single 'feedbacks' collection in MongoDB
export const Review = Feedback;
export default Feedback;
