import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env first
dotenv.config({ path: path.join(__dirname, '.env') });

import { validateEnv } from './config/env.validate.js';
import { connectDB } from './config/db.config.js';
import app from './app.js';

// Validate Env vars
validateEnv();

const PORT = process.env.PORT || 5000;

import { seedUsers } from './scripts/seed.js';

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Seed demo workspace accounts
  await seedUsers();

  // Create HTTP Server
  const server = http.createServer(app);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.log(`💡 A backend instance is already running on port ${PORT} and active.`);
      process.exit(0); // Exit cleanly
    } else {
      console.error('❌ Server error:', err.message);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`🏨 Hour Stay HMS Backend Server running on port ${PORT}`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`🔌 Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('🛑 HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('⚠️ Forced shutdown due to timeout');
      process.exit(1);
    }, 2000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.once('SIGUSR2', () => {
    console.log('🔄 Nodemon restart signal received. Releasing port...');
    server.close(() => {
      process.exit(0);
    });
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start HMS server:', err.message);
  process.exit(1);
});
// Trigger seed refresh - force rerun migration v4
