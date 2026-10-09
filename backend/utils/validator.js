/**
 * Server-Side Backend Validation Suite
 * Enforces critical validation on the backend so APIs never rely solely on frontend checks.
 */

// Helper: check for excessive consecutive repeated characters
export const hasRepeatedChars = (val, threshold = 5) => {
  if (!val || typeof val !== 'string') return false;
  const regex = new RegExp(`(.)\\1{${threshold - 1},}`, 'i');
  return regex.test(val.trim());
};

// Helper: check if all characters in string are identical
export const isAllSameChar = (val) => {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim().replace(/[\s-]/g, '');
  if (clean.length <= 1) return false;
  return clean.split('').every(c => c.toLowerCase() === clean[0].toLowerCase());
};

/**
 * Validates full names (alphabetic letters, spaces, hyphens, dots; no digits; no dummy repeated characters)
 */
export const validateName = (name, fieldName = 'Name', min = 2, max = 120) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: `${fieldName} is required` };
  }
  const trimmed = name.trim();
  if (trimmed.length < min) {
    return { valid: false, message: `${fieldName} must be at least ${min} characters` };
  }
  if (trimmed.length > max) {
    return { valid: false, message: `${fieldName} cannot exceed ${max} characters` };
  }
  if (/\d/.test(trimmed)) {
    return { valid: false, message: `${fieldName} must contain letters only; numbers are not allowed` };
  }
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
    return { valid: false, message: `${fieldName} contains invalid special characters` };
  }
  if (hasRepeatedChars(trimmed, 4) || isAllSameChar(trimmed)) {
    return { valid: false, message: `Please enter a valid real ${fieldName.toLowerCase()} (repeated characters detected)` };
  }
  return { valid: true, value: trimmed };
};

/**
 * Validates email addresses
 */
export const validateEmail = (email, required = true) => {
  if (!email || typeof email !== 'string') {
    if (required) return { valid: false, message: 'Email address is required' };
    return { valid: true, value: '' };
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed && required) {
    return { valid: false, message: 'Email address is required' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid email address (e.g. user@example.com)' };
  }
  const localPart = trimmed.split('@')[0] || '';
  if (isAllSameChar(localPart) || hasRepeatedChars(localPart, 6)) {
    return { valid: false, message: 'Please enter a valid, real email address' };
  }
  return { valid: true, value: trimmed };
};

/**
 * Validates phone numbers (10-15 digits, numbers only, no repeating dummy sequences)
 */
export const validatePhone = (phone, required = true) => {
  if (!phone || typeof phone !== 'string') {
    if (required) return { valid: false, message: 'Phone number is required' };
    return { valid: true, value: '' };
  }
  const trimmed = phone.trim();
  if (!trimmed && required) {
    return { valid: false, message: 'Phone number is required' };
  }
  const digitsOnly = trimmed.replace(/^(\+91|0)/, '').replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digitsOnly)) {
    return { valid: false, message: 'Phone number must contain numbers only; letters are not allowed' };
  }
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { valid: false, message: 'Phone number must be between 10 and 15 digits' };
  }
  if (isAllSameChar(digitsOnly)) {
    return { valid: false, message: 'Please enter a valid phone number (cannot be all identical digits)' };
  }
  return { valid: true, value: digitsOnly };
};

/**
 * Validates password strength & format
 */
export const validatePassword = (password, min = 6) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < min) {
    return { valid: false, message: `Password must be at least ${min} characters long` };
  }
  if (password.length > 100) {
    return { valid: false, message: 'Password is too long (maximum 100 characters)' };
  }
  return { valid: true, value: password };
};

/**
 * Validates monetary amounts / numbers
 */
export const validateAmount = (amount, fieldName = 'Amount', { allowZero = false, min = 0.01 } = {}) => {
  if (amount === undefined || amount === null || amount === '') {
    return { valid: false, message: `${fieldName} is required` };
  }
  const num = Number(amount);
  if (isNaN(num)) {
    return { valid: false, message: `${fieldName} must be a valid number` };
  }
  if (!allowZero && num < min) {
    return { valid: false, message: `${fieldName} must be greater than zero` };
  }
  if (allowZero && num < 0) {
    return { valid: false, message: `${fieldName} cannot be negative` };
  }
  return { valid: true, value: num };
};

/**
 * Validates booking stay dates
 */
export const validateStayDates = (checkIn, checkOut) => {
  if (!checkIn) return { valid: false, message: 'Check-in date is required' };
  if (!checkOut) return { valid: false, message: 'Check-out date is required' };
  const dIn = new Date(checkIn);
  const dOut = new Date(checkOut);
  if (isNaN(dIn.getTime())) return { valid: false, message: 'Invalid check-in date format' };
  if (isNaN(dOut.getTime())) return { valid: false, message: 'Invalid check-out date format' };
  if (dOut < dIn) {
    return { valid: false, message: 'Check-out date cannot be earlier than check-in date' };
  }
  return { valid: true, checkInDate: checkIn, checkOutDate: checkOut };
};

export default {
  hasRepeatedChars,
  isAllSameChar,
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateAmount,
  validateStayDates
};
