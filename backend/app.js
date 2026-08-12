import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import managerRoutes from './routes/manager.routes.js';
import receptionistRoutes from './routes/receptionist.routes.js';
import guestRoutes from './routes/guest.routes.js';
import superAdminRoutes from './routes/superAdmin.routes.js';

import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === process.env.CLIENT_URL ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'hourstay-hms-backend' });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
