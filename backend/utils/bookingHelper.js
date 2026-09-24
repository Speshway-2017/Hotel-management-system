import mongoose from 'mongoose';

/**
 * Checks if a string is a valid 24-character hexadecimal MongoDB ObjectId
 */
export const isObjectId = (val) => {
  if (!val) return false;
  const str = String(val).trim();
  return /^[0-9a-fA-F]{24}$/.test(str) && mongoose.Types.ObjectId.isValid(str);
};

/**
 * Builds a safe MongoDB query for looking up a booking by either:
 * - MongoDB `_id` (if valid 24-hex ObjectId)
 * - Booking human-readable reference `bookingId` (e.g. "BK-20101", "BK-10101", "BKG-2098")
 * 
 * NEVER includes `{ _id: id }` or `{ id: id }` if `id` is not an ObjectId,
 * preventing Mongoose `Cast to ObjectId failed for "BK-20101"` errors.
 */
export const buildBookingLookupQuery = (id) => {
  if (!id) return { bookingId: '__none__' };
  const str = String(id).trim();
  const cleanNum = str.replace(/^(BK|FOL|BKG)-/i, '');
  
  if (isObjectId(str)) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(str) },
        { bookingId: str }
      ]
    };
  }

  const candidates = Array.from(new Set([
    str,
    cleanNum,
    `BK-${cleanNum}`,
    `FOL-${cleanNum}`,
    `BKG-${cleanNum}`
  ])).filter(Boolean);

  if (isObjectId(cleanNum)) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(cleanNum) },
        ...candidates.map(c => ({ bookingId: c }))
      ]
    };
  }

  if (candidates.length === 1) {
    return { bookingId: candidates[0] };
  }

  return {
    $or: candidates.map(c => ({ bookingId: c }))
  };
};

/**
 * Formats a booking document/object so `id`, `_id`, and `bookingId` are always
 * consistently populated for frontend and mobile APIs.
 */
export const formatBooking = (b) => {
  if (!b) return null;
  const rawId = b._id ? b._id.toString() : (b.id ? b.id.toString() : '');
  const ref = b.bookingId || (rawId ? `BK-${rawId.slice(-5).toUpperCase()}` : 'BK-1001');
  return {
    ...(b.toObject ? b.toObject() : b),
    id: rawId || ref,
    _id: rawId || ref,
    bookingId: ref
  };
};
