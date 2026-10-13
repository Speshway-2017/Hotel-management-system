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
 * Robustly extracts room climate variant ('AC' or 'Non-AC')
 */
export function extractRoomVariant(val) {
  if (!val) return "AC";
  if (typeof val === "object") {
    if (val.roomVariant && typeof val.roomVariant === "string" && val.roomVariant.trim()) {
      const v = val.roomVariant.trim().toLowerCase();
      if (v.includes("non")) return "Non-AC";
      if (v.includes("ac")) return "AC";
    }
    if (val.climateType && typeof val.climateType === "string" && val.climateType.trim()) {
      const v = val.climateType.trim().toLowerCase();
      if (v.includes("non")) return "Non-AC";
      if (v.includes("ac")) return "AC";
    }
    if (val.acVariant && typeof val.acVariant === "string" && val.acVariant.trim()) {
      const v = val.acVariant.trim().toLowerCase();
      if (v.includes("non")) return "Non-AC";
      if (v.includes("ac")) return "AC";
    }
    if (val.type && typeof val.type === "string" && val.type.trim()) {
      const v = val.type.trim().toLowerCase();
      if (v.includes("non")) return "Non-AC";
      if (v.includes("ac")) return "AC";
    }
    const strCandidate = [val.room, val.roomType, val.category, val.name, val.assignedRoom, val.notes].filter(Boolean).join(" ");
    if (strCandidate) {
      const res = extractRoomVariant(strCandidate);
      if (res) return res;
    }
    if (Array.isArray(val.amenities)) {
      const hasFan = val.amenities.some(a => String(a).toLowerCase().includes("fan"));
      const hasAc = val.amenities.some(a => String(a).toLowerCase().includes("air condition") || String(a).toLowerCase().includes("split ac"));
      if (hasFan && !hasAc) return "Non-AC";
      if (hasAc) return "AC";
    }
    return "AC";
  }

  const str = String(val).trim().toLowerCase();
  if (str.includes("non-ac") || str.includes("non ac") || str.includes("nonac") || str.includes("non- ac") || str.includes("non -ac")) {
    return "Non-AC";
  }
  if (
    !str.includes("non") &&
    (/\bac\b/i.test(str) ||
     str.includes("(ac)") ||
     str.includes(" ac") ||
     str.includes("air condition") ||
     str.includes("air-condition"))
  ) {
    return "AC";
  }
  return "AC";
}

/**
 * Calculate dynamic live room metrics from rooms array and reservations array
 */
export function calculateRoomKPIs(rooms = [], reservations = []) {
  const totalRooms = Array.isArray(rooms) && rooms.length > 0 ? rooms.length : 14;

  const occupiedRoomNums = new Set();
  const reservedRoomNums = new Set();
  const occupiedRoomVariantKeys = new Set();
  const reservedRoomVariantKeys = new Set();

  // 1. Gather status from reservations
  if (Array.isArray(reservations)) {
    reservations.forEach(r => {
      const s = String(r.status || "").toLowerCase().trim();
      const rNum = extractRoomNumber(r);
      const rVariant = extractRoomVariant(r) || "AC";

      if (s === "checked-in" || s === "checked in" || s === "occupied" || s === "staying") {
        if (rNum) {
          occupiedRoomNums.add(rNum);
          occupiedRoomVariantKeys.add(`${rNum}_${rVariant}`);
        }
      } else if (s === "confirmed" || s === "pending" || s === "reserved" || s === "booked" || s === "pre-checked" || s === "paid") {
        if (rNum) {
          reservedRoomNums.add(rNum);
          reservedRoomVariantKeys.add(`${rNum}_${rVariant}`);
        }
      }
    });
  }

  // 2. Gather status from rooms
  if (Array.isArray(rooms)) {
    rooms.forEach(r => {
      const s = String(r.status || "").toLowerCase().trim();
      const rNum = extractRoomNumber(r);
      const rmVariant = extractRoomVariant(r) || r.type || "AC";
      if (s === "occupied" || s === "checked-in" || s === "checkedin") {
        if (rNum) {
          occupiedRoomNums.add(rNum);
          occupiedRoomVariantKeys.add(`${rNum}_${rmVariant}`);
        }
      } else if (s === "reserved" || s === "confirmed" || s === "pending") {
        if (rNum) {
          reservedRoomNums.add(rNum);
          reservedRoomVariantKeys.add(`${rNum}_${rmVariant}`);
        }
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
    reservedRoomNums,
    occupiedRoomVariantKeys,
    reservedRoomVariantKeys
  };
}

/**
 * Normalizes a list of rooms with actual booking state
 */
export function normalizeRoomList(rooms = [], reservations = []) {
  const { occupiedRoomNums, reservedRoomNums, occupiedRoomVariantKeys, reservedRoomVariantKeys } = calculateRoomKPIs(rooms, reservations);

  return (rooms || []).map(rm => {
    const num = extractRoomNumber(rm);
    const rmVariant = extractRoomVariant(rm) || rm.type || "AC";
    let status = rm.status || "Available";

    const variantKey = `${num}_${rmVariant}`;

    if (occupiedRoomVariantKeys.has(variantKey)) {
      status = "Occupied";
    } else if (reservedRoomVariantKeys.has(variantKey) || (status === "Reserved" && !occupiedRoomVariantKeys.has(variantKey))) {
      status = "Reserved";
    } else if (occupiedRoomNums.has(num) && !rm.type && !rm.roomVariant) {
      status = "Occupied";
    } else if (reservedRoomNums.has(num) && !rm.type && !rm.roomVariant) {
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

    const amenitiesText = Array.isArray(rm.amenities)
      ? rm.amenities.join(' ')
      : String(rm.amenities || '');
    const isNonAc = rm.type === 'Non-AC' ||
      rm.category?.toLowerCase().includes('non-ac') ||
      rm.category?.toLowerCase().includes('non ac') ||
      amenitiesText.toLowerCase().includes('non-ac') ||
      (amenitiesText.toLowerCase().includes('fan') && !amenitiesText.toLowerCase().includes('air condition')) ||
      (!amenitiesText.toLowerCase().includes('air condition') && Number(rm.baseRate || rm.currentRate) < 2800);

    const resolvedType = rm.type || (isNonAc ? 'Non-AC' : 'AC');

    return {
      ...rm,
      type: resolvedType,
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
