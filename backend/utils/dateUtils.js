/**
 * Date Utility Functions for Backend Services
 */

export const parseDateSafe = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  const s = String(val).trim();
  if (!s) return null;
  if (s.toLowerCase() === 'today') return new Date();
  if (s.toLowerCase() === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  // Check DD-MM-YYYY or DD/MM/YYYY (e.g. 04-09-2026)
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Check YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d;
  }

  return null;
};

export const isSameDay = (dateA, dateB = new Date()) => {
  if (!dateA || !dateB) return false;
  const dA = parseDateSafe(dateA);
  const dB = parseDateSafe(dateB);
  if (!dA || !dB) return false;
  return (
    dA.getFullYear() === dB.getFullYear() &&
    dA.getMonth() === dB.getMonth() &&
    dA.getDate() === dB.getDate()
  );
};

export const isToday = (dateVal) => {
  if (!dateVal) return false;
  if (String(dateVal).trim().toLowerCase() === 'today') return true;
  return isSameDay(dateVal, new Date());
};

export const isTomorrow = (dateVal) => {
  if (!dateVal) return false;
  if (String(dateVal).trim().toLowerCase() === 'tomorrow') return true;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(dateVal, tomorrow);
};

/**
 * Calculates stay nights strictly as the calendar day difference (checkOut - checkIn).
 * Avoids timezone drift and supports DD-MM-YYYY, YYYY-MM-DD, ISO, same-day, and fallback dates.
 * E.g., check-in 04-09-2026 and check-out 05-09-2026 => 1 night.
 */
export const calculateStayNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;

  const parseToUtcDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      return Date.UTC(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
    }
    const str = String(dateVal).trim();
    if (!str) return null;
    if (str.toLowerCase() === 'today') {
      const now = new Date();
      return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    }
    if (str.toLowerCase() === 'tomorrow') {
      const now = new Date();
      now.setDate(now.getDate() + 1);
      return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Match DD-MM-YYYY or DD/MM/YYYY (e.g. 04-09-2026)
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      return Date.UTC(year, month, day);
    }

    // Match YYYY-MM-DD (e.g. 2026-09-04)
    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return Date.UTC(year, month, day);
    }

    // Fallback: standard Date parsing
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    }
    return null;
  };

  const startUtc = parseToUtcDate(checkIn);
  const endUtc = parseToUtcDate(checkOut);

  if (startUtc === null || endUtc === null) return 1;

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((endUtc - startUtc) / MS_PER_DAY);

  return Math.max(1, diffDays);
};

/**
 * Robustly parses a date value and an optional time string into a Date object
 * fixed in Indian Standard Time (IST, UTC+05:30).
 * Handles formats: "2026-09-23", "23 Sep 2026", "23-09-2026", "Today", "Tomorrow"
 * Times: "12:00 PM", "11:00 AM", "12:00", "11:00", "14:30"
 */
export const parseDateTimeToIST = (dateVal, timeStr = "12:00 PM") => {
  if (!dateVal) return null;
  let y, m, d;

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    // If already a Date object, convert to IST date parts
    const istParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateVal).split('-');
    y = parseInt(istParts[0], 10);
    m = parseInt(istParts[1], 10);
    d = parseInt(istParts[2], 10);
  } else {
    const s = String(dateVal).trim();
    if (!s) return null;

    if (s.toLowerCase() === 'today') {
      const now = new Date();
      const istParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now).split('-');
      y = parseInt(istParts[0], 10);
      m = parseInt(istParts[1], 10);
      d = parseInt(istParts[2], 10);
    } else if (s.toLowerCase() === 'tomorrow') {
      const now = new Date();
      now.setDate(now.getDate() + 1);
      const istParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now).split('-');
      y = parseInt(istParts[0], 10);
      m = parseInt(istParts[1], 10);
      d = parseInt(istParts[2], 10);
    } else {
      // 1. DD-MM-YYYY or DD/MM/YYYY
      const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      // 2. YYYY-MM-DD
      const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      // 3. DD Mon YYYY (e.g. 23 Sep 2026)
      const dMonY = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);

      if (dmy) {
        d = parseInt(dmy[1], 10);
        m = parseInt(dmy[2], 10);
        y = parseInt(dmy[3], 10);
      } else if (ymd) {
        y = parseInt(ymd[1], 10);
        m = parseInt(ymd[2], 10);
        d = parseInt(ymd[3], 10);
      } else if (dMonY) {
        d = parseInt(dMonY[1], 10);
        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const foundM = months.indexOf(dMonY[2].toLowerCase().substring(0, 3));
        m = (foundM !== -1 ? foundM : 0) + 1;
        y = parseInt(dMonY[3], 10);
      } else {
        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) {
          const istParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(parsed).split('-');
          y = parseInt(istParts[0], 10);
          m = parseInt(istParts[1], 10);
          d = parseInt(istParts[2], 10);
        } else {
          return null;
        }
      }
    }
  }

  // Parse time
  let hours = 12;
  let mins = 0;
  if (timeStr) {
    const tStr = String(timeStr).trim();
    // Matches "12:00 PM", "11:30 am", "14:00", "9 AM", "09:00"
    const tMatch = tStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (tMatch) {
      hours = parseInt(tMatch[1], 10);
      mins = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
      const meridiem = tMatch[3] ? tMatch[3].toUpperCase() : null;
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    }
  }

  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const minStr = String(mins).padStart(2, '0');

  // Exact timestamp in Indian Standard Time (UTC+05:30)
  return new Date(`${y}-${mm}-${dd}T${hh}:${minStr}:00+05:30`);
};

/**
 * Returns formatted Indian Standard Time string
 */
export const formatISTDateTime = (dateVal, includeTime = true) => {
  if (!dateVal) return "—";
  const d = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  const options = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }

  return d.toLocaleString('en-IN', options);
};

/**
 * Evaluates whether check-in is allowed for a booking based on server time.
 * Check-in is allowed once server time >= check-in date + check-in time.
 */
export const isCheckInAllowed = (booking, serverNow = new Date()) => {
  if (!booking) return false;
  const statusLower = String(booking.status || '').toLowerCase().trim();
  // If already checked in or checked out, it is not pending check-in
  if (['checked-in', 'checked in', 'staying', 'checked-out', 'checked out', 'cancelled'].includes(statusLower)) {
    return false;
  }

  const checkInDate = booking.checkIn || booking.checkInDate;
  if (!checkInDate) return true;

  const checkInTime = booking.checkInTime || booking.checkInSlot || '12:00 PM';
  const scheduledTime = parseDateTimeToIST(checkInDate, checkInTime);
  if (!scheduledTime) return true;

  return serverNow.getTime() >= scheduledTime.getTime();
};

/**
 * Evaluates whether checkout is due for an active in-stay booking.
 * Returns true if status is active stay and server time >= checkout date + checkout time.
 */
export const isCheckOutDue = (booking, serverNow = new Date()) => {
  if (!booking) return false;
  const statusLower = String(booking.status || '').toLowerCase().trim();
  const isActiveStay = ['checked-in', 'checked in', 'staying', 'staying-in', 'active'].includes(statusLower);
  if (!isActiveStay) return false;

  const checkOutDate = booking.checkOut || booking.checkOutDate;
  if (!checkOutDate) return false;

  const checkOutTime = booking.checkOutTime || booking.checkOutSlot || '11:00 AM';
  const scheduledTime = parseDateTimeToIST(checkOutDate, checkOutTime);
  if (!scheduledTime) return false;

  return serverNow.getTime() >= scheduledTime.getTime();
};

