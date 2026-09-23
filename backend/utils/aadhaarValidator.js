import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';

/**
 * Normalizes an Aadhaar string by removing all spaces, hyphens, and non-numeric characters.
 */
export const normalizeAadhaar = (val) => {
  if (!val) return '';
  return String(val).replace(/\D/g, '').trim();
};

/**
 * Checks whether an Aadhaar number adheres to standard UIDAI rules:
 * - Exactly 12 numeric digits
 * - Does not start with '0' or '1'
 */
export const isValidAadhaar = (val) => {
  const normalized = normalizeAadhaar(val);
  return /^[2-9]\d{11}$/.test(normalized);
};

/**
 * Formats a 12-digit Aadhaar into standard 4-4-4 spaced blocks: e.g. "4589 1234 8901".
 */
export const formatAadhaar = (val) => {
  const digits = normalizeAadhaar(val);
  if (digits.length !== 12) return val;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
};

/**
 * Securely masks an Aadhaar number, revealing only the last 4 digits: e.g. "•••• •••• 8901".
 */
export const maskAadhaar = (val) => {
  const digits = normalizeAadhaar(val);
  if (!digits) return '';
  if (digits.length < 4) return '••••';
  const last4 = digits.slice(-4);
  return `•••• •••• ${last4}`;
};

/**
 * Searches the database for any existing verified Aadhaar associated with this guest.
 * Matches by:
 * 1. booking.guestId (User._id)
 * 2. booking.email (case-insensitive)
 * 3. booking.phone (normalized digits)
 * 
 * Returns: { existingAadhaar: string|null, source: 'user_profile'|'previous_booking'|null, guestUser: object|null }
 */
export const findExistingVerifiedAadhaar = async (identifiers = {}) => {
  const { guestId, email, phone, name } = identifiers;
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';

  // 1. Check User collection for guest profile
  const userQueries = [];
  if (guestId) {
    userQueries.push({ _id: String(guestId) });
    if (mongoose.Types.ObjectId.isValid(guestId)) {
      userQueries.push({ _id: new mongoose.Types.ObjectId(guestId) });
    }
  }
  if (cleanEmail) {
    userQueries.push({ email: cleanEmail });
  }
  if (cleanPhone && cleanPhone.length >= 10) {
    userQueries.push({ mobile: cleanPhone });
    userQueries.push({ mobile: cleanPhone.slice(-10) });
    userQueries.push({ phone: cleanPhone });
    userQueries.push({ phone: cleanPhone.slice(-10) });
  }

  let guestUser = null;
  if (userQueries.length > 0) {
    guestUser = await User.findOne({ $or: userQueries, role: 'guest' });
    if (!guestUser) {
      // Fallback: search without role filter if user registered through other forms
      guestUser = await User.findOne({ $or: userQueries });
    }
  }

  if (guestUser) {
    const docType = String(guestUser.idDocType || guestUser.idProofType || 'Aadhaar Card').toLowerCase();
    const rawDocNum = guestUser.idDocNumber || guestUser.idProofNumber || guestUser.verifiedAadhaar || guestUser.aadhaarNumber;
    const docNumber = normalizeAadhaar(rawDocNum);
    if ((docType.includes('aadhaar') || docType.includes('aadhar')) && isValidAadhaar(docNumber)) {
      return {
        existingAadhaar: docNumber,
        formattedAadhaar: formatAadhaar(docNumber),
        maskedAadhaar: maskAadhaar(docNumber),
        source: 'user_profile',
        guestUser
      };
    }
  }

  // 2. Check previous verified Booking records for this guest
  const bookingQueries = [];
  if (guestId) {
    bookingQueries.push({ guestId: String(guestId) });
  }
  if (cleanEmail) {
    bookingQueries.push({ email: cleanEmail });
  }
  if (cleanPhone && cleanPhone.length >= 10) {
    bookingQueries.push({ phone: cleanPhone });
    bookingQueries.push({ phone: cleanPhone.slice(-10) });
  }

  if (bookingQueries.length > 0) {
    const priorBookings = await Booking.find({
      $or: bookingQueries,
      idVerification: 'Verified',
      idDocNumber: { $exists: true, $ne: '' }
    }).sort({ idVerifiedAt: -1, updatedAt: -1 });

    for (const pb of priorBookings) {
      const pbType = String(pb.idDocType || 'Aadhaar Card').toLowerCase();
      const pbNum = normalizeAadhaar(pb.idDocNumber);
      if ((pbType.includes('aadhaar') || pbType.includes('aadhar')) && isValidAadhaar(pbNum)) {
        return {
          existingAadhaar: pbNum,
          formattedAadhaar: formatAadhaar(pbNum),
          maskedAadhaar: maskAadhaar(pbNum),
          source: 'previous_booking',
          priorBooking: pb,
          guestUser
        };
      }
    }
  }

  return {
    existingAadhaar: null,
    formattedAadhaar: null,
    maskedAadhaar: null,
    source: null,
    guestUser
  };
};

