import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Notice, LoadingRows, Crumbs, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { receptionistService } from "@/services/receptionist";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Fingerprint, ShieldCheck } from "lucide-react";

import { subscribeRealtimeSync } from "@/services/socket";
import { validateWithZod, walkInBookingSchema } from "@/schemas";

function ReceptionistNewBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [availableRoomsList, setAvailableRoomsList] = useState([]);
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

      // Helper to extract all 3-4 digit room numbers from any reservation object
      const extractNums = (resObj) => {
        const combined = `${resObj.room || ''} ${resObj.roomNumber || ''} ${resObj.assignedRoom || ''} ${resObj.num || ''}`;
        const matches = combined.match(/\b\d{3,4}\b/g);
        return matches ? Array.from(new Set(matches.map(m => m.trim()))) : [];
      };

      // Determine occupied / reserved rooms from live reservations
      const occupied = new Set();
      if (resRes && resRes.success && Array.isArray(resRes.data)) {
        resRes.data.forEach(r => {
          const s = String(r.status || '').toLowerCase().trim();
          const isInactive = s === 'checked-out' || s === 'checked out' || s === 'checkout' || s === 'completed' || s === 'cancelled' || s === 'canceled';
          if (!isInactive) {
            const nums = extractNums(r);
            nums.forEach(n => occupied.add(n));
          }
        });
      }

      // Filter ONLY available/vacant rooms (not occupied or reserved)
      const availableRooms = dbRooms
        .map(r => ({
          num: String(r.roomNumber || r.num || ''),
          type: r.category || r.roomType || 'Standard Room',
          status: r.status || 'Available',
          rate: r.currentRate || r.baseRate || r.rate || (r.category === 'Executive Suite' ? 6500 : r.category === 'Deluxe Room' ? 4500 : 3000)
        }))
        .filter(r => {
          if (!r.num) return false;
          if (occupied.has(r.num)) return false; // Exclude occupied / reserved rooms
          const roomStat = String(r.status || 'Available').toLowerCase().trim();
          return roomStat === 'available' || roomStat === 'vacant';
        });

      // Deduplicate & sort
      const uniqueAvailable = [];
      const seen = new Set();
      availableRooms.forEach(r => {
        if (!seen.has(r.num)) {
          seen.add(r.num);
          uniqueAvailable.push(r);
        }
      });
      uniqueAvailable.sort((a, b) => Number(a.num) - Number(b.num));
      setAvailableRoomsList(uniqueAvailable);
    } catch (e) {
      console.error("Failed to load available rooms:", e);
    } finally {
      setLoading(false);
    }
  };

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

  // Automatic calculation of duration (nights) and amount based on stay dates and room type
  const calculateTariff = (checkInDate, checkOutDate, selectedCategory) => {
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

      totalAmount = calculatedNights * ratePerNight;
    }

    return { nights: calculatedNights, amount: totalAmount };
  };

  const handleDateChange = (field, val) => {
    const nextCheckIn = field === "checkIn" ? val : form.checkIn;
    const nextCheckOut = field === "checkOut" ? val : form.checkOut;
    const { nights, amount } = calculateTariff(nextCheckIn, nextCheckOut, form.roomType);

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
    const { nights, amount } = calculateTariff(form.checkIn, form.checkOut, category);

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

  const handleNightsChange = (val) => {
    const n = Number(val) || 1;
    let totalAmount = "";
    if (n > 0 && form.roomType) {
      let ratePerNight = form.roomType === "Executive Suite" ? 6500 : form.roomType === "Deluxe Room" ? 4500 : 3000;
      const matchedRoom = rooms.find(r => (r.category || r.roomType) === form.roomType && (r.currentRate || r.baseRate || r.rate));
      if (matchedRoom) {
        ratePerNight = Number(matchedRoom.currentRate || matchedRoom.baseRate || matchedRoom.rate || ratePerNight);
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

    const val = validateWithZod(walkInBookingSchema, {
      guest: form.guest,
      phone: form.phone,
      email: form.email,
      idProofType: form.idProofType,
      idProofNumber: isAadhaarType ? cleanAadhaar : form.idProofNumber,
      roomNumber: form.roomNumber,
      roomType: form.roomType,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      amount: form.amount,
      balance: form.balance,
      nights: form.nights,
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
        room: form.roomNumber ? `${form.roomNumber} · ${form.roomType}` : (form.roomType || ""),
        roomType: form.roomType,
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

  // Filter available rooms in dropdown based on selected room category if category is chosen
  const filteredAvailableRooms = form.roomType
    ? availableRoomsList.filter(r => {
        const rType = String(r.type || '').trim().toLowerCase();
        const fType = String(form.roomType || '').trim().toLowerCase();
        return rType === fType || rType.includes(fType) || fType.includes(rType);
      })
    : availableRoomsList;

  const displayRooms = form.roomType ? filteredAvailableRooms : availableRoomsList;

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
                  required
                  value={form.roomNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({ ...form, roomNumber: val });
                    if (fieldErrors.roomNumber) {
                      setFieldErrors(p => ({ ...p, roomNumber: null }));
                    }
                  }}
                >
                  <option value="">Select Available Room</option>
                  {displayRooms.length > 0 ? (
                    displayRooms.map(rm => (
                      <option key={rm.num} value={rm.num}>
                        Room #{rm.num} ({rm.type}) - Available
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      {form.roomType ? `No vacant rooms available for ${form.roomType}` : "No vacant rooms available"}
                    </option>
                  )}
                </Select>
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