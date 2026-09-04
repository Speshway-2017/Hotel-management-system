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

  // Handle ISO string or YYYY-MM-DD
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // Try custom regex matching "DD Mon YYYY" / "DD-MM-YYYY" / "YYYY-MM-DD"
  const parts = s.split(/[-/ ]+/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (parts[2].length === 4) {
      const parsed = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!isNaN(parsed.getTime())) return parsed;
    }
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
