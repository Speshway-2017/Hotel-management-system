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
import { purgeGuestAccountDeletionNotifications } from './utils/notification.helper.js';
import { initializeFirebaseAdmin } from './config/firebase.config.js';

import { Server } from 'socket.io';
import { startAutoCheckoutScheduler } from './services/autoCheckout.service.js';
import { isOriginAllowed } from './middleware/security.middleware.js';
import { verifyAccessToken } from './utils/tokenManager.js';
import User from './models/user.model.js';
import { recordSecurityEvent } from './services/securityMonitor.service.js';
import { redactSensitiveData } from './utils/logger.js';

const STAFF_ROLES = new Set(['super-admin', 'admin', 'manager', 'receptionist']);

const startServer = async () => {
  await connectDB();
  initializeFirebaseAdmin();
  await seedUsers();
  await purgeGuestAccountDeletionNotifications();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error('Socket CORS origin denied'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
  });

  // Socket.io JWT Authentication Middleware
  io.use(async (socket, next) => {
    const authToken =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!authToken) {
      // Allow public availability channel only, with zero operational room permissions
      socket.isPublicAnonymous = true;
      socket.user = null;
      return next();
    }

    try {
      const decoded = verifyAccessToken(authToken);
      const user = await User.findById(decoded.id).select('-password -otp -otpExpires -idDocNumberEncrypted');
      if (!user || user.status !== 'Active') {
        return next(new Error('Unauthorized socket account'));
      }
      if (decoded.tv !== undefined && Number(user.tokenVersion || 0) !== Number(decoded.tv || 0)) {
        return next(new Error('Session invalidated'));
      }
      socket.user = {
        id: String(user._id || user.id),
        email: user.email,
        role: user.role,
        propertyId: user.propertyId || null
      };
      socket.isPublicAnonymous = false;
      return next();
    } catch (err) {
      await recordSecurityEvent({
        type: 'SOCKET_AUTH_FAILED',
        severity: 'medium',
        details: `Rejected Socket.io connection with invalid token: ${err.message}`,
        metadata: { ip: socket.handshake.address }
      });
      return next(new Error('Invalid socket authentication token'));
    }
  });

  app.set('socketio', io);
  startAutoCheckoutScheduler(io, 30000);

  io.on('connection', (socket) => {
    if (socket.user) {
      // Automatically bind user to their personal authenticated channel
      socket.join(`user_${socket.user.id}`);
    }

    // Join property-specific room with strict RBAC & property ownership checks
    socket.on('join_property', (propertyId) => {
      if (!socket.user) {
        socket.emit('security_error', { message: 'Authentication required to join property rooms' });
        return;
      }
      if (!propertyId) return;

      const cleanProp = String(propertyId).replace(/^property_/, '').trim();
      const role = socket.user.role;

      if (role === 'guest') {
        // Guests may only listen to their personal user_${id} room; never property operational rooms
        socket.join(`user_${socket.user.id}`);
        return;
      }

      if (role === 'super-admin') {
        if (cleanProp === 'all' || cleanProp === 'global') {
          socket.join('property_all');
        } else {
          socket.join(`property_${cleanProp}`);
        }
        return;
      }

      // Admin / Manager / Receptionist: strictly bound to their assigned propertyId
      const userProp = String(socket.user.propertyId || '').trim();
      if (cleanProp === 'all' || cleanProp === 'global' || (userProp && cleanProp !== userProp)) {
        recordSecurityEvent({
          type: 'UNAUTHORIZED_SOCKET_ROOM_ACCESS',
          severity: 'high',
          user: socket.user,
          details: `Staff (${role}) assigned to ${userProp} attempted to join room ${cleanProp}`,
          metadata: { ip: socket.handshake.address },
          notifyAdmins: true
        }).catch(() => {});
        socket.emit('security_error', { message: 'Access denied for requested property room' });
        return;
      }

      socket.join(`property_${userProp || cleanProp}`);
    });

    socket.on('leave_property', (propertyId) => {
      if (propertyId) {
        const cleanProp = String(propertyId).replace(/^property_/, '');
        socket.leave(`property_${cleanProp}`);
      }
    });

    // Scoped client-to-server relay: strictly restricted to authenticated staff within their property
    const relayEvents = [
      'booking_updated',
      'booking_created',
      'booking_deleted',
      'room_status_changed',
      'room_created',
      'room_updated',
      'room_deleted',
      'availability_changed',
      'checkin_completed',
      'checkout_completed',
      'payment_logged',
      'payment_added',
      'payment_updated',
      'guest_updated',
      'dashboard_sync'
    ];

    relayEvents.forEach((evt) => {
      socket.on(evt, (payload = {}) => {
        if (!socket.user || !STAFF_ROLES.has(socket.user.role)) {
          recordSecurityEvent({
            type: 'UNAUTHORIZED_SOCKET_EMIT',
            severity: 'high',
            user: socket.user,
            details: `Unauthorized socket emit '${evt}' blocked`,
            metadata: { ip: socket.handshake.address }
          }).catch(() => {});
          return;
        }

        const safePayload = redactSensitiveData(payload);
        const requestedProp = safePayload.propertyId || socket.user.propertyId;

        if (socket.user.role !== 'super-admin' && socket.user.propertyId && requestedProp !== socket.user.propertyId) {
          return;
        }

        if (requestedProp) {
          socket.to(`property_${requestedProp}`).emit(evt, safePayload);
        }
        socket.to('property_all').emit(evt, safePayload);
      });
    });

    socket.on('disconnect', () => {});
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      process.exit(0);
    } else {
      console.error('❌ Server error:', err.message);
      process.exit(1);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏨 Hour Stay HMS Backend Server running on 0.0.0.0:${PORT} with hardened security & Socket.io enabled`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`🔌 Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.once('SIGUSR2', () => {
    server.close(() => {
      process.exit(0);
    });
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start HMS server:', err.message);
  process.exit(1);
});
