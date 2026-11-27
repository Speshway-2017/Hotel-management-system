import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session, { markAccessJtiRevoked, isAccessJtiRevoked } from '../models/session.model.js';
import { hashSensitiveToken } from './cryptoVault.js';
import { getClientIp, recordSecurityEvent } from '../services/securityMonitor.service.js';

const ISSUER = 'hourstay-hms';
const AUDIENCE = 'hourstay-clients';

export function getAccessSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}

export function getRefreshSecret() {
  if (process.env.JWT_REFRESH_SECRET) {
    return process.env.JWT_REFRESH_SECRET;
  }
  // Distinct derived key when separate JWT_REFRESH_SECRET is not provided
  return crypto.createHash('sha256').update(`refresh:${getAccessSecret()}`).digest('hex');
}

export function getAccessExpiry() {
  return process.env.JWT_ACCESS_EXPIRES_IN || (process.env.NODE_ENV === 'production' ? '15m' : '1h');
}

export function getRefreshExpiryDays() {
  const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7);
  return Number.isFinite(days) && days > 0 ? days : 7;
}

export function signAccessToken({ user, sessionId, jti }) {
  const userId = String(user._id || user.id);
  const payload = {
    id: userId,
    email: user.email,
    role: user.role,
    propertyId: user.propertyId || null,
    tv: Number(user.tokenVersion || 0),
    sid: sessionId,
    jti: jti || crypto.randomUUID(),
    typ: 'access'
  };
  return jwt.sign(payload, getAccessSecret(), {
    algorithm: 'HS256',
    expiresIn: getAccessExpiry(),
    issuer: ISSUER,
    audience: AUDIENCE
  });
}

export function signRefreshToken({ user, sessionId, tokenFamilyId, jti }) {
  const userId = String(user._id || user.id);
  const payload = {
    id: userId,
    sid: sessionId,
    fid: tokenFamilyId,
    tv: Number(user.tokenVersion || 0),
    jti: jti || crypto.randomUUID(),
    typ: 'refresh'
  };
  return jwt.sign(payload, getRefreshSecret(), {
    algorithm: 'HS256',
    expiresIn: `${getRefreshExpiryDays()}d`,
    issuer: ISSUER,
    audience: AUDIENCE
  });
}

export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, getAccessSecret(), {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE
  });
  if (decoded.typ && decoded.typ !== 'access') {
    throw new Error('Invalid token type');
  }
  if (decoded.jti && isAccessJtiRevoked(decoded.jti)) {
    throw new Error('Token has been revoked');
  }
  return decoded;
}

export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, getRefreshSecret(), {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE
  });
  if (decoded.typ !== 'refresh') {
    throw new Error('Invalid refresh token type');
  }
  return decoded;
}

export async function createAuthSession({ user, req, platform = 'web' }) {
  const sessionId = crypto.randomUUID();
  const tokenFamilyId = crypto.randomUUID();
  const accessJti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ user, sessionId, tokenFamilyId });
  const accessToken = signAccessToken({ user, sessionId, jti: accessJti });
  const expiresAt = new Date(Date.now() + getRefreshExpiryDays() * 24 * 60 * 60 * 1000);

  await Session.create({
    sessionId,
    userId: String(user._id || user.id),
    role: user.role,
    propertyId: user.propertyId || null,
    tokenFamilyId,
    refreshTokenHash: hashSensitiveToken(refreshToken),
    previousRefreshTokenHash: null,
    currentAccessJti: accessJti,
    ip: req ? getClientIp(req) : '127.0.0.1',
    userAgent: req?.headers?.['user-agent'] || '',
    platform,
    lastUsedAt: new Date(),
    expiresAt,
    revokedAt: null
  });

  return { accessToken, refreshToken, sessionId, tokenFamilyId, expiresAt };
}

