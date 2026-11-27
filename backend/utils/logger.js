/**
 * Secure Logger & Sensitive Data Redactor
 * Guarantees passwords, JWTs, API secrets, Razorpay keys, and Aadhaar numbers
 * are never written in plaintext to application logs or audit trails.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'set-cookie',
  'jwt',
  'jwt_secret',
  'jwt_refresh_secret',
  'secret',
  'apisecret',
  'api_secret',
  'apikey',
  'api_key',
  'razorpay_signature',
  'razorpay_key_secret',
  'razorpay_webhook_secret',
  'x-razorpay-signature',
  'otp',
  'private_key',
  'aadhaar',
  'aadhar',
  'aadhaarnumber',
  'aadharnumber',
  'verifiedaadhaar',
  'iddocnumber',
  'idproofnumber',
  'accountnumber',
  'fcmtoken',
  'fcmtokens',
]);

const JWT_REGEX = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const AADHAAR_REGEX = /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g;

export function maskAadhaarText(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `•••• •••• ${digits.slice(-4)}`;
}

export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `**@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(5, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

export function redactString(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(BEARER_REGEX, 'Bearer [REDACTED]')
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(AADHAAR_REGEX, (match) => maskAadhaarText(match));
}

export function redactSensitiveData(value, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return redactString(value);
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1));
  }

  const plain = typeof value.toObject === 'function' ? value.toObject() : value;
  const output = {};
  for (const [key, val] of Object.entries(plain)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      if (lowerKey.includes('aadhaar') || lowerKey.includes('aadhar') || lowerKey.includes('iddocnumber') || lowerKey.includes('idproofnumber')) {
        output[key] = val ? maskAadhaarText(val) : '';
      } else {
        output[key] = '[REDACTED]';
      }
      continue;
    }
    output[key] = redactSensitiveData(val, depth + 1);
  }
  return output;
}

export function safeLog(level = 'info', message = '', meta = undefined) {
  const safeMsg = redactString(String(message));
  const safeMeta = meta !== undefined ? redactSensitiveData(meta) : undefined;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (safeMeta !== undefined) {
    fn(`[HMS:${level.toUpperCase()}] ${safeMsg}`, safeMeta);
  } else {
    fn(`[HMS:${level.toUpperCase()}] ${safeMsg}`);
  }
}

export default {
  redactSensitiveData,
  redactString,
  maskAadhaarText,
  maskEmail,
  safeLog,
};

