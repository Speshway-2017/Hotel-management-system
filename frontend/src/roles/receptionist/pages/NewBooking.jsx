import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Notice, LoadingRows, Crumbs, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { receptionistService } from "@/services/receptionist";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Fingerprint, ShieldCheck, Snowflake, Wind, Check } from "lucide-react";

import { subscribeRealtimeSync } from "@/services/socket";
import { validateWithZod, walkInBookingSchema } from "@/schemas";
import { extractRoomVariant, isBookingMatchingRoom } from "@/utils/roomUtils";

function ReceptionistNewBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [availableRoomsList, setAvailableRoomsList] = useState([]);
  const [occupiedVariants, setOccupiedVariants] = useState(new Set());
  const [existingGuestAadhaar, setExistingGuestAadhaar] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const todayDate = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    guest: "",
    phone: "",
    email: "",
    idProofType: "Aadhaar Card",
    idProofNumber: "",
    roomNumber: "",
    roomType: "",
    roomVariant: "AC",
    checkIn: todayDate,
    checkOut: tomorrowDate,
    nights: 1,
    pax: "2 Adults",
    source: "Walk-in",
    amount: "",
    balance: 0,
    status: "Checked-in",
    notes: "",
    isCorporate: false,
    corporateName: "",
    isGroupBooking: false
  });

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
    const cleanPhone = String(form.phone || '').replace(/\D/g, '');
    const cleanEmail = String(form.email || '').trim().toLowerCase();
    if (cleanPhone.length >= 10 || (cleanEmail && cleanEmail.includes('@') && cleanEmail.includes('.'))) {
      receptionistService.lookupGuestAadhaar({ phone: cleanPhone, email: cleanEmail, name: form.guest })
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
  }, [form.phone, form.email, form.guest]);

  const cleanAadhaar = form.idProofNumber ? String(form.idProofNumber).replace(/\D/g, '') : '';
  const isAadhaarType = form.idProofType === 'Aadhaar Card';
  const isAadhaarMismatch = Boolean(
    isAadhaarType &&
    existingGuestAadhaar?.hasExistingAadhaar &&
    cleanAadhaar.length === 12 &&
    existingGuestAadhaar.last4 &&
    !cleanAadhaar.endsWith(existingGuestAadhaar.last4)
  );

  // Check if date is today
  const isDateToday = (dateStr) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return false;
    const now = new Date();
    return now.getFullYear() === y && (now.getMonth() + 1) === m && now.getDate() === d;
  };

  const fetchRoomsAndAvailability = async () => {
    try {
      setLoading(true);
      const [roomsRes, resRes] = await Promise.all([
        receptionistService.getRooms().catch(() => ({})),
        receptionistService.getReservations().catch(() => ({}))
      ]);

      const dbRooms = (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) ? roomsRes.data : [];
      setRooms(dbRooms);
      const liveRes = (resRes && resRes.success && Array.isArray(resRes.data)) ? resRes.data : [];
      setAllReservations(liveRes);
    } catch (e) {
      console.error("Failed to load rooms and reservations:", e);
    } finally {
      setLoading(false);
    }
  };

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
      if (form.checkIn && form.checkOut) {
        isOccupying = isDateOverlap(form.checkIn, form.checkOut, r.checkIn, r.checkOut);
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

    // Check rooms for live status or maintenance
    rooms.forEach(r => {
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
        if (!form.checkIn || !form.checkOut) {
          variantOccupied.add(`${cleanNum}_${variant}`);
        } else {
          const includesToday = (form.checkIn <= todayStr && todayStr < form.checkOut) || form.checkIn === todayStr;
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

    rooms.forEach(r => {
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
      const cat = r.category || r.roomType || 'Standard Room';
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
    if (form.roomNumber && variantOccupied.has(`${form.roomNumber}_AC`) && variantOccupied.has(`${form.roomNumber}_Non-AC`)) {
      setForm(prev => ({ ...prev, roomNumber: "" }));
    } else if (form.roomNumber) {
      // Auto-switch variant if selected variant is occupied
      if (form.roomVariant === "AC" && variantOccupied.has(`${form.roomNumber}_AC`)) {
        const { nights, amount } = calculateTariff(form.checkIn, form.checkOut, form.roomType, "Non-AC");
        setForm(prev => ({ ...prev, roomVariant: "Non-AC", nights: nights, amount: amount !== "" ? amount : prev.amount }));
      } else if (form.roomVariant === "Non-AC" && variantOccupied.has(`${form.roomNumber}_Non-AC`)) {
        const { nights, amount } = calculateTariff(form.checkIn, form.checkOut, form.roomType, "AC");
        setForm(prev => ({ ...prev, roomVariant: "AC", nights: nights, amount: amount !== "" ? amount : prev.amount }));
      }
    }
  }, [rooms, allReservations, form.checkIn, form.checkOut, form.roomNumber]);

  useEffect(() => {
    fetchRoomsAndAvailability();

    const handleFocus = () => fetchRoomsAndAvailability();

    const unsubscribe = subscribeRealtimeSync(() => {
      fetchRoomsAndAvailability();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Automatic calculation of duration (nights) and amount based on stay dates, room type, and AC/Non-AC variant
  const calculateTariff = (checkInDate, checkOutDate, selectedCategory, selectedVariant = form.roomVariant || "AC") => {
    let calculatedNights = 1;
    if (checkInDate && checkOutDate) {
      const d1 = new Date(checkInDate);
      const d2 = new Date(checkOutDate);
      const diffTime = d2.getTime() - d1.getTime();
      if (!isNaN(diffTime) && diffTime > 0) {
        calculatedNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    }

    let totalAmount = "";
    if (selectedCategory) {
      let ratePerNight = 3000;
      if (selectedCategory === "Executive Suite") ratePerNight = 6500;
      else if (selectedCategory === "Deluxe Room") ratePerNight = 4500;
      else if (selectedCategory === "Standard Room") ratePerNight = 3000;

      const matchedRoom = rooms.find(r => (r.category || r.roomType) === selectedCategory && (r.currentRate || r.baseRate || r.rate));
      if (matchedRoom) {
        ratePerNight = Number(matchedRoom.currentRate || matchedRoom.baseRate || matchedRoom.rate || ratePerNight);
      }

      // Non-AC adjustment (25% off) if roomVariant is Non-AC
      if (selectedVariant === "Non-AC") {
        ratePerNight = Math.max(1500, Math.round(ratePerNight * 0.75));
      }

      totalAmount = calculatedNights * ratePerNight;
    }

    return { nights: calculatedNights, amount: totalAmount };
  };

  const handleDateChange = (field, val) => {
    const nextCheckIn = field === "checkIn" ? val : form.checkIn;
    const nextCheckOut = field === "checkOut" ? val : form.checkOut;
    const { nights, amount } = calculateTariff(nextCheckIn, nextCheckOut, form.roomType, form.roomVariant);

    const checkInIsToday = isDateToday(nextCheckIn);
    let updatedStatus = form.status;
    if (form.source === "Walk-in") {
      updatedStatus = checkInIsToday ? "Checked-in" : "Confirmed";
    }

    setForm(prev => ({
      ...prev,
      [field]: val,
      nights: nights,
      amount: amount !== "" ? amount : prev.amount,
      balance: 0,
      status: updatedStatus
    }));
  };

  const handleRoomTypeChange = (category) => {
    const { nights, amount } = calculateTariff(form.checkIn, form.checkOut, category, form.roomVariant);

    // Filter available rooms of selected type if matching
    const matchingRooms = availableRoomsList.filter(r => {
      const rType = String(r.type || '').trim().toLowerCase();
      const cType = String(category || '').trim().toLowerCase();
      return rType === cType || rType.includes(cType) || cType.includes(rType);
    });

    const isCurrentRoomValid = form.roomNumber && matchingRooms.some(r => String(r.num) === String(form.roomNumber));
    const assignedRoomNum = isCurrentRoomValid ? form.roomNumber : "";

    setForm(prev => ({
      ...prev,
      roomType: category,
      roomNumber: assignedRoomNum,
      nights: nights,
      amount: amount !== "" ? amount : prev.amount,
      balance: 0
    }));

    if (fieldErrors.roomNumber && assignedRoomNum) {
      setFieldErrors(prev => ({ ...prev, roomNumber: null }));
    }
  };

  const handleRoomNumberChange = (selectedVal) => {
    if (!selectedVal) {
      setForm(prev => ({ ...prev, roomNumber: "" }));
      if (fieldErrors.roomNumber) setFieldErrors(prev => ({ ...prev, roomNumber: null }));
      return;
    }

    const cleanNum = String(selectedVal).trim();
    const matched = availableRoomsList.find(r => String(r.num) === String(cleanNum));
    const detectedCategory = matched?.type || form.roomType;

    // Auto-switch to available variant if current variant is occupied for the newly selected room
    let nextVariant = form.roomVariant || "AC";
    if (nextVariant === "AC" && occupiedVariants.has(`${cleanNum}_AC`)) {
      nextVariant = "Non-AC";
    } else if (nextVariant === "Non-AC" && occupiedVariants.has(`${cleanNum}_Non-AC`)) {
      nextVariant = "AC";
    }

    const { nights, amount } = calculateTariff(form.checkIn, form.checkOut, detectedCategory, nextVariant);

    setForm(prev => ({
      ...prev,
      roomNumber: cleanNum,
      roomType: detectedCategory || prev.roomType,
      roomVariant: nextVariant,
      nights: nights,
      amount: amount !== "" ? amount : prev.amount
    }));

    if (fieldErrors.roomNumber && cleanNum) {
      setFieldErrors(prev => ({ ...prev, roomNumber: null }));
    }
  };

  const isAcDisabled = Boolean(form.roomNumber && occupiedVariants.has(`${form.roomNumber}_AC`));
  const isNonAcDisabled = Boolean(form.roomNumber && occupiedVariants.has(`${form.roomNumber}_Non-AC`));

  const handleVariantToggle = (variant) => {
    if (variant === "AC" && isAcDisabled) return;
    if (variant === "Non-AC" && isNonAcDisabled) return;
    const { nights, amount } = calculateTariff(form.checkIn, form.checkOut, form.roomType, variant);
    setForm(prev => ({
      ...prev,
      roomVariant: variant,
      nights: nights,
      amount: amount !== "" ? amount : prev.amount
    }));
  };

  const handleNightsChange = (val) => {
    const n = Number(val) || 1;
    let totalAmount = "";
    if (n > 0 && form.roomType) {
      let ratePerNight = form.roomType === "Executive Suite" ? 6500 : form.roomType === "Deluxe Room" ? 4500 : 3000;
      const matchedRoom = rooms.find(r => (r.category || r.roomType) === form.roomType && (r.currentRate || r.baseRate || r.rate));
      if (matchedRoom) {
        ratePerNight = Number(matchedRoom.currentRate || matchedRoom.baseRate || matchedRoom.rate || ratePerNight);
      }
      if (form.roomVariant === "Non-AC") {
        ratePerNight = Math.max(1500, Math.round(ratePerNight * 0.75));
      }
      totalAmount = n * ratePerNight;
    }
    setForm(prev => ({
      ...prev,
      nights: val,
      amount: totalAmount !== "" ? totalAmount : prev.amount,
      balance: 0
    }));
  };

  const handleSourceChange = (val) => {
    const checkInIsToday = isDateToday(form.checkIn);
    let updatedStatus = "Confirmed";
    if (val === "Walk-in") {
      updatedStatus = checkInIsToday ? "Checked-in" : "Confirmed";
    }

    setForm(prev => ({
      ...prev,
      source: val,
      status: updatedStatus
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.roomNumber || !String(form.roomNumber).trim()) {
      const msg = "Please select room";
      setFieldErrors(prev => ({ ...prev, roomNumber: msg }));
      setError(msg);
      toast.error(msg);
      return;
    }

    const roomTypeWithVariant = `${form.roomType || 'Standard Room'} (${form.roomVariant || 'AC'})`;
    const roomString = form.roomNumber ? `Room ${form.roomNumber} · ${roomTypeWithVariant}` : roomTypeWithVariant;

    const val = validateWithZod(walkInBookingSchema, {
      guest: form.guest,
      phone: form.phone,
      email: form.email,
      idProofType: form.idProofType,
      idProofNumber: isAadhaarType ? cleanAadhaar : form.idProofNumber,
      roomNumber: form.roomNumber,
      room: roomString,
      roomType: roomTypeWithVariant,
      roomVariant: form.roomVariant || "AC",
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      amount: form.amount,
      balance: form.balance === "" ? 0 : form.balance,
      nights: form.nights === "" ? 1 : form.nights,
      pax: form.pax,
      paymentMethod: form.paymentMethod,
      notes: form.notes
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      setError(val.firstError);
      toast.error(val.firstError);
      return;
    }
    setFieldErrors({});

    if (isAadhaarMismatch) {
      const msg = `Cannot confirm reservation: The entered Aadhaar does not match the verified Aadhaar on file (${existingGuestAadhaar.maskedAadhaar}) for this guest. The same guest must use their registered Aadhaar across all bookings.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const checkInIsToday = isDateToday(form.checkIn);
      let finalStatus = form.status || "Confirmed";
      if (form.source === "Walk-in") {
        finalStatus = checkInIsToday ? "Checked-in" : "Confirmed";
      }

      // Payment rule: Always Paid with balance: 0 unless explicit balance left
      const balanceNum = Number(form.balance || 0);
      const isPaid = balanceNum === 0;

      const payload = {
        guest: form.guest,
        phone: form.phone,
        email: form.email || `${form.guest.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
        idProofType: form.idProofType,
        idProofNumber: isAadhaarType ? cleanAadhaar : form.idProofNumber,
        roomNumber: form.roomNumber || "",
        room: roomString,
        roomType: roomTypeWithVariant,
        roomVariant: form.roomVariant || "AC",
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        nights: Number(form.nights) || 1,
        pax: form.pax || "2 Adults",
        source: form.source || "Walk-in",
        amount: Number(form.amount) || 0,
        balance: balanceNum,
        status: finalStatus,
        paymentStatus: isPaid ? "Paid" : "Pending",
        notes: form.notes,
        isCorporate: form.isCorporate,
        corporateName: form.corporateName,
        isGroupBooking: form.isGroupBooking
      };

      const res = await receptionistService.createReservation(payload);
      if (res.success) {
        toast.success(finalStatus === "Checked-in" ? "Walk-in guest registered & checked-in successfully!" : "Reservation confirmed successfully!");
        import('@/services/socket').then(({ socket }) => {
          socket.emit('booking_created', { guest: form.guest, room: form.roomNumber });
        });
        navigate({ to: "/reception/reservations" });
      } else {
        toast.error(res.message || "Failed to create reservation");
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || "Failed to register reservation";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Filter available rooms in dropdown based on selected room category and variant if chosen
  const filteredAvailableRooms = availableRoomsList.filter(r => {
    if (form.roomType) {
      const rType = String(r.type || '').trim().toLowerCase();
      const fType = String(form.roomType || '').trim().toLowerCase();
      if (rType !== fType && !rType.includes(fType) && !fType.includes(rType)) return false;
    }
    if (form.roomVariant) {
      if (r.roomVariant !== form.roomVariant) return false;
    }
    return true;
  });

  const displayRooms = (form.roomType || form.roomVariant) ? filteredAvailableRooms : availableRoomsList;

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans pb-12">
      <Crumbs
        items={[
          { label: "Front Desk", to: "/reception" },
          { label: "Reservations", to: "/reception/reservations" },
          { label: "New Reservation" }
        ]}
      />

      {error && <Notice tone="error" title="Reservation Blocked">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Profile & Mandatory ID Proof Details */}
          <Panel title="Guest Identification & Mandatory ID Proof" description="Primary guest profile and government ID verification">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="Guest Full Name" required status={fieldErrors.guest ? "error" : undefined} errorMsg={fieldErrors.guest}>
                <Input
                  required
                  nameOnly
                  placeholder="Enter guest full name"
                  value={form.guest}
                  onChange={(e) => {
                    setForm({ ...form, guest: e.target.value });
                    if (fieldErrors.guest) setFieldErrors(p => ({ ...p, guest: null }));
                  }}
                />
              </FormField>

              <FormField label="Contact Phone Number" required status={fieldErrors.phone ? "error" : undefined} errorMsg={fieldErrors.phone}>
                <Input
                  required
                  type="tel"
                  placeholder="Enter contact number (+91 98765 43210)"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: null }));
                  }}
                />
              </FormField>

              <FormField label="Email Address" status={fieldErrors.email ? "error" : undefined} errorMsg={fieldErrors.email}>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: null }));
                  }}
                />
              </FormField>

              {/* Mandatory ID Proof Fields */}
              <FormField label="ID Proof Type" required>
                <Select
                  required
                  value={form.idProofType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      idProofType: newType,
                      idProofNumber: newType === "Aadhaar Card" ? formatAadhaarInput(prev.idProofNumber) : prev.idProofNumber
                    }));
                  }}
                >
                  <option value="">Select ID Proof Type</option>
                  <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="PAN Card">PAN Card</option>
                </Select>
              </FormField>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-navy block">
                    ID Proof Document Number <span className="text-red-600 font-bold ml-1">*</span>
                  </label>
                  {isAadhaarType && existingGuestAadhaar?.hasExistingAadhaar && (
                    <span className="text-[10px] font-mono font-bold text-purple bg-purple/10 px-1.5 py-0.5 rounded">
                      On Record: {existingGuestAadhaar.maskedAadhaar}
                    </span>
                  )}
                </div>
                <Input
                  required
                  placeholder={isAadhaarType ? "Enter 12-digit Aadhaar (e.g. 1234 5678 9012)" : "Enter ID document number"}
                  value={form.idProofNumber}
                  maxLength={isAadhaarType ? 14 : 30}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      idProofNumber: isAadhaarType ? formatAadhaarInput(val) : val
                    }));
                  }}
                  className={
                    isAadhaarMismatch
                      ? "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/30 text-rose-900"
                      : isAadhaarType && cleanAadhaar.length === 12 && existingGuestAadhaar?.hasExistingAadhaar && cleanAadhaar.endsWith(existingGuestAadhaar.last4)
                      ? "border-emerald-500 focus-visible:ring-emerald-400 bg-emerald-50/30"
                      : ""
                  }
                />
                {isAadhaarType && (
                  <div className="mt-1.5">
                    {isAadhaarMismatch ? (
                      <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="size-3.5 shrink-0" />
                        Aadhaar Mismatch: Ends with {cleanAadhaar.slice(-4)}, but registered record is {existingGuestAadhaar.maskedAadhaar}. Booking cannot be confirmed.
                      </p>
                    ) : cleanAadhaar.length === 12 && existingGuestAadhaar?.hasExistingAadhaar && cleanAadhaar.endsWith(existingGuestAadhaar.last4) ? (
                      <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        Matches verified guest record on file ({existingGuestAadhaar.maskedAadhaar}).
                      </p>
                    ) : cleanAadhaar.length > 0 && cleanAadhaar.length < 12 ? (
                      <p className="text-[10px] text-muted-foreground">
                        {12 - cleanAadhaar.length} digit(s) remaining (12 digits required)
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <FormField label="Guest Capacity (Pax)">
                <Select
                  value={form.pax}
                  onChange={(e) => setForm({ ...form, pax: e.target.value })}
                >
                  <option value="1 Adult">1 Adult</option>
                  <option value="2 Adults">2 Adults</option>
                  <option value="2 Adults, 1 Child">2 Adults, 1 Child</option>
                  <option value="3 Adults">3 Adults</option>
                  <option value="Family (4 Guests)">Family (4 Guests)</option>
                  <option value="Group (6+ Guests)">Group (6+ Guests)</option>
                </Select>
              </FormField>
            </div>
          </Panel>

          {/* Stay & Room Configuration */}
          <Panel title="Stay Itinerary & Room Allocation" description="Schedule dates, category tier, and available room allotment">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="Check-In Date" required>
                <Input
                  type="date"
                  required
                  placeholder="Select Check-In Date"
                  value={form.checkIn}
                  onChange={(e) => handleDateChange("checkIn", e.target.value)}
                />
              </FormField>

              <FormField label="Check-Out Date" required>
                <Input
                  type="date"
                  required
                  placeholder="Select Check-Out Date"
                  value={form.checkOut}
                  onChange={(e) => handleDateChange("checkOut", e.target.value)}
                />
              </FormField>

              <FormField label="Duration (Nights) [Auto-Calculated]">
                <Input
                  type="number"
                  min="1"
                  placeholder="Auto-calculated nights"
                  value={form.nights}
                  onChange={(e) => handleNightsChange(e.target.value)}
                />
              </FormField>

              <FormField label="Room Category" required>
                <Select
                  required
                  value={form.roomType}
                  onChange={(e) => handleRoomTypeChange(e.target.value)}
                >
                  <option value="">Select Room Category</option>
                  <option value="Standard Room">Standard Room (₹3,000/night)</option>
                  <option value="Deluxe Room">Deluxe Room (₹4,500/night)</option>
                  <option value="Executive Suite">Executive Suite (₹6,500/night)</option>
                </Select>
              </FormField>

              <FormField 
                label="Room Allotment (Available Only)" 
                required 
                status={fieldErrors.roomNumber ? "error" : undefined} 
                errorMsg={fieldErrors.roomNumber}
              >
                <Select
                  id="roomNumber"
                  required
                  value={form.roomNumber || ""}
                  onChange={(e) => handleRoomNumberChange(e.target.value)}
                >
                  <option value="">Select Available Room</option>
                  {displayRooms.length > 0 ? (
                    displayRooms
                      .filter((r, idx, arr) => arr.findIndex(x => String(x.num) === String(r.num)) === idx)
                      .map((r, idx) => (
                        <option key={`room_${r.num}_${idx}`} value={r.num}>
                          Room #{r.num} ({r.type})
                        </option>
                      ))
                  ) : (
                    <option value="" disabled>
                      {form.roomType ? `No vacant rooms available for ${form.roomType}` : "No vacant rooms available"}
                    </option>
                  )}
                </Select>
              </FormField>

              <FormField label="Room Variant (AC / Non-AC)">
                <div className="grid grid-cols-2 gap-2 w-full h-10">
                  <button
                    type="button"
                    disabled={isAcDisabled}
                    onClick={() => handleVariantToggle("AC")}
                    className={`h-10 w-full px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                      isAcDisabled
                        ? "bg-[#f8fafc] text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : form.roomVariant === "AC"
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
                    onClick={() => handleVariantToggle("Non-AC")}
                    className={`h-10 w-full px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                      isNonAcDisabled
                        ? "bg-[#f8fafc] text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : form.roomVariant === "Non-AC"
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

              <FormField label="Booking Source / Channel">
                <Select
                  value={form.source}
                  onChange={(e) => handleSourceChange(e.target.value)}
                >
                  <option value="Walk-in">Walk-in Desk</option>
                  <option value="Direct">Direct Web</option>
                  <option value="Corporate">Corporate Account</option>
                  <option value="MakeMyTrip">MakeMyTrip</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="Agoda">Agoda</option>
                </Select>
              </FormField>
            </div>
          </Panel>

          {/* Billing & Financials */}
          <Panel title="Auto-Calculated Tariff & Payment Details" description="Tariff automatically calculated based on stay dates and room type">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="Total Tariff Amount (₹) [Auto-Calculated]">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Auto-calculated tariff (₹)"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
                />
              </FormField>

              <FormField label="Outstanding Balance (₹)">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0 (Paid)"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: Number(e.target.value) || 0 })}
                />
              </FormField>

              <FormField label="Payment Status">
                <Select
                  value={form.balance === 0 || form.balance === "0" ? "Paid" : "Pending"}
                  onChange={(e) => setForm({ ...form, balance: e.target.value === "Paid" ? 0 : form.balance || form.amount })}
                >
                  <option value="Paid">Paid (Full Settlement)</option>
                  <option value="Pending">Pending Balance</option>
                </Select>
              </FormField>

              <div className="sm:col-span-3">
                <FormField label="Special Requests / Front Desk Notes">
                  <Input
                    placeholder="Enter special requests, arrival time, preferences..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          </Panel>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-muted/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/reception/reservations" })}
              className="h-9 px-5 text-xs font-bold border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors rounded-lg"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={saving || isAadhaarMismatch}
              title={isAadhaarMismatch ? "Cannot confirm reservation: Aadhaar mismatch with existing guest record on file" : undefined}
              className={`h-9 px-6 text-xs font-bold transition-all rounded-lg border flex items-center gap-2 ${
                isAadhaarMismatch
                  ? "bg-rose-400 text-white cursor-not-allowed opacity-60 border-rose-500"
                  : "bg-[#0d1b2a] text-white hover:bg-[#1a2e40] active:scale-[0.98] cursor-pointer shadow-md hover:shadow-lg border-navy/30"
              }`}
            >
              {saving ? "Registering..." : isAadhaarMismatch ? "Aadhaar Mismatch (Blocked)" : (form.source === "Walk-in" && isDateToday(form.checkIn) ? "Complete Walk-In Check-In" : "Confirm New Reservation")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export const Route = createFileRoute("/reception/new-booking")({
  component: ReceptionistNewBooking
});

export default ReceptionistNewBooking;