import mongoose from 'mongoose';

export const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'hourstay_hms',
    });

    console.log('🍃 MongoDB connected successfully (Hour Stay HMS)');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // Don't crash immediately in development environment if local mongo is down
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
