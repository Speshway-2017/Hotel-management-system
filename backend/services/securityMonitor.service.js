import { SecurityEvent, BlockedEntity } from '../models/securityEvent.model.js';
import AuditLog from '../models/auditLog.model.js';
import Notification from '../models/notification.model.js';
import { maskEmail, redactSensitiveData, redactString, safeLog } from '../utils/logger.js';

const failedAttemptTracker = new Map(); // key -> { count, firstAttemptAt }
const trafficTracker = new Map(); // ip -> { count, windowStart }

const MAX_FAILED_LOGINS = Number(process.env.AUTH_MAX_FAILED_ATTEMPTS || 5);
const MAX_IP_FAILED_LOGINS = Number(process.env.AUTH_MAX_IP_FAILED_ATTEMPTS || 15);
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

export function getClientIp(req) {
  const fwd = req?.headers?.['x-forwarded-for'];
  if (fwd && typeof fwd === 'string') {
    return fwd.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
}

export async function recordSecurityEvent({
  type,
  severity = 'medium',
  req = null,
  user = null,
  userEmail = '',
  details = '',
  metadata = {},
  notifyAdmins = false
}) {
  const ip = req ? getClientIp(req) : (metadata.ip || '127.0.0.1');
  const safeEmail = user?.email || userEmail || '';
  const maskedEmail = safeEmail ? maskEmail(safeEmail) : '';
  const safeDetails = redactString(details);
  const safeMeta = redactSensitiveData(metadata);

  safeLog(severity === 'critical' || severity === 'high' ? 'warn' : 'info', `[SECURITY:${type}] ${safeDetails}`, {
    severity,
    ip,
    user: maskedEmail || undefined,
    path: req?.originalUrl
  });

  try {
    await SecurityEvent.create({
      type,
      severity,
      userId: user ? String(user._id || user.id || '') : null,
      userEmail: maskedEmail,
      role: user?.role || '',
      propertyId: user?.propertyId || safeMeta?.propertyId || null,
      ip,
      method: req?.method || '',
      path: req?.originalUrl || '',
      details: safeDetails,
      metadata: safeMeta
    });

    await AuditLog.create({
      user: maskedEmail || 'anonymous',
      role: user?.role || 'system',
      action: `Security: ${type}`,
      module: 'Security',
      property: user?.propertyId || 'Global',
      description: safeDetails,
      status: severity === 'high' || severity === 'critical' ? 'Alert' : 'Logged',
      entity: req?.originalUrl || type,
      ip
    });

    if (notifyAdmins) {
      await Notification.create({
        role: 'super-admin',
        propertyId: user?.propertyId || 'HS-9HQ8P',
        title: `Security Alert: ${type}`,
        message: `${safeDetails} (IP: ${ip})`,
        category: 'Security Warning',
        isRead: false
      }).catch(() => {});
    }
  } catch (err) {
    safeLog('error', 'Failed to persist security event', { message: err.message });
  }
}

export async function checkEntityBlocked(req, email = '') {
  const ip = getClientIp(req);
  const ipBlock = await BlockedEntity.findActive('ip', ip);
  if (ipBlock) {
    return { blocked: true, reason: ipBlock.reason, until: ipBlock.blockedUntil, entityType: 'ip' };
  }
  if (email) {
    const emailBlock = await BlockedEntity.findActive('email', email);
    if (emailBlock) {
      return { blocked: true, reason: emailBlock.reason, until: emailBlock.blockedUntil, entityType: 'email' };
    }
  }
  return { blocked: false };
}

export async function registerFailedAuthAttempt(req, email = '', reason = 'Invalid credentials') {
  const ip = getClientIp(req);
  const now = Date.now();
  const keys = [`ip:${ip}`];
  if (email) keys.push(`email:${String(email).toLowerCase().trim()}`);

  let locked = false;
  for (const key of keys) {
    const isIpKey = key.startsWith('ip:');
    const threshold = isIpKey ? MAX_IP_FAILED_LOGINS : MAX_FAILED_LOGINS;
    const entry = failedAttemptTracker.get(key);
    if (!entry || now - entry.firstAttemptAt > LOCKOUT_WINDOW_MS) {
      failedAttemptTracker.set(key, { count: 1, firstAttemptAt: now });
    } else {
      entry.count += 1;
      failedAttemptTracker.set(key, entry);
      if (entry.count >= threshold) {
        locked = true;
        const [entityType, entityValue] = key.split(/:(.+)/);
        await BlockedEntity.block({
          entityType,
          entityValue,
          reason: `Temporary lockout after ${entry.count} failed auth attempts (${reason})`,
          durationMs: BLOCK_DURATION_MS,
          attempts: entry.count
        });
      }
    }
  }

  await recordSecurityEvent({
    type: locked ? 'BRUTE_FORCE_LOCKOUT' : 'FAILED_LOGIN_ATTEMPT',
    severity: locked ? 'high' : 'medium',
    req,
    userEmail: email,
    details: locked
      ? `Account/IP temporarily blocked for 15 minutes after repeated failed attempts: ${reason}`
      : `Failed authentication attempt: ${reason}`,
    notifyAdmins: locked
  });

  return { locked };
}

export function clearFailedAuthAttempts(req, email = '') {
  const ip = getClientIp(req);
  failedAttemptTracker.delete(`ip:${ip}`);
  if (email) {
    failedAttemptTracker.delete(`email:${String(email).toLowerCase().trim()}`);
  }
}

export function blockCheckMiddleware(req, res, next) {
  if (req.path === '/health' || req.path === '/api/health' || req.path === '/api/v1/health') {
    return next();
  }
  const ip = getClientIp(req);

  // Abnormal burst traffic detection (>150 req in 10s per IP)
  const now = Date.now();
  const traffic = trafficTracker.get(ip);
  if (!traffic || now - traffic.windowStart > 10000) {
    trafficTracker.set(ip, { count: 1, windowStart: now });
  } else {
    traffic.count += 1;
    if (traffic.count === 150) {
      recordSecurityEvent({
        type: 'ABNORMAL_API_TRAFFIC',
        severity: 'high',
        req,
        details: `Abnormal traffic spike detected (${traffic.count} requests in 10s)`,
        notifyAdmins: true
      }).catch(() => {});
    }
  }

  BlockedEntity.findActive('ip', ip)
    .then((block) => {
      if (block) {
        return res.status(429).json({
          success: false,
          message: 'Access temporarily restricted due to suspicious activity. Please try again later or contact support.',
          retryAfter: block.blockedUntil
        });
      }
      return next();
    })
    .catch(() => next());
}

export default {
  getClientIp,
  recordSecurityEvent,
  checkEntityBlocked,
  registerFailedAuthAttempt,
  clearFailedAuthAttempts,
  blockCheckMiddleware
};
