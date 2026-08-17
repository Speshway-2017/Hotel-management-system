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
import publicRoutes from './routes/public.routes.js';

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

// Mount Route Versioning Aliases
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/receptionist', receptionistRoutes);
app.use('/api/v1/guest', guestRoutes);
app.use('/api/v1/super-admin', superAdminRoutes);

app.use('/api/public', publicRoutes);
app.use('/api/v1/public', publicRoutes);

// Route aliases for /api/properties and /api/admins to reuse super-admin routes
const aliasProperties = (req, res, next) => {
  req.url = '/properties' + (req.url === '/' ? '' : req.url);
  superAdminRoutes(req, res, next);
};
const aliasAdmins = (req, res, next) => {
  req.url = '/users' + (req.url === '/' ? '' : req.url);
  superAdminRoutes(req, res, next);
};

app.use('/api/properties', aliasProperties);
app.use('/api/v1/properties', aliasProperties);
app.use('/api/admins', aliasAdmins);
app.use('/api/v1/admins', aliasAdmins);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