/**
 * Validates Aadhaar consistency when verifying or checking in a guest.
 * 
 * Rules:
 * - If idDocType is Aadhaar, validates that the number is exactly 12 digits.
 * - Searches for any existing verified Aadhaar on file for that guest.
 * - If an existing verified Aadhaar is found, the submitted Aadhaar MUST match it.
 * - If different, rejects with clear mismatch details.
 * - If no Aadhaar exists, returns valid with isNew: true so it can be registered.
 */
export const validateAadhaarConsistency = async ({ booking, idDocType, idDocNumber, newAadhaar }) => {
  const docTypeStr = String(idDocType || booking?.idDocType || 'Aadhaar Card').trim();
  const isAadhaar = docTypeStr.toLowerCase().includes('aadhaar') || docTypeStr.toLowerCase().includes('aadhar');
  const targetNumber = idDocNumber !== undefined ? idDocNumber : newAadhaar;

  // If document is not Aadhaar (e.g. Passport, Voter ID), bypass Aadhaar-specific consistency rule
  if (!isAadhaar) {
    return {
      isValid: true,
      isAadhaar: false,
      isMismatch: false,
      idDocType: docTypeStr,
      idDocNumber: String(targetNumber || '').trim(),
      cleanAadhaar: String(targetNumber || '').trim(),
      message: 'Non-Aadhaar identity document bypassed consistency rule'
    };
  }

  const normalizedNew = normalizeAadhaar(targetNumber);

  if (!normalizedNew) {
    return {
      isValid: false,
      mismatch: false,
      isMismatch: false,
      error: 'ID Document Number is required for Aadhaar verification.',
      message: 'ID Document Number is required for Aadhaar verification.'
    };
  }

  if (normalizedNew.length !== 12) {
    return {
      isValid: false,
      mismatch: false,
      isMismatch: false,
      error: `Invalid Aadhaar Number: Aadhaar must be exactly 12 digits (Received ${normalizedNew.length} digits).`,
      message: `Invalid Aadhaar Number: Aadhaar must be exactly 12 digits (Received ${normalizedNew.length} digits).`
    };
  }

  if (!isValidAadhaar(normalizedNew)) {
    return {
      isValid: false,
      mismatch: false,
      isMismatch: false,
      error: 'Invalid Aadhaar Number: Standard Aadhaar numbers cannot start with 0 or 1.',
      message: 'Invalid Aadhaar Number: Standard Aadhaar numbers cannot start with 0 or 1.'
    };
  }

  // Lookup existing verified Aadhaar for this guest
  const existingRecord = await findExistingVerifiedAadhaar({
    guestId: booking?.guestId,
    email: booking?.email,
    phone: booking?.phone,
    name: booking?.guest
  });

  const guestDisplayName = booking?.guest || booking?.name || 'Guest';

  if (existingRecord.existingAadhaar) {
    const normalizedExisting = existingRecord.existingAadhaar;

    if (normalizedNew !== normalizedExisting) {
      const submittedMasked = maskAadhaar(normalizedNew);
      const existingMasked = existingRecord.maskedAadhaar || maskAadhaar(normalizedExisting);
      const errorMsg = `Aadhaar Verification Mismatch: The submitted Aadhaar (${submittedMasked}) does not match the verified Aadhaar on file (${existingMasked}) for guest ${guestDisplayName}. The same guest must use their registered Aadhaar across all bookings.`;

      return {
        isValid: false,
        mismatch: true,
        isMismatch: true,
        submittedAadhaar: submittedMasked,
        existingAadhaar: existingMasked,
        error: errorMsg,
        message: errorMsg
      };
    }

    return {
      isValid: true,
      isAadhaar: true,
      isNew: false,
      isFirstTime: false,
      isMismatch: false,
      matchedExisting: true,
      existingAadhaar: existingRecord.maskedAadhaar,
      normalizedAadhaar: normalizedNew,
      cleanAadhaar: normalizedNew,
      formattedAadhaar: formatAadhaar(normalizedNew),
      message: 'Aadhaar matches verified guest record on file.',
      guestUser: existingRecord.guestUser
    };
  }

  // First-time Aadhaar verification for this guest
  return {
    isValid: true,
    isAadhaar: true,
    isNew: true,
    isFirstTime: true,
    isMismatch: false,
    matchedExisting: false,
    normalizedAadhaar: normalizedNew,
    cleanAadhaar: normalizedNew,
    formattedAadhaar: formatAadhaar(normalizedNew),
    message: 'Valid 12-digit Aadhaar for new registration.',
    guestUser: existingRecord.guestUser
  };
};

