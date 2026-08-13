import mongoose from 'mongoose';
import dns from 'dns';

export const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  const isSrv = process.env.MONGODB_URI.startsWith('mongodb+srv://');

  const tryConnect = async (usePublicDns = false) => {
    if (isSrv && usePublicDns) {
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        console.log('🌐 Configured Node.js to use public DNS resolvers (Google DNS)');
      } catch (dnsErr) {
        console.warn('⚠️ Failed to set public DNS resolvers:', dnsErr.message);
      }
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'hourstay_hms',
      serverSelectionTimeoutMS: 5000 // fail fast in 5 seconds
    });
  };

  try {
    console.log('🔌 Connecting to MongoDB...');
    await tryConnect(false);
    console.log('🍃 MongoDB Atlas connected successfully (Hour Stay HMS)');
  } catch (error) {
    const isDnsError = error.message.includes('querySrv') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED');

    if (isDnsError && isSrv) {
      console.warn(`⚠️ DNS resolution failed: ${error.message}. Retrying with public Google DNS resolvers...`);
      try {
        await tryConnect(true);
        console.log('🍃 MongoDB Atlas connected successfully (Hour Stay HMS) via Google DNS');
        return;
      } catch (retryError) {
        console.error('❌ MongoDB Atlas connection failed after retrying with public DNS:', retryError.message);
        error = retryError; // preserve the retry error for further checks
      }
    } else {
      console.error('❌ MongoDB Atlas connection failed:', error.message);
    }

    // Check if the connection failed due to bad authentication (configuration error)
    const isAuthError = error.message.includes('auth') || error.message.includes('Authentication') || error.message.includes('password') || error.code === 18;
    if (isAuthError) {
      console.error('🛑 Critical configuration error: Authentication failed. Check your database credentials.');
      console.error('Server startup aborted.');
      process.exit(1);
    }

    console.log('💾 Using local offline File-based JSON Database fallback');
  }
};
