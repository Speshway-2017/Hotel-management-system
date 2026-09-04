/**
 * Date Utility Functions for Hotel Management System
 * Safely parses various date formats and normalizes day comparisons (Today, SameDay, formatting)
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

  // Match DD-MM-YYYY or DD/MM/YYYY (e.g. 04-09-2026)
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Match YYYY-MM-DD (e.g. 2026-09-04)
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Handle ISO string or standard Date parsing
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

export const formatToYYYYMMDD = (dateVal) => {
  if (!dateVal) return "";
  const d = parseDateSafe(dateVal);
  if (!d) return String(dateVal);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDisplayDate = (dateVal) => {
  if (!dateVal) return "";
  const s = String(dateVal).trim();
  if (s.toLowerCase() === 'today') return "Today";
  if (s.toLowerCase() === 'tomorrow') return "Tomorrow";
  const d = parseDateSafe(dateVal);
  if (!d) return String(dateVal);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
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