/**
 * Synchronizes the verified Aadhaar onto the booking and guest user profile in MongoDB.
 * Prevents creation of duplicate guest identities.
 */
export const syncVerifiedAadhaarToGuestProfile = async ({ booking, idDocType, idDocNumber, cleanAadhaar, idDocImage, verifiedBy }) => {
  const docType = idDocType || 'Aadhaar Card';
  const rawNum = idDocNumber !== undefined ? idDocNumber : cleanAadhaar;
  const isAadhaar = String(docType).toLowerCase().includes('aadhaar');
  const formattedDocNumber = isAadhaar ? formatAadhaar(rawNum) : String(rawNum).trim();
  const normalizedDocNumber = isAadhaar ? normalizeAadhaar(rawNum) : String(rawNum).trim();

  const now = new Date();
  const verificationPayload = {
    idDocType: docType,
    idDocNumber: formattedDocNumber,
    idDocImage: idDocImage || booking?.idDocImage || '',
    idVerification: 'Verified',
    idVerifiedAt: now,
    idVerifiedBy: verifiedBy || 'Staff'
  };

  const bookingId = booking._id || booking.id;
  const updatedBooking = await Booking.findByIdAndUpdate(bookingId, verificationPayload, { new: true });

  // Sync or link to User collection
  try {
    const cleanEmail = booking.email ? String(booking.email).trim().toLowerCase() : '';
    const cleanPhone = booking.phone ? String(booking.phone).replace(/\D/g, '') : '';

    let guestUser = null;
    if (booking.guestId) {
      guestUser = await User.findById(booking.guestId);
    }
    if (!guestUser && cleanEmail) {
      guestUser = await User.findOne({ email: cleanEmail });
    }
    if (!guestUser && cleanPhone && cleanPhone.length >= 10) {
      guestUser = await User.findOne({ mobile: cleanPhone });
    }

    if (guestUser) {
      // Update existing guest profile without creating duplicates
      guestUser.idDocType = docType;
      guestUser.idDocNumber = formattedDocNumber;
      guestUser.idProofType = docType;
      guestUser.idProofNumber = formattedDocNumber;
      guestUser.verifiedAadhaar = formattedDocNumber;
      guestUser.verifiedAadhaarLast4 = normalizedDocNumber ? normalizedDocNumber.slice(-4) : '';
      guestUser.isAadhaarVerified = true;
      guestUser.aadhaarVerifiedAt = now;
      if (!guestUser.mobile && cleanPhone) guestUser.mobile = cleanPhone;
      await guestUser.save();

      // Ensure booking references the existing guest user ID
      if (!booking.guestId || String(booking.guestId) !== String(guestUser._id)) {
        await Booking.findByIdAndUpdate(bookingId, { guestId: String(guestUser._id) });
      }
    } else if (cleanEmail) {
      // Create guest profile if one does not exist yet (e.g. for walk-in / direct guest)
      const defaultPassword = `Guest@${Math.floor(1000 + Math.random() * 9000)}`;
      const newGuestUser = await User.create({
        name: booking.guest || 'Guest',
        email: cleanEmail,
        mobile: cleanPhone || '',
        role: 'guest',
        password: defaultPassword,
        status: 'Active',
        idDocType: docType,
        idDocNumber: formattedDocNumber,
        idProofType: docType,
        idProofNumber: formattedDocNumber,
        verifiedAadhaar: formattedDocNumber,
        verifiedAadhaarLast4: normalizedDocNumber ? normalizedDocNumber.slice(-4) : '',
        isAadhaarVerified: true,
        aadhaarVerifiedAt: now
      });

      await Booking.findByIdAndUpdate(bookingId, { guestId: String(newGuestUser._id) });
    }
  } catch (err) {
    console.warn('⚠️ Could not sync guest user profile for Aadhaar verification:', err.message);
  }

  return updatedBooking;
};

