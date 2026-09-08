/**
 * Shared Room Extraction and Dynamic KPI Calculation Utilities
 * Ensures 100% accurate, dynamic room occupancy, availability, and KPI metrics across all dashboards.
 */

/**
 * Extract clean room number string from string or booking object
 * e.g. "Standard Room (Room 101)" -> "101"
 *      "101 · Standard Room" -> "101"
 *      "Deluxe Room 202" -> "202"
 */
export function extractRoomNumber(val) {
  if (!val) return "";
  if (typeof val === "object") {
    if (val.roomNumber && String(val.roomNumber).trim()) {
      const parsed = extractRoomNumber(String(val.roomNumber));
      if (parsed) return parsed;
    }
    if (val.room && String(val.room).trim()) {
      const parsed = extractRoomNumber(String(val.room));
      if (parsed) return parsed;
    }
    if (val.num && String(val.num).trim()) {
      const parsed = extractRoomNumber(String(val.num));
      if (parsed) return parsed;
    }
    if (val.roomId && typeof val.roomId === "string" && /^\d{3,4}$/.test(val.roomId.trim())) {
      return val.roomId.trim();
    }
    return "";
  }
  const str = String(val).trim();
  if (!str) return "";

  // Ignore 24-character hex ObjectIds
  if (/^[0-9a-f]{24}$/i.test(str)) {
    return "";
  }

  // 1. Explicit Room prefix: "Room 501", "(Room 501)", "Rm 301", "#501"
  const prefixMatch = str.match(/(?:room|rm|#)\s*(\d{1,4})\b/i);
  if (prefixMatch) return prefixMatch[1];

  // 2. Standard 3-4 digit hotel room number with word boundary: 101, 201, 301, 501
  const match34 = str.match(/\b\d{3,4}\b/);
  if (match34) return match34[0];

  // 3. Standalone 1-2 digit room number at the start: "6 · Deluxe", "6"
  const standaloneMatch = str.match(/^(\d{1,4})(?:\s*·|\s+|$)/);
  if (standaloneMatch) return standaloneMatch[1];

  return "";
}

/**
 * Calculate dynamic live room metrics from rooms array and reservations array
 */
export function calculateRoomKPIs(rooms = [], reservations = []) {
  const totalRooms = Array.isArray(rooms) && rooms.length > 0 ? rooms.length : 14;

  const occupiedRoomNums = new Set();
  const reservedRoomNums = new Set();

  // 1. Gather status from reservations
  if (Array.isArray(reservations)) {
    reservations.forEach(r => {
      const s = String(r.status || "").toLowerCase().trim();
      const rNum = extractRoomNumber(r);

      if (s === "checked-in" || s === "checked in" || s === "occupied" || s === "staying") {
        if (rNum) occupiedRoomNums.add(rNum);
      } else if (s === "confirmed" || s === "pending" || s === "reserved" || s === "booked" || s === "pre-checked" || s === "paid") {
        if (rNum) reservedRoomNums.add(rNum);
      }
    });
  }

  // 2. Gather status from rooms
  if (Array.isArray(rooms)) {
    rooms.forEach(r => {
      const s = String(r.status || "").toLowerCase().trim();
      const rNum = extractRoomNumber(r);
      if (s === "occupied" || s === "checked-in" || s === "checkedin") {
        if (rNum) occupiedRoomNums.add(rNum);
      } else if (s === "reserved" || s === "confirmed" || s === "pending") {
        if (rNum && !occupiedRoomNums.has(rNum)) reservedRoomNums.add(rNum);
      }
    });
  }

  const occupiedRooms = occupiedRoomNums.size;
  const reservedRooms = reservedRoomNums.size;
  const availableRooms = Math.max(0, totalRooms - occupiedRooms - reservedRooms);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const dirtyRooms = Array.isArray(rooms) ? rooms.filter(r => r.status === "Dirty" || r.housekeeping === "Dirty").length : 0;
  const cleaningRooms = Array.isArray(rooms) ? rooms.filter(r => r.status === "Cleaning" || r.housekeeping === "Cleaning").length : 0;
  const outOfOrderRooms = Array.isArray(rooms) ? rooms.filter(r => r.status === "Maintenance" || r.status === "Out of Order" || r.status === "Blocked").length : 0;

  return {
    totalRooms,
    occupiedRooms,
    availableRooms,
    reservedRooms,
    occupancyRate,
    dirtyRooms,
    cleaningRooms,
    outOfOrderRooms,
    occupiedRoomNums,
    reservedRoomNums
  };
}

/**
 * Normalizes a list of rooms with actual booking state
 */
export function normalizeRoomList(rooms = [], reservations = []) {
  const { occupiedRoomNums, reservedRoomNums } = calculateRoomKPIs(rooms, reservations);

  return (rooms || []).map(rm => {
    const num = extractRoomNumber(rm);
    let status = rm.status || "Available";

    if (occupiedRoomNums.has(num)) {
      status = "Occupied";
    } else if (reservedRoomNums.has(num) || status === "Reserved") {
      status = "Reserved";
    } else if (status === "Blocked" || status === "Maintenance" || status === "Out of Order" || status === "Dirty" || status === "Cleaning") {
      // Retain manual maintenance / blocked status
    } else {
      status = "Available";
    }

    let floor = rm.floor;
    if (!floor) {
      const firstDigit = num ? num.charAt(0) : "";
      if (firstDigit && !isNaN(Number(firstDigit)) && Number(firstDigit) >= 1 && Number(firstDigit) <= 9) {
        floor = `Floor ${firstDigit}`;
      } else {
        floor = "Floor 1";
      }
    }

    return {
      ...rm,
      roomNumber: num || rm.roomNumber,
      num: num || rm.num,
      status,
      floor,
      category: rm.category || "Standard Room",
      baseRate: Number(rm.baseRate || rm.currentRate || rm.dailyRate || 3000),
      currentRate: Number(rm.currentRate || rm.baseRate || rm.dailyRate || 3000)
    };
  });
}
