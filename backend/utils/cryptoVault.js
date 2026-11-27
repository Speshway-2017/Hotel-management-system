import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

/**
 * Derives a deterministic 32-byte AES-256 key from configured environment secrets.
 * Never embeds hardcoded encryption keys.
 */
function getEncryptionKey() {
  const rawKey = process.env.AADHAAR_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!rawKey) {
    throw new Error('Encryption secret missing: configure AADHAAR_ENCRYPTION_KEY or JWT_SECRET.');
  }
  return crypto.createHash('sha256').update(`hourstay-vault:${rawKey}`).digest();
}

export function isEncryptedValue(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptSensitive(plaintext) {
  if (plaintext === undefined || plaintext === null || plaintext === '') return '';
  const str = String(plaintext);
  if (isEncryptedValue(str)) return str;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSensitive(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return '';
  if (!isEncryptedValue(ciphertext)) return ciphertext;

  try {
    const payload = ciphertext.slice(PREFIX.length);
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) return '';

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function hashSensitiveToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function hmacSensitiveIdentifier(value) {
  if (!value) return '';
  const secret = process.env.AADHAAR_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
}

export function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default {
  encryptSensitive,
  decryptSensitive,
  isEncryptedValue,
  hashSensitiveToken,
  hmacSensitiveIdentifier,
  timingSafeEqualStr,
};

