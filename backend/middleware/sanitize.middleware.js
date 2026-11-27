/**
 * Input Sanitization, NoSQL Injection Defense, XSS Neutralization,
 * Prototype Pollution Protection & HPP Guard
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Keys that legitimately hold URLs or image data URIs (still validated against XSS schemes)
const IMAGE_OR_URL_KEYS = new Set([
  'avatar',
  'iddocimage',
  'logo',
  'image',
  'url',
  'locationmap',
  'website',
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
]);

const XSS_PATTERNS = [
  /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
  /<\s*\/\s*script\s*>/gi,
  /<\s*script\b[^>]*>/gi,
  /<\s*iframe\b[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi,
  /<\s*object\b[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi,
  /<\s*embed\b[^>]*>/gi,
  /\bon[a-z]+\s*=\s*(['"])[\s\S]*?\1/gi,
  /\bon[a-z]+\s*=\s*[^\s>]+/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
];

const SAFE_IMAGE_DATA_URI = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;

export function sanitizeStringValue(value, keyName = '') {
  if (typeof value !== 'string') return value;

  const lowerKey = String(keyName || '').toLowerCase();

  // Do not alter passwords/tokens/OTPs (they are hashed/verified verbatim)
  if (
    lowerKey === 'password' ||
    lowerKey === 'newpassword' ||
    lowerKey === 'currentpassword' ||
    lowerKey === 'refreshtoken' ||
    lowerKey === 'token'
  ) {
    return value;
  }

  // Validate image data URIs strictly (reject SVG/HTML data URIs that allow XSS)
  if (value.startsWith('data:')) {
    if (IMAGE_OR_URL_KEYS.has(lowerKey) && SAFE_IMAGE_DATA_URI.test(value.trim())) {
      return value.trim();
    }
    return '';
  }

  let cleaned = value;
  for (const pattern of XSS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Neutralize dangerous SVG/HTML tags in general text inputs
  if (!IMAGE_OR_URL_KEYS.has(lowerKey)) {
    cleaned = cleaned.replace(/<\s*svg\b[^>]*>[\s\S]*?<\s*\/\s*svg\s*>/gi, '');
  }

  return cleaned;
}

export function sanitizeValue(value, keyName = '', stats = { nosqlKeysRemoved: [], xssNeutralized: false }, depth = 0) {
  if (depth > 15 || value === null || value === undefined) return value;

  if (typeof value === 'string') {
    const sanitized = sanitizeStringValue(value, keyName);
    if (sanitized !== value) {
      stats.xssNeutralized = true;
    }
    return sanitized;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, keyName, stats, depth + 1));
  }

  const sanitizedObj = {};
  for (const [k, v] of Object.entries(value)) {
    // Reject prototype pollution and MongoDB operator / dot-notation injection keys
    if (FORBIDDEN_KEYS.has(k) || k.startsWith('$') || k.includes('.')) {
      stats.nosqlKeysRemoved.push(k);
      continue;
    }
    sanitizedObj[k] = sanitizeValue(v, k, stats, depth + 1);
  }
  return sanitizedObj;
}

/**
 * Express middleware that sanitizes req.body, req.query, and req.params against
 * NoSQL operator injection, prototype pollution, XSS payloads, and query HPP.
 */
export const sanitizeInputs = (onSuspiciousProbe) => (req, res, next) => {
  // Skip raw webhook bodies (HMAC verified raw Buffer)
  if (Buffer.isBuffer(req.body)) {
    return next();
  }

  const stats = { nosqlKeysRemoved: [], xssNeutralized: false };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body, '', stats);
  }

  if (req.query && typeof req.query === 'object') {
    const cleanQuery = sanitizeValue(req.query, '', stats);
    // Basic HPP defense: collapse duplicate scalar query params to the last string value
    for (const [k, v] of Object.entries(cleanQuery)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[v.length - 1] === 'string') {
        cleanQuery[k] = v[v.length - 1];
      }
    }
    req.query = cleanQuery;
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params, '', stats);
  }

  if ((stats.nosqlKeysRemoved.length > 0 || stats.xssNeutralized) && typeof onSuspiciousProbe === 'function') {
    onSuspiciousProbe(req, stats);
  }

  next();
};

export default sanitizeInputs;

