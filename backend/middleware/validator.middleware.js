import { sendError } from '../utils/response.js';
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateAmount,
  validateStayDates
} from '../utils/validator.js';

/**
 * Validates registration payloads
 */
export const validateRegisterPayload = (req, res, next) => {
  const { name, email, password, mobile } = req.body;

  const nameVal = validateName(name, 'Full name', 2);
  if (!nameVal.valid) return sendError(res, 400, nameVal.message);

  const emailVal = validateEmail(email, true);
  if (!emailVal.valid) return sendError(res, 400, emailVal.message);

  const passVal = validatePassword(password, 6);
  if (!passVal.valid) return sendError(res, 400, passVal.message);

  if (mobile) {
    const phoneVal = validatePhone(mobile, true);
    if (!phoneVal.valid) return sendError(res, 400, phoneVal.message);
  }

  req.body.name = nameVal.value;
  req.body.email = emailVal.value;
  next();
};

/**
 * Validates public booking payloads
 */
export const validateBookingPayload = (req, res, next) => {
  const { guestName, guest, email, phone, checkIn, checkInDate, checkOut, checkOutDate } = req.body;
  const gName = guestName || guest;
  const cIn = checkInDate || checkIn;
  const cOut = checkOutDate || checkOut;

  const nameVal = validateName(gName, 'Guest name', 2);
  if (!nameVal.valid) return sendError(res, 400, nameVal.message);

  const emailVal = validateEmail(email, true);
  if (!emailVal.valid) return sendError(res, 400, emailVal.message);

  const phoneVal = validatePhone(phone, true);
  if (!phoneVal.valid) return sendError(res, 400, phoneVal.message);

  const datesVal = validateStayDates(cIn, cOut);
  if (!datesVal.valid) return sendError(res, 400, datesVal.message);

  next();
};

export default {
  validateRegisterPayload,
  validateBookingPayload
};
