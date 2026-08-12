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

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Create HTTP Server
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`🏨 Hour Stay HMS Backend Server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start HMS server:', err.message);
  process.exit(1);
});
