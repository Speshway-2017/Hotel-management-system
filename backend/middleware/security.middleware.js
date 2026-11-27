import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

/**
 * Builds the validated origin allowlist for both Express CORS and Socket.io CORS.
 */
export function getAllowedOrigins() {
  const isProd = process.env.NODE_ENV === 'production';
  const configured = new Set();

  if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').forEach((o) => {
      const clean = o.trim().replace(/\/+$/, '');
      if (clean) configured.add(clean);
    });
  }
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
      const clean = o.trim().replace(/\/+$/, '');
      if (clean) configured.add(clean);
    });
  }
  if (process.env.FRONTEND_URL) {
    configured.add(process.env.FRONTEND_URL.trim().replace(/\/+$/, ''));
  }

  return { isProd, configured };
}

export function isOriginAllowed(origin) {
  // Native mobile apps (Flutter), desktop (Electron file:// or no origin), curl/webhooks have no browser Origin
  if (!origin) return true;
  if (origin === 'file://' || origin.startsWith('app://')) return true;

  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  const { isProd, configured } = getAllowedOrigins();

  if (configured.has(cleanOrigin)) return true;

  // Allow localhost / LAN origins during development & desktop local Vite hosting
  const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleanOrigin);
  if (isLoopback && (!isProd || process.env.ALLOW_LOCALHOST_CORS !== 'false')) {
    return true;
  }

  if (!isProd) {
    const isPrivateLan = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(cleanOrigin);
    if (isPrivateLan) return true;
  }

  return false;
}

/**
 * Environment-aware Helmet.js + Content Security Policy (CSP) middleware.
 * Supports Razorpay, Firebase, Cloudinary, Google Maps, Socket.io, and Google Fonts.
 */
export function createHelmetMiddleware() {
  const isProd = process.env.NODE_ENV === 'production';
  const { configured } = getAllowedOrigins();

  const connectSrc = new Set([
    "'self'",
    'https://api.razorpay.com',
    'https://lumberjack.razorpay.com',
    'https://checkout.razorpay.com',
    'https://*.razorpay.com',
    'https://res.cloudinary.com',
    'https://*.googleapis.com',
    'https://maps.googleapis.com',
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://fcm.googleapis.com',
    'https://firebaseinstallations.googleapis.com',
  ]);

  for (const origin of configured) {
    connectSrc.add(origin);
    if (origin.startsWith('https://')) {
      connectSrc.add(origin.replace(/^https:/, 'wss:'));
    } else if (origin.startsWith('http://')) {
      connectSrc.add(origin.replace(/^http:/, 'ws:'));
    }
  }

  if (!isProd) {
    connectSrc.add('http://localhost:*');
    connectSrc.add('ws://localhost:*');
    connectSrc.add('http://127.0.0.1:*');
    connectSrc.add('ws://127.0.0.1:*');
  }

  const scriptSrc = [
    "'self'",
    'https://checkout.razorpay.com',
    'https://api.razorpay.com',
    'https://www.gstatic.com',
    'https://apis.google.com',
    'https://*.firebaseapp.com',
    'https://maps.googleapis.com',
    'https://maps.gstatic.com',
  ];

  // Vite HMR & React Refresh preamble use inline scripts in dev only
  if (!isProd) {
    scriptSrc.push("'unsafe-inline'");
  }

  const directives = {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'self'"],
    formAction: ["'self'"],
    scriptSrc,
    scriptSrcAttr: ["'none'"],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ],
    fontSrc: [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https://res.cloudinary.com',
      'https://images.unsplash.com',
      'https://maps.gstatic.com',
      'https://maps.googleapis.com',
      'https://*.googleusercontent.com',
      'https://checkout.razorpay.com',
    ],
    connectSrc: Array.from(connectSrc),
    frameSrc: [
      "'self'",
      'https://api.razorpay.com',
      'https://checkout.razorpay.com',
      'https://*.firebaseapp.com',
      'https://maps.google.com',
      'https://www.google.com',
    ],
    workerSrc: ["'self'", 'blob:'],
    manifestSrc: ["'self'"],
    reportUri: ['/api/v1/security/csp-report'],
    ...(isProd && process.env.ALLOW_INSECURE_HTTP !== 'true'
      ? { upgradeInsecureRequests: [] }
      : {}),
  };

  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // needed for Razorpay/Firebase popups
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'sameorigin' },
    hidePoweredBy: true,
    hsts: isProd
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

/**
 * Enforces HTTPS in production (when behind TLS proxy / load balancer).
 */
export function enforceHttps(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd || process.env.ALLOW_INSECURE_HTTP === 'true') {
    return next();
  }
  const host = req.hostname || '';
  if (host === 'localhost' || host === '127.0.0.1') {
    return next();
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (req.secure || forwardedProto === 'https') {
    return next();
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  return res.status(403).json({
    success: false,
    message: 'HTTPS is required for all API requests in production.',
  });
}

/**
 * Sets CSRF token cookie for web clients and validates double-submit token / Origin
 * on cookie-authenticated endpoints.
 */
export function csrfProtection(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const existingCookieToken = req.cookies?.['XSRF-TOKEN'];

  if (!existingCookieToken) {
    const newToken = crypto.randomBytes(24).toString('hex');
    res.cookie('XSRF-TOKEN', newToken, {
      httpOnly: false,
      sameSite: isProd ? 'strict' : 'lax',
      secure: isProd && process.env.ALLOW_INSECURE_HTTP !== 'true',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  // Only enforce CSRF check on state-changing requests that rely on cookies (no Bearer header)
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method)) {
    return next();
  }

  // Webhook endpoints use cryptographic HMAC signatures instead of CSRF tokens
  if (req.originalUrl.includes('/razorpay/webhook') || req.originalUrl.includes('/csp-report')) {
    return next();
  }

  // Requests using Authorization: Bearer <jwt> are immune to browser CSRF
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  // If a browser sends an auth cookie (e.g. hms_refresh_token), require Origin allowlist + CSRF header
  const hasRefreshCookie = Boolean(req.cookies?.hms_refresh_token);
  if (hasRefreshCookie) {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({ success: false, message: 'Forbidden origin (CSRF check)' });
    }
    const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    if (!existingCookieToken || !headerToken || headerToken !== existingCookieToken) {
      return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
    }
  }

  return next();
}

export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/health' || req.path === '/api/v1/health',
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down and try again shortly.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 25),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_OTP_MAX || 12),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 15 minutes before requesting another code.',
  },
});

export const paymentRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PAYMENT_MAX || 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests detected. Please try again in a few minutes.',
  },
});

export default {
  getAllowedOrigins,
  isOriginAllowed,
  createHelmetMiddleware,
  enforceHttps,
  csrfProtection,
  globalApiLimiter,
  authRateLimiter,
  otpRateLimiter,
  paymentRateLimiter,
};

