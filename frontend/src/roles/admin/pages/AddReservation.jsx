import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader, Panel, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Checkbox } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Snowflake, Wind, Check } from "lucide-react";
import { extractRoomNumber, extractRoomVariant } from "@/utils/roomUtils";
import { validateWithZod, walkInBookingSchema } from "@/schemas";

function AddReservation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allDbRooms, setAllDbRooms] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [availableRoomsList, setAvailableRoomsList] = useState([]);
  const [occupiedVariants, setOccupiedVariants] = useState(new Set());
  const [fieldErrors, setFieldErrors] = useState({});

  // Form states
  const searchParams = new URLSearchParams(window.location.search);
  const [guest, setGuest] = useState(searchParams.get("guest") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [idProofType, setIdProofType] = useState(searchParams.get("idProofType") || "Aadhaar Card");
  const [idProofNumber, setIdProofNumber] = useState(searchParams.get("idProofNumber") || "");
  const [room, setRoom] = useState(searchParams.get("room") || "");
  const [roomVariant, setRoomVariant] = useState(searchParams.get("variant") || "AC");
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || "");
  const [nights, setNights] = useState(1);
  const [pax, setPax] = useState("2 Adults");
  const [source, setSource] = useState("Direct");
  const [status, setStatus] = useState(searchParams.get("status") || "Pending");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [notes, setNotes] = useState(searchParams.get("notes") || "");
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [existingGuestAadhaar, setExistingGuestAadhaar] = useState(null);

  const formatAadhaarInput = (value) => {
    if (!value) return "";
    const digits = String(value).replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(" ");
  };

  useEffect(() => {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (cleanPhone.length >= 10 || (cleanEmail && cleanEmail.includes('@') && cleanEmail.includes('.'))) {
      adminService.lookupGuestAadhaar({ phone: cleanPhone, email: cleanEmail, name: guest })
        .then(res => {
          if (res?.success && res?.data?.hasExistingAadhaar) {
            setExistingGuestAadhaar(res.data);
          } else {
            setExistingGuestAadhaar(null);
          }
        })
        .catch(() => setExistingGuestAadhaar(null));
    } else {
      setExistingGuestAadhaar(null);
    }
  }, [phone, email, guest]);

  const cleanAadhaar = idProofNumber ? String(idProofNumber).replace(/\D/g, '') : '';
  const isAadhaarType = idProofType === 'Aadhaar Card';
  const isAadhaarMismatch = Boolean(
    isAadhaarType &&
    existingGuestAadhaar?.hasExistingAadhaar &&
    cleanAadhaar.length === 12 &&
    existingGuestAadhaar.last4 &&
    !cleanAadhaar.endsWith(existingGuestAadhaar.last4)
  );

  useEffect(() => {
    const fetchRealAvailableRooms = async () => {
      try {
        const [roomsRes, propsRes, resRes] = await Promise.all([
          adminService.getRooms().catch(() => ({})),
          superAdminService.getProperties().catch(() => ({})),
          superAdminService.getReservations().catch(() => ({}))
        ]);

        let dbRooms = (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) ? roomsRes.data : [];

        // Extract assigned rooms from room types in MongoDB settings & localStorage
        let settingsTypes = [];
        if (propsRes && propsRes.success && Array.isArray(propsRes.data) && propsRes.data.length > 0) {
          settingsTypes = propsRes.data[0]?.settings?.roomTypes || [];
        }

        let savedTypes = [];
        try {
          const saved = localStorage.getItem("hms_room_types_list_v2");
          if (saved) savedTypes = JSON.parse(saved);
        } catch (e) {}

        if (settingsTypes.length === 0 && savedTypes.length === 0) {
          savedTypes = [
            { category: "Standard Room", rooms: ["101", "102", "103"] },
            { category: "Deluxe Room", rooms: ["201", "202", "203", "401", "402", "403"] },
            { category: "Executive Suite", rooms: ["301", "302", "303"] }
          ];
        }

        const allTypes = [...settingsTypes, ...savedTypes];
        const existingNums = new Set(dbRooms.map(r => String(r.roomNumber || r.num)));

        allTypes.forEach(t => {
          const assigned = Array.isArray(t.rooms) ? t.rooms : [];
          assigned.forEach(num => {
            if (num && !existingNums.has(String(num))) {
              existingNums.add(String(num));
              dbRooms.push({
                _id: `R-${num}`,
                roomNumber: String(num),
                category: t.category,
                status: "Available"
              });
            }
          });
        });

        setAllDbRooms(dbRooms);
        const liveRes = (resRes && resRes.success && Array.isArray(resRes.data)) ? resRes.data : [];
        setAllReservations(liveRes);
      } catch (err) {
        console.error("Failed to load real available rooms:", err);
      }
    };
    fetchRealAvailableRooms();
  }, []);

  // Dynamically compute available rooms and variant occupancy based on stay dates
  useEffect(() => {
    const isDateOverlap = (s1Str, e1Str, s2Str, e2Str) => {
      if (!s1Str || !e1Str || !s2Str || !e2Str) return false;
      const s1 = new Date(s1Str).getTime();
      const e1 = new Date(e1Str).getTime();
      const s2 = new Date(s2Str).getTime();
      const e2 = new Date(e2Str).getTime();
      if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) return false;
      return (s1 < e2 && s2 < e1);
    };

    const extractNums = (resObj) => {
      const combined = `${resObj.room || ''} ${resObj.roomNumber || ''} ${resObj.assignedRoom || ''} ${resObj.num || ''}`;
      const matches = combined.match(/\b\d{3,4}\b/g);
      return matches ? Array.from(new Set(matches.map(m => m.trim()))) : [];
    };

    const extractCleanNum = (val) => {
      if (!val) return null;
      const str = typeof val === 'object' 
        ? [val.roomNumber, val.num, val.room, val.assignedRoom].filter(Boolean).join(' ')
        : String(val);
      const match = str.match(/\b\d{3,4}\b/);
      return match ? match[0] : null;
    };

    const getVariant = (obj) => {
      if (!obj) return 'AC';
      const str = typeof obj === 'object'
        ? [obj.roomVariant, obj.type, obj.climateType, obj.room, obj.roomType, obj.category, obj.assignedRoom].filter(Boolean).join(' ')
        : String(obj);
      return /non[- ]?ac/i.test(str) ? 'Non-AC' : 'AC';
    };

    const variantOccupied = new Set();
    const todayStr = new Date().toISOString().split('T')[0];

    // Check reservations for variant occupancy
    allReservations.forEach(r => {
      const s = String(r.status || '').toLowerCase().trim();
      const isInactive = ['checked-out', 'checked out', 'checkout', 'completed', 'cancelled', 'canceled'].includes(s);
      if (isInactive) return;

      let isOccupying = false;
      if (checkIn && checkOut) {
        isOccupying = isDateOverlap(checkIn, checkOut, r.checkIn, r.checkOut);
      } else {
        const inHouseStatuses = ['checked-in', 'checked in', 'staying', 'occupied', 'in-house'];
        isOccupying = inHouseStatuses.includes(s);
      }

      if (isOccupying) {
        const nums = extractNums(r);
        const variant = getVariant(r);
        nums.forEach(n => {
          variantOccupied.add(`${n}_${variant}`);
        });
      }
    });

    // Check allDbRooms for live status or maintenance
    allDbRooms.forEach(r => {
      const cleanNum = extractCleanNum(r);
      if (!cleanNum) return;
      const roomStat = String(r.status || 'Available').toLowerCase().trim();
      const variant = getVariant(r);

      // Blocked, maintenance, out of order, dirty, cleaning disables this variant
      if (['maintenance', 'out of order', 'blocked', 'dirty', 'cleaning'].includes(roomStat)) {
        variantOccupied.add(`${cleanNum}_${variant}`);
        return;
      }

      // If room status in DB is Occupied or Checked-in:
      if (roomStat === 'occupied' || roomStat === 'checked-in') {
        if (!checkIn || !checkOut) {
          variantOccupied.add(`${cleanNum}_${variant}`);
        } else {
          const includesToday = (checkIn <= todayStr && todayStr < checkOut) || checkIn === todayStr;
          if (includesToday) {
            variantOccupied.add(`${cleanNum}_${variant}`);
          }
        }
      }
    });

    setOccupiedVariants(variantOccupied);

    // Build availableRoomsList (show room if at least one variant is available)
    const list = [];
    const addedRoomNums = new Set();

    allDbRooms.forEach(r => {
      const cleanNum = extractCleanNum(r);
      if (!cleanNum || addedRoomNums.has(cleanNum)) return;

      const isAcOccupied = variantOccupied.has(`${cleanNum}_AC`);
      const isNonAcOccupied = variantOccupied.has(`${cleanNum}_Non-AC`);

      // Exclude room from dropdown only if BOTH AC and Non-AC are occupied
      if (isAcOccupied && isNonAcOccupied) {
        addedRoomNums.add(cleanNum);
        return;
      }

      addedRoomNums.add(cleanNum);
      const cat = r.category || 'Standard Room';
      const baseRate = r.currentRate || r.baseRate || r.rate || (cat === 'Executive Suite' ? 6500 : cat === 'Deluxe Room' ? 4500 : 3000);

      list.push({
        num: cleanNum,
        type: cat,
        status: 'Available',
        baseRate
      });
    });

    list.sort((a, b) => Number(a.num) - Number(b.num));
    setAvailableRoomsList(list);

    // If currently selected room has both variants occupied, clear it
    if (room && variantOccupied.has(`${room}_AC`) && variantOccupied.has(`${room}_Non-AC`)) {
      setRoom("");
    } else if (room) {
      // Auto-switch variant if selected variant is occupied
      if (roomVariant === "AC" && variantOccupied.has(`${room}_AC`)) {
        setRoomVariant("Non-AC");
      } else if (roomVariant === "Non-AC" && variantOccupied.has(`${room}_Non-AC`)) {
        setRoomVariant("AC");
      }
    }
  }, [allDbRooms, allReservations, checkIn, checkOut, room]);

  const handleRoomChange = (selectedVal) => {
    if (!selectedVal) {
      setRoom("");
      if (fieldErrors.room) setFieldErrors(p => ({ ...p, room: null }));
      return;
    }
    const cleanNum = extractRoomNumber(selectedVal) || selectedVal.trim();
    setRoom(cleanNum);

    // Auto-switch to available variant if current variant is occupied for the newly selected room
    if (roomVariant === "AC" && occupiedVariants.has(`${cleanNum}_AC`)) {
      setRoomVariant("Non-AC");
    } else if (roomVariant === "Non-AC" && occupiedVariants.has(`${cleanNum}_Non-AC`)) {
      setRoomVariant("AC");
    }

    if (fieldErrors.room) setFieldErrors(p => ({ ...p, room: null }));
  };

  const isAcDisabled = Boolean(room && occupiedVariants.has(`${room}_AC`));
  const isNonAcDisabled = Boolean(room && occupiedVariants.has(`${room}_Non-AC`));

  const handleVariantChange = (variant) => {
    if (variant === "AC" && isAcDisabled) return;
    if (variant === "Non-AC" && isNonAcDisabled) return;
    setRoomVariant(variant);
  };

  // Auto-calculate nights and total amount whenever room designation, variant, checkIn, or checkOut changes
  useEffect(() => {
    if (checkIn && checkOut) {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 > d1) {
        const calculatedNights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        setNights(calculatedNights);

        let ratePerNight = 3500;
        if (room) {
          const selectedObj = availableRoomsList.find(r => String(r.num) === String(room) && r.roomVariant === roomVariant) ||
                              availableRoomsList.find(r => String(r.num) === String(room));
          if (selectedObj) {
            const typeStr = String(selectedObj.type || '').toLowerCase();
            if (typeStr.includes('executive')) ratePerNight = 6500;
            else if (typeStr.includes('deluxe')) ratePerNight = 4500;
            else if (typeStr.includes('villa')) ratePerNight = 8500;
            else if (typeStr.includes('standard')) ratePerNight = 3000;
            else if (selectedObj.rate || selectedObj.baseRate) ratePerNight = Number(selectedObj.rate || selectedObj.baseRate);
          }
        }

        // Apply Non-AC adjustment (25% off) if roomVariant is Non-AC
        if (roomVariant === "Non-AC") {
          ratePerNight = Math.max(1500, Math.round(ratePerNight * 0.75));
        }

        const totalTariff = ratePerNight * calculatedNights;
        setAmount(totalTariff);
      }
    }
  }, [checkIn, checkOut, room, roomVariant, availableRoomsList]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!room || !String(room).trim()) {
      toast.error("Please select room");
      return;
    }

    const roomNum = extractRoomNumber(room);
    const selectedObj = availableRoomsList.find(r => String(r.num) === String(roomNum) && r.roomVariant === roomVariant) ||
                        availableRoomsList.find(r => String(r.num) === String(roomNum));
    const baseCategory = selectedObj?.type || (room && room.includes('·') ? room.split('·')[1]?.trim() : (room || "Standard Room"));
    const roomTypeWithVariant = `${baseCategory} (${roomVariant})`;
    const formattedRoomString = roomNum ? `Room ${roomNum} · ${roomTypeWithVariant}` : room;

    const val = validateWithZod(walkInBookingSchema, {
      guest,
      phone,
      email,
      room: formattedRoomString,
      roomNumber: roomNum,
      roomType: roomTypeWithVariant,
      roomVariant,
      checkIn,
      checkOut,
      amount,
      balance: balance === "" ? 0 : balance,
      nights: nights === "" ? 1 : nights,
      pax,
      status,
      notes
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      toast.error(val.firstError);
      return;
    }
    setFieldErrors({});

    if (isAadhaarMismatch) {
      toast.error(`Cannot confirm reservation: The entered Aadhaar does not match the verified Aadhaar on file (${existingGuestAadhaar.maskedAadhaar}) for this guest. The same guest must use their registered Aadhaar across all bookings.`);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        guest,
        phone,
        email,
        idProofType,
        idProofNumber,
        room: formattedRoomString,
        roomNumber: roomNum,
        roomType: roomTypeWithVariant,
        roomVariant,
        checkIn,
        checkOut,
        nights: Number(nights || 1),
        pax,
        source,
        status,
        amount: Number(amount),
        balance: Number(balance || 0),
        notes,
        isGroupBooking
      };
      const res = await superAdminService.createReservation(payload);
      if (res.success) {
        toast.success("Reservation logged successfully.");
        navigate({ to: "/admin/reservations" });
      } else {
        toast.error(res.message || "Failed to create reservation.");
      }
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.message || "Failed to log booking.";
      toast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl pb-16">
      <PageHeader
        title="Add Reservation"
        subtitle="Assign reservation particulars, guest identification, room details, and tariff."
      />


      <div className="max-w-xl">

        <Panel title="Booking Parameters Form" description="Assign reservation particulars.">
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white rounded-b-xl">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Guest Name" required className="col-span-2" id="guest" status={fieldErrors.guest ? "error" : undefined} errorMsg={fieldErrors.guest}>
                <Input
                  id="guest"
                  type="text"
                  nameOnly
                  required
                  value={guest}
                  onChange={(e) => {
                    setGuest(e.target.value);
                    if (fieldErrors.guest) setFieldErrors(p => ({ ...p, guest: null }));
                  }}
                  placeholder="Enter guest's full name"
                />
              </FormField>

              <FormField label="Phone Number" required id="phone" status={fieldErrors.phone ? "error" : undefined} errorMsg={fieldErrors.phone}>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: null }));
                  }}
                  placeholder="+91 XXXXX XXXXX"
                />
              </FormField>

              <FormField label="Email Address" id="email" status={fieldErrors.email ? "error" : undefined} errorMsg={fieldErrors.email}>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: null }));
                  }}
                  placeholder="guest@example.com"
                />
              </FormField>

              <FormField label="ID Proof Type" id="idProofType">
                <Select
                  id="idProofType"
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="National ID">National ID</option>
                </Select>
              </FormField>

              <FormField label="ID Proof Number" id="idProofNumber">
                <Input
                  id="idProofNumber"
                  type="text"
                  value={idProofNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIdProofNumber(idProofType === 'Aadhaar Card' ? formatAadhaarInput(val) : val);
                  }}
                  placeholder={idProofType === "Aadhaar Card" ? "XXXX XXXX XXXX (12 Digits)" : "e.g. 1234 5678 9012"}
                  maxLength={idProofType === "Aadhaar Card" ? 14 : undefined}
                />
                {isAadhaarType && existingGuestAadhaar?.hasExistingAadhaar && (
                  <div className="mt-1.5">
                    {isAadhaarMismatch ? (
                      <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-200 block">
                        ⚠️ Mismatch: Registered Aadhaar is {existingGuestAadhaar.maskedAadhaar}. Guest must use consistent Aadhaar across all bookings.
                      </span>
                    ) : cleanAadhaar.length === 12 ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 block">
                        ✓ Aadhaar matches existing guest profile ({existingGuestAadhaar.maskedAadhaar})
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 block">
                        ℹ Existing verified Aadhaar on file: {existingGuestAadhaar.maskedAadhaar}
                      </span>
                    )}
                  </div>
                )}
              </FormField>

              <FormField label="Check-In Date" required id="checkIn">
                <Input
                  id="checkIn"
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </FormField>

              <FormField label="Check-Out Date" required id="checkOut">
                <Input
                  id="checkOut"
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </FormField>

              <FormField label="Room Designation" required id="room">
                <Select
                  id="room"
                  required
                  value={room || ""}
                  onChange={(e) => handleRoomChange(e.target.value)}
                >
                  <option value="">Select Available Room</option>
                  {availableRoomsList
                    .filter((r, idx, arr) => arr.findIndex(x => String(x.num) === String(r.num)) === idx)
                    .map((r, idx) => (
                      <option key={`room_${r.num}_${idx}`} value={r.num}>
                        Room #{r.num} ({r.type})
                      </option>
                    ))}
                </Select>
              </FormField>

              <FormField label="Room Variant (AC / Non-AC)" id="roomVariant">
                <div className="grid grid-cols-2 gap-2 w-full h-10">
                  <button
                    type="button"
                    disabled={isAcDisabled}
                    onClick={() => handleVariantChange("AC")}
                    className={`h-10 w-full px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                      isAcDisabled
                        ? "bg-[#f8fafc] text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : roomVariant === "AC"
                        ? "bg-purple text-white border-purple shadow-sm ring-2 ring-purple/20 cursor-pointer"
                        : "bg-white text-navy/80 border-[#E7E9EE] hover:border-purple/40 hover:bg-purple/5 hover:text-purple cursor-pointer"
                    }`}
                  >
                    <span>AC Room</span>
                    {isAcDisabled && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded leading-none shrink-0 ml-1">
                        Occupied
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isNonAcDisabled}
                    onClick={() => handleVariantChange("Non-AC")}
                    className={`h-10 w-full px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                      isNonAcDisabled
                        ? "bg-[#f8fafc] text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : roomVariant === "Non-AC"
                        ? "bg-navy text-white border-navy shadow-sm ring-2 ring-navy/20 cursor-pointer"
                        : "bg-white text-navy/80 border-[#E7E9EE] hover:border-navy/40 hover:bg-navy/5 hover:text-navy cursor-pointer"
                    }`}
                  >
                    <span>Non-AC Room</span>
                    {isNonAcDisabled && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded leading-none shrink-0 ml-1">
                        Occupied
                      </span>
                    )}
                  </button>
                </div>
              </FormField>

              <FormField label="Nights Count" required id="nights">
                <Input
                  id="nights"
                  type="number"
                  required
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                  min={1}
                />
              </FormField>

              <FormField label="Pax Details" required id="pax">
                <Input
                  id="pax"
                  type="text"
                  required
                  value={pax}
                  onChange={(e) => setPax(e.target.value)}
                />
              </FormField>

              <FormField label="Booking Channel" id="source">
                <Select
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="Direct">Direct Booking</option>
                  <option value="Corporate">Corporate / GDS Contract</option>
                  <option value="MakeMyTrip">MakeMyTrip OTA</option>
                  <option value="Booking.com">Booking.com OTA</option>
                  <option value="Agoda">Agoda OTA</option>
                  <option value="Walk-in">Walk-in Rate Plan</option>
                </Select>
              </FormField>

              <FormField label="Workflow Status" id="status">
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Checked-in">Checked-in</option>
                  <option value="Checked-out">Checked-out</option>
                  <option value="Cancelled">Cancelled</option>
                </Select>
              </FormField>

              <FormField label="Total Amount" required id="amount">
                <Input
                  id="amount"
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Total tariff cost"
                  suffix="₹"
                />
              </FormField>

              <FormField label="Remaining Balance" id="balance">
                <Input
                  id="balance"
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0 if fully prepaid"
                  suffix="₹"
                />
              </FormField>

              <div className="col-span-2">
                <FormField label="Special Requests / Front Desk Notes" id="notes">
                  <Input
                    id="notes"
                    placeholder="Enter special requests, arrival notes, or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-2.5">
                <Checkbox
                  id="isGroup"
                  checked={isGroupBooking}
                  onChange={(e) => setIsGroupBooking(e.target.checked)}
                  label="Identify as Group Booking (Master Ledger Integration)"
                />
              </div>
            </div>
            <div className="pt-4 border-t border-muted flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: "/admin/reservations" })}
                className="h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || isAadhaarMismatch}
                className="bg-navy hover:bg-navy/90 text-white h-10 px-6 font-bold rounded-full disabled:opacity-50"
              >
                {loading ? "Creating..." : isAadhaarMismatch ? "Aadhaar Mismatch - Resolve First" : "Create Booking"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/reservations/add")({
  component: AddReservation
});