export async function rotateRefreshSession({ refreshToken, userLookupFn, req }) {
  const decoded = verifyRefreshToken(refreshToken);
  const tokenHash = hashSensitiveToken(refreshToken);
  const session = await Session.findOne({ sessionId: decoded.sid });

  if (!session) {
    throw new Error('Session not found');
  }

  // Reuse detection: if an already-rotated or revoked refresh token is replayed, revoke entire token family!
  if (session.revokedAt || (session.refreshTokenHash !== tokenHash && session.previousRefreshTokenHash === tokenHash) || session.refreshTokenHash !== tokenHash) {
    await Session.updateMany(
      { tokenFamilyId: session.tokenFamilyId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'Refresh token reuse detected' } }
    );
    await recordSecurityEvent({
      type: 'TOKEN_REUSE_DETECTED',
      severity: 'critical',
      req,
      details: `Refresh token reuse or tampering detected for session ${session.sessionId}; token family revoked.`,
      metadata: { sessionId: session.sessionId, userId: session.userId },
      notifyAdmins: true
    });
    throw new Error('Refresh token reuse detected; session revoked');
  }

  if (new Date(session.expiresAt) <= new Date()) {
    await Session.findOneAndUpdate(
      { sessionId: session.sessionId },
      { $set: { revokedAt: new Date(), revokedReason: 'Expired' } }
    );
    throw new Error('Refresh session expired');
  }

  const user = await userLookupFn(decoded.id);
  if (!user || user.status !== 'Active') {
    await Session.findOneAndUpdate(
      { sessionId: session.sessionId },
      { $set: { revokedAt: new Date(), revokedReason: 'User inactive' } }
    );
    throw new Error('Account is inactive or not found');
  }

  if (Number(user.tokenVersion || 0) !== Number(decoded.tv || 0)) {
    await Session.findOneAndUpdate(
      { sessionId: session.sessionId },
      { $set: { revokedAt: new Date(), revokedReason: 'Token version invalidated' } }
    );
    throw new Error('Session invalidated due to password or security change');
  }

  const newAccessJti = crypto.randomUUID();
  const newAccessToken = signAccessToken({ user, sessionId: session.sessionId, jti: newAccessJti });
  const newRefreshToken = signRefreshToken({ user, sessionId: session.sessionId, tokenFamilyId: session.tokenFamilyId });

  await Session.findOneAndUpdate(
    { sessionId: session.sessionId },
    {
      $set: {
        previousRefreshTokenHash: tokenHash,
        refreshTokenHash: hashSensitiveToken(newRefreshToken),
        currentAccessJti: newAccessJti,
        lastUsedAt: new Date(),
        ip: req ? getClientIp(req) : session.ip
      }
    }
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user, sessionId: session.sessionId };
}

export async function revokeSessionByAccessPayload(decoded, reason = 'User logout') {
  if (!decoded) return;
  if (decoded.jti) {
    const expMs = decoded.exp ? decoded.exp * 1000 : Date.now() + 3600000;
    markAccessJtiRevoked(decoded.jti, expMs);
  }
  if (decoded.sid) {
    await Session.findOneAndUpdate(
      { sessionId: decoded.sid },
      { $set: { revokedAt: new Date(), revokedReason: reason } }
    );
  }
}

export async function revokeAllUserSessions(userId, reason = 'Security reset') {
  if (!userId) return;
  const sessions = await Session.find({ userId: String(userId), revokedAt: null });
  for (const s of sessions) {
    if (s.currentAccessJti) {
      markAccessJtiRevoked(s.currentAccessJti, Date.now() + 3600000);
    }
  }
  await Session.updateMany(
    { userId: String(userId), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
}

export function setRefreshCookie(res, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('hms_refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: isProd ? 'strict' : 'lax',
    secure: isProd && process.env.ALLOW_INSECURE_HTTP !== 'true',
    path: '/api',
    maxAge: getRefreshExpiryDays() * 24 * 60 * 60 * 1000
  });
}

export function clearRefreshCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('hms_refresh_token', {
    httpOnly: true,
    sameSite: isProd ? 'strict' : 'lax',
    secure: isProd && process.env.ALLOW_INSECURE_HTTP !== 'true',
    path: '/api'
  });
}

