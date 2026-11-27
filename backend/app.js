import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import managerRoutes from './routes/manager.routes.js';
import receptionistRoutes from './routes/receptionist.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import guestRoutes from './routes/guest.routes.js';
import superAdminRoutes from './routes/superAdmin.routes.js';
import publicRoutes from './routes/public.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import securityRoutes from './routes/security.routes.js';

import {
  createHelmetMiddleware,
  isOriginAllowed,
  enforceHttps,
  csrfProtection,
  globalApiLimiter
} from './middleware/security.middleware.js';
import sanitizeInputs from './middleware/sanitize.middleware.js';
import { blockCheckMiddleware, recordSecurityEvent } from './services/securityMonitor.service.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Trust reverse proxy headers (Nginx / Cloudflare / Render) for accurate IP & HTTPS detection
app.set('trust proxy', 1);

// 1. HTTPS Enforcement (Production)
app.use(enforceHttps);

// 2. Helmet.js & Environment-Aware Content Security Policy (CSP)
app.use(createHelmetMiddleware());

// 3. Strict Origin-Validated CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      recordSecurityEvent({
        type: 'CORS_ORIGIN_BLOCKED',
        severity: 'medium',
        details: `Blocked unauthorized CORS origin: ${origin}`,
        metadata: { origin }
      }).catch(() => {});
      const corsErr = new Error('Not allowed by CORS policy');
      corsErr.statusCode = 403;
      return callback(corsErr, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Property-Id', 'X-CSRF-Token', 'X-XSRF-TOKEN', 'X-Client-Platform']
  })
);

// 4. Temporary IP Lockout & Abnormal Traffic Detection
app.use(blockCheckMiddleware);

// 5. Global Rate Limiter
app.use(globalApiLimiter);

// 6. Cookie Parser & CSRF Protection
app.use(cookieParser());
app.use(csrfProtection);

// 7. Raw body parser specifically for Razorpay Webhook HMAC verification (before express.json)
app.use('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use('/api/v1/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

// 8. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 9. Input Sanitization (NoSQL Injection, XSS, Prototype Pollution, HPP)
app.use(
  sanitizeInputs((req, stats) => {
    recordSecurityEvent({
      type: stats.nosqlKeysRemoved.length > 0 ? 'NOSQL_INJECTION_PROBE' : 'XSS_PROBE_DETECTED',
      severity: 'high',
      req,
      details: `Sanitized suspicious payload (NoSQL keys: [${stats.nosqlKeysRemoved.join(',')}], XSS: ${stats.xssNeutralized})`,
      notifyAdmins: stats.nosqlKeysRemoved.length > 0
    }).catch(() => {});
  })
);

// Serve static uploads safely (no script execution, nosniff, block protected-ids subdirectory)
app.use('/uploads/protected-ids', (_req, res) => {
  return res.status(403).json({ success: false, message: 'Direct unauthenticated access to ID documents is forbidden.' });
});
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
    }
  })
);

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'hourstay-hms-backend' });
});
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'hourstay-hms-backend' });
});
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'hourstay-hms-backend' });
});

// Server Time Endpoints
const handleServerTime = (_req, res) => {
  const now = new Date();
  res.status(200).json({
    success: true,
    data: {
      serverTime: now.toISOString(),
      serverTimestamp: now.getTime(),
      timezone: 'Asia/Kolkata',
      standardCheckInTime: '12:00 PM',
      standardCheckOutTime: '11:00 AM'
    }
  });
};
app.get('/server-time', handleServerTime);
app.get('/api/server-time', handleServerTime);
app.get('/api/v1/server-time', handleServerTime);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/security', securityRoutes);

// Mount Route Versioning Aliases
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/receptionist', receptionistRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/guest', guestRoutes);
app.use('/api/v1/super-admin', superAdminRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/security', securityRoutes);

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
