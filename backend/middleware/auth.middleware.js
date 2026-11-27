import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Property from '../models/property.model.js';
import Session from '../models/session.model.js';
import { verifyAccessToken } from '../utils/tokenManager.js';
import { recordSecurityEvent } from '../services/securityMonitor.service.js';

const userCache = new Map();

export const clearUserCache = (userIdOrEmail) => {
  if (userIdOrEmail) {
    const key = String(userIdOrEmail).toLowerCase().trim();
    userCache.delete(key);
    for (const [k, v] of userCache.entries()) {
      if (
        String(v?.user?._id) === key ||
        String(v?.user?.id) === key ||
        (v?.user?.email && v.user.email.toLowerCase().trim() === key)
      ) {
        userCache.delete(k);
      }
    }
  } else {
    userCache.clear();
  }
};

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.authPayload = decoded;

      // If token carries a session ID, verify session has not been revoked
      if (decoded.sid) {
        const activeSession = await Session.findOne({ sessionId: decoded.sid });
        if (!activeSession || activeSession.revokedAt) {
          await recordSecurityEvent({
            type: 'REVOKED_SESSION_ACCESS',
            severity: 'medium',
            req,
            details: `Attempted access using revoked or missing session (${decoded.sid})`
          });
          return res.status(401).json({ success: false, message: 'Session expired or revoked. Please log in again.' });
        }
      }

      const cacheKey = String(decoded.id || decoded.email || '');
      const cached = userCache.get(cacheKey);
      let user = null;

      if (cached && (Date.now() - cached.timestamp < 30000)) {
        user = cached.user;
      } else {
        if (decoded.id) {
          try { user = await User.findById(decoded.id).select('-password -otp -otpExpires -idDocNumberEncrypted'); } catch (_) {}
        }
        if (!user && decoded.id) {
          try {
            user = await User.findOne({ $or: [{ _id: String(decoded.id) }, { id: String(decoded.id) }] })
              .select('-password -otp -otpExpires -idDocNumberEncrypted');
          } catch (_) {}
        }
        if (!user && decoded.email) {
          try {
            user = await User.findOne({ email: String(decoded.email).toLowerCase().trim() })
              .select('-password -otp -otpExpires -idDocNumberEncrypted');
          } catch (_) {}
        }
        if (user) {
          userCache.set(cacheKey, { user, timestamp: Date.now() });
        }
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      if (user.status !== 'Active') {
        clearUserCache(user._id || user.id);
        return res.status(403).json({ success: false, message: 'Your account is suspended. Access denied.' });
      }

      if (decoded.tv !== undefined && Number(user.tokenVersion || 0) !== Number(decoded.tv || 0)) {
        clearUserCache(user._id || user.id);
        return res.status(401).json({ success: false, message: 'Session invalidated. Please log in again.' });
      }

      req.user = user;
      return next();
    } catch (error) {
      await recordSecurityEvent({
        type: 'TOKEN_MANIPULATION_OR_INVALID',
        severity: 'medium',
        req,
        details: `JWT verification failed: ${error.message}`
      });
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ success: false, message: 'Not authorized, no token' });
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      recordSecurityEvent({
        type: 'PRIVILEGE_ESCALATION_ATTEMPT',
        severity: 'high',
        req,
        user: req.user,
        details: `Role (${req.user ? req.user.role : 'none'}) attempted unauthorized access to ${req.method} ${req.originalUrl}`,
        notifyAdmins: true
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        message: `Role (${req.user ? req.user.role : 'none'}) is not authorized to access this resource`
      });
    }
    next();
  };
};

export const checkPropertyStatus = async (req, res, next) => {
  if (!req.user || req.user.role === 'super-admin') {
    return next();
  }

  if (!req.user.propertyId) {
    if (req.user.role === 'admin') {
      req.user.propertyId = 'HS-9HQ8P';
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied: No property assigned to this user.'
      });
    }
  }

  try {
    const property = await Property.findById(req.user.propertyId);
    if (!property) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Assigned property not found.'
      });
    }
    if (property.status === 'Suspended' || property.status === 'Rejected') {
      return res.status(403).json({
        success: false,
        message: `Property access restricted (status: ${property.status}).`
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error validating property status' });
  }
};

// Enforce property-level authorization for bookings, rooms, rates, etc.
export const checkPropertyAccess = (req, res, next) => {
  const propertyId = req.query.propertyId || req.params.propertyId || req.body?.propertyId || req.headers['x-property-id'];

  if (!propertyId || propertyId === 'all') {
    if (req.user.role === 'super-admin') {
      return next();
    }
    if (propertyId === 'all') {
      recordSecurityEvent({
        type: 'CROSS_PROPERTY_ACCESS_ATTEMPT',
        severity: 'high',
        req,
        user: req.user,
        details: `User (${req.user.role}) attempted global 'all' property query without super-admin privilege`
      }).catch(() => {});
      return res.status(403).json({
        success: false,
        message: 'Access denied: Global cross-property access requires Super Admin privileges.'
      });
    }
    req.query.propertyId = req.user.propertyId;
    return next();
  }

  if (req.user.role === 'super-admin') {
    return next();
  }

  if (req.user.propertyId && req.user.propertyId.toString() === propertyId.toString()) {
    return next();
  }

  recordSecurityEvent({
    type: 'CROSS_PROPERTY_ACCESS_ATTEMPT',
    severity: 'high',
    req,
    user: req.user,
    details: `User assigned to ${req.user.propertyId} attempted to access property ${propertyId}`,
    notifyAdmins: true
  }).catch(() => {});

  return res.status(403).json({
    success: false,
    message: 'Access denied: You do not have permissions to access data for this property.'
  });
};
