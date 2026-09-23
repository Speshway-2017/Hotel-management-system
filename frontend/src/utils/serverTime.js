import { useState, useEffect } from "react";
import { parseDateSafe, formatDisplayDate } from "./dateUtils";

// In-memory synchronized clock state
let serverOffsetMs = 0;
let lastSyncedAtPerf = 0;
let isSynchronized = false;
let syncPromise = null;

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Parses date value and time string into a Date fixed in Indian Standard Time (UTC+05:30).
 * Supports:
 * Dates: "2026-09-23", "23 Sep 2026", "23-09-2026", "Today", "Tomorrow"
 * Times: "12:00 PM", "11:00 AM", "12:00", "11:00", "02:30 PM", "14:30"
 */
export const parseDateTimeToIST = (dateVal, timeStr = "12:00 PM") => {
  if (!dateVal) return null;
  let y, m, d;

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const istParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(dateVal).split("-");
    y = parseInt(istParts[0], 10);
    m = parseInt(istParts[1], 10);
    d = parseInt(istParts[2], 10);
  } else {
    const s = String(dateVal).trim();
    if (!s) return null;

    if (s.toLowerCase() === "today") {
      const now = getServerTime();
      const istParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(now).split("-");
      y = parseInt(istParts[0], 10);
      m = parseInt(istParts[1], 10);
      d = parseInt(istParts[2], 10);
    } else if (s.toLowerCase() === "tomorrow") {
      const now = getServerTime();
      now.setDate(now.getDate() + 1);
      const istParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(now).split("-");
      y = parseInt(istParts[0], 10);
      m = parseInt(istParts[1], 10);
      d = parseInt(istParts[2], 10);
    } else {
      const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
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
          const istParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }).format(parsed).split("-");
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
    const tMatch = tStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (tMatch) {
      hours = parseInt(tMatch[1], 10);
      mins = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
      const meridiem = tMatch[3] ? tMatch[3].toUpperCase() : null;
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    }
  }

  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const minStr = String(mins).padStart(2, "0");

  return new Date(`${y}-${mm}-${dd}T${hh}:${minStr}:00+05:30`);
};

/**
 * Synchronizes client clock with the server's authoritative clock.
 * Calculates clockOffset relative to performance.now() to remain immune
 * to local device clock tampering.
 */
export const syncServerTime = async () => {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const startTime = performance.now();
      const res = await fetch(`${API_BASE}/public/server-time`).then(r => r.json());
      const endTime = performance.now();
      const roundTripMs = endTime - startTime;

      if (res && res.data && res.data.serverTimestamp) {
        // Assume half round-trip latency
        const trueServerNow = res.data.serverTimestamp + (roundTripMs / 2);
        serverOffsetMs = trueServerNow - endTime;
        lastSyncedAtPerf = endTime;
        isSynchronized = true;
      }
    } catch (err) {
      // Fallback: compare with system clock
      if (!isSynchronized) {
        serverOffsetMs = Date.now() - performance.now();
      }
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
};

// Initial sync triggered on module import
if (typeof window !== "undefined") {
  syncServerTime();
  // Re-sync every 5 minutes or on window focus
  window.addEventListener("focus", () => syncServerTime());
  setInterval(syncServerTime, 5 * 60 * 1000);
}

/**
 * Returns a Date object representing the current authoritative Server Time.
 */
export const getServerTime = () => {
  if (!isSynchronized && lastSyncedAtPerf === 0) {
    return new Date();
  }
  const currentPerf = performance.now();
  return new Date(currentPerf + serverOffsetMs);
};

/**
 * Formats server time in IST with optional seconds
 */
export const formatServerTimeIST = (includeSeconds = false) => {
  const d = getServerTime();
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: true
  });
};

/**
 * Evaluates whether a booking is eligible for check-in right now based on Server Time.
 * Check-in is strictly enabled only at or after the scheduled check-in time on the check-in date.
 * Example: Booking date 23 Sep 2026, 12:00 PM -> disabled before 12:00 PM, enabled at exactly 12:00 PM.
 */
export const isCheckInPermitted = (booking) => {
  if (!booking) return false;

  const statusLower = String(booking.status || "").toLowerCase().trim();
  
  // Terminal or already checked in
  if (
    statusLower === "checked-in" ||
    statusLower === "checked in" ||
    statusLower === "staying" ||
    statusLower === "staying-in" ||
    statusLower === "checked-out" ||
    statusLower === "checked out" ||
    statusLower === "cancelled" ||
    statusLower === "canceled"
  ) {
    return false;
  }

  const checkInDate = booking.checkIn || booking.checkInDate;
  if (!checkInDate) return true;

  const checkInTime = booking.checkInTime || booking.checkInSlot || "12:00 PM";
  const scheduledTime = parseDateTimeToIST(checkInDate, checkInTime);
  if (!scheduledTime) return true;

  const serverNow = getServerTime();
  return serverNow.getTime() >= scheduledTime.getTime();
};

/**
 * Generates user-friendly status and tooltip information for Check-In actions.
 */
export const getCheckInStatusInfo = (booking) => {
  if (!booking) {
    return { isAllowed: false, allowed: false, reason: "No booking data", label: "Check-In", checkInTime: "12:00 PM" };
  }

  const checkInDate = booking.checkIn || booking.checkInDate || "Today";
  const checkInTime = booking.checkInTime || booking.checkInSlot || "12:00 PM";
  const scheduledTime = parseDateTimeToIST(checkInDate, checkInTime);
  const serverNow = getServerTime();

  if (!scheduledTime) {
    return { isAllowed: true, allowed: true, reason: "", label: "Check-In", checkInTime };
  }

  const isAllowed = serverNow.getTime() >= scheduledTime.getTime();

  if (isAllowed) {
    return {
      isAllowed: true,
      allowed: true,
      checkInTime,
      reason: "Check-in time reached. You can now onboard guest.",
      tooltip: `Check-in open since ${checkInTime} on ${formatDisplayDate(checkInDate)} (Server time: ${formatServerTimeIST()})`,
      label: "Process Check-In"
    };
  }

  const diffMs = scheduledTime.getTime() - serverNow.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let timeRemainingStr = "";
  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24);
    timeRemainingStr = `in ${days} day${days > 1 ? "s" : ""}`;
  } else if (diffHours > 0) {
    timeRemainingStr = `in ${diffHours}h ${diffMins}m`;
  } else {
    timeRemainingStr = `in ${Math.max(1, diffMins)}m`;
  }

  const tooltip = `Check-in opens at ${checkInTime} on ${formatDisplayDate(checkInDate)} (${timeRemainingStr}). Server time: ${formatServerTimeIST()}. Early check-in disabled.`;

  return {
    isAllowed: false,
    allowed: false,
    checkInTime,
    reason: `Check-in opens at ${checkInTime} (${timeRemainingStr})`,
    tooltip,
    label: `Check-In (${timeRemainingStr})`,
    timeRemainingStr,
    scheduledTime
  };
};

/**
 * React hook that subscribes to server time ticks.
 * Automatically refreshes every tickMs (default 2s) so check-in buttons
 * dynamically unlock the instant 12:00 PM arrives.
 */
export function useServerTime(tickMs = 2000) {
  const [serverTime, setServerTime] = useState(() => getServerTime());

  useEffect(() => {
    // Immediate sync check
    syncServerTime();

    const interval = setInterval(() => {
      setServerTime(getServerTime());
    }, tickMs);

    return () => clearInterval(interval);
  }, [tickMs]);

  return {
    serverTime,
    formattedServerTime: formatServerTimeIST(),
    isCheckInPermitted,
    getCheckInStatusInfo
  };
}
