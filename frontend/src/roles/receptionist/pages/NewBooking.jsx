import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { receptionistService } from "@/services/receptionist";
import { authService } from "@/services/auth";
import { toast } from "sonner";

import { subscribeRealtimeSync } from "@/services/socket";

function ReceptionistNewBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [availableRoomsList, setAvailableRoomsList] = useState([]);

  const todayDate = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    guest: "",
    phone: "",
    email: "",
    idProofType: "",
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
    const matchingRoom = availableRoomsList.find(r => r.type === category);
    const assignedRoomNum = matchingRoom ? matchingRoom.num : form.roomNumber;

    setForm(prev => ({
      ...prev,
      roomType: category,
      roomNumber: assignedRoomNum || prev.roomNumber,
      nights: nights,
      amount: amount !== "" ? amount : prev.amount,
      balance: 0
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
    if (!form.guest || !form.phone) {
      toast.error("Please provide guest full name and contact number.");
      return;
    }

    if (!form.idProofType || !form.idProofNumber) {
      toast.error("Government ID Proof Type and Document Number are mandatory.");
      return;
    }

    if (!form.checkIn || !form.checkOut) {
      toast.error("Please select stay Check-In and Check-Out dates.");
      return;
    }

    if (!form.roomType) {
      toast.error("Please select a room category.");
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
        idProofNumber: form.idProofNumber,
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
      setError(err.message || "Failed to register reservation");
      toast.error(err.message || "Error creating reservation");
    } finally {
      setSaving(false);
    }
  };

  // Filter available rooms in dropdown based on selected room category if category is chosen
  const filteredAvailableRooms = form.roomType
    ? availableRoomsList.filter(r => r.type === form.roomType)
    : availableRoomsList;

  const displayRooms = filteredAvailableRooms.length > 0 ? filteredAvailableRooms : availableRoomsList;

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans pb-12">
      {error && <Notice tone="error" title="Registration Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Profile & Mandatory ID Proof Details */}
          <Panel title="Guest Identification & Mandatory ID Proof" description="Primary guest profile and government ID verification">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="Guest Full Name *" required>
                <Input
                  required
                  placeholder="Enter guest full name"
                  value={form.guest}
                  onChange={(e) => setForm({ ...form, guest: e.target.value })}
                />
              </FormField>

              <FormField label="Contact Phone Number *" required>
                <Input
                  required
                  placeholder="Enter contact number (+91 98765 43210)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </FormField>

              <FormField label="Email Address">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </FormField>

              {/* Mandatory ID Proof Fields */}
              <FormField label="ID Proof Type *" required>
                <Select
                  required
                  value={form.idProofType}
                  onChange={(e) => setForm({ ...form, idProofType: e.target.value })}
                >
                  <option value="">Select ID Proof Type</option>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="PAN Card">PAN Card</option>
                </Select>
              </FormField>

              <FormField label="ID Proof Document Number *" required>
                <Input
                  required
                  placeholder="Enter ID number (e.g. 1234 5678 9012)"
                  value={form.idProofNumber}
                  onChange={(e) => setForm({ ...form, idProofNumber: e.target.value })}
                />
              </FormField>

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
              <FormField label="Check-In Date *" required>
                <Input
                  type="date"
                  required
                  placeholder="Select Check-In Date"
                  value={form.checkIn}
                  onChange={(e) => handleDateChange("checkIn", e.target.value)}
                />
              </FormField>

              <FormField label="Check-Out Date *" required>
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

              <FormField label="Room Category *" required>
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

              <FormField label="Room Allotment (Available Only)">
                <Select
                  value={form.roomNumber}
                  onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                >
                  <option value="">Select Available Room</option>
                  {displayRooms.length > 0 ? (
                    displayRooms.map(rm => (
                      <option key={rm.num} value={rm.num}>
                        Room #{rm.num} ({rm.type}) - Available
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No vacant rooms available for this type</option>
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
                  placeholder="Auto-calculated tariff (₹)"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
                />
              </FormField>

              <FormField label="Outstanding Balance (₹)">
                <Input
                  type="number"
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
              disabled={saving}
              className="h-9 px-6 text-xs font-bold bg-[#0d1b2a] text-white hover:bg-[#1a2e40] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg transition-all rounded-lg border border-navy/30 flex items-center gap-2"
            >
              {saving ? "Registering..." : (form.source === "Walk-in" && isDateToday(form.checkIn) ? "Complete Walk-In Check-In" : "Confirm New Reservation")}
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