/**
 * Validates Aadhaar consistency when creating, confirming, or updating any booking.
 * 
 * Used during:
 * - Receptionist POST /reservations
 * - Manager POST /reservations
 * - SuperAdmin POST /reservations
 * - Public POST /bookings
 * - Reservation updates (PUT)
 * 
 * If an Aadhaar number is provided:
 * 1. Checks 12-digit format and validity (cannot start with 0 or 1).
 * 2. Looks up if guest already has a verified Aadhaar on file (via guestId, email, phone, name).
 * 3. If guest exists with verified Aadhaar:
 *    - MUST MATCH existing Aadhaar.
 *    - If mismatch: returns { isValid: false, isMismatch: true, error: "..." }
 * 4. If guest is new (no verified Aadhaar on file):
 *    - Returns { isValid: true, isNew: true, cleanAadhaar, formattedAadhaar }
 * 
 * If no Aadhaar is provided (e.g. non-Aadhaar doc or empty for pending check-in):
 *    - Returns { isValid: true, isAadhaar: false }
 */
export const validateBookingAadhaarConsistency = async ({
  guestId,
  email,
  phone,
  name,
  idDocType,
  idDocNumber
}) => {
  const docTypeStr = String(idDocType || 'Aadhaar Card').trim();
  const isAadhaar = docTypeStr.toLowerCase().includes('aadhaar') || docTypeStr.toLowerCase().includes('aadhar');
  const cleanDocNumber = normalizeAadhaar(idDocNumber);

  // If not Aadhaar or no document number provided, consistency check passes
  if (!isAadhaar || !cleanDocNumber) {
    return {
      isValid: true,
      isAadhaar: Boolean(isAadhaar && cleanDocNumber),
      isMismatch: false,
      idDocType: docTypeStr,
      cleanAadhaar: cleanDocNumber
    };
  }

  // 1. Format validation
  if (cleanDocNumber.length !== 12) {
    return {
      isValid: false,
      isMismatch: false,
      error: `Invalid Aadhaar Number: Aadhaar must be exactly 12 digits (Received ${cleanDocNumber.length} digits).`
    };
  }

  if (!isValidAadhaar(cleanDocNumber)) {
    return {
      isValid: false,
      isMismatch: false,
      error: 'Invalid Aadhaar Number: Standard Aadhaar numbers cannot start with 0 or 1.'
    };
  }

  // 2. Existing Guest Lookup
  const existingRecord = await findExistingVerifiedAadhaar({
    guestId,
    email,
    phone,
    name
  });

  const guestDisplayName = name || 'Guest';

  if (existingRecord.existingAadhaar) {
    const normalizedExisting = normalizeAadhaar(existingRecord.existingAadhaar);

    if (cleanDocNumber !== normalizedExisting) {
      const submittedMasked = maskAadhaar(cleanDocNumber);
      const existingMasked = existingRecord.maskedAadhaar || maskAadhaar(normalizedExisting);
      const errorMsg = `Aadhaar Verification Mismatch: The submitted Aadhaar (${submittedMasked}) does not match the verified Aadhaar on file (${existingMasked}) for guest ${guestDisplayName}. The same guest must use their registered Aadhaar across all bookings.`;

      return {
        isValid: false,
        mismatch: true,
        isMismatch: true,
        submittedAadhaar: submittedMasked,
        existingAadhaar: existingMasked,
        error: errorMsg,
        message: errorMsg
      };
    }

    return {
      isValid: true,
      isAadhaar: true,
      isNew: false,
      isMismatch: false,
      matchedExisting: true,
      existingAadhaar: existingRecord.maskedAadhaar,
      normalizedAadhaar: cleanDocNumber,
      cleanAadhaar: cleanDocNumber,
      formattedAadhaar: formatAadhaar(cleanDocNumber),
      guestUser: existingRecord.guestUser
    };
  }

  // First-time guest with valid Aadhaar
  return {
    isValid: true,
    isAadhaar: true,
    isNew: true,
    isMismatch: false,
    matchedExisting: false,
    normalizedAadhaar: cleanDocNumber,
    cleanAadhaar: cleanDocNumber,
    formattedAadhaar: formatAadhaar(cleanDocNumber),
    guestUser: existingRecord.guestUser
  };
};
