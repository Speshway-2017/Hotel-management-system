import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { toast } from "sonner";

function ManagerAddReservation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [property, setProperty] = useState(null);

  const [form, setForm] = useState({
    guest: "",
    phone: "",
    email: "",
    idProofType: "",
    idProofNumber: "",
    roomNumber: "",
    roomType: "",
    checkIn: "",
    checkOut: "",
    nights: "",
    pax: "",
    source: "",
    amount: "",
    balance: "",
    status: "Confirmed",
    notes: "",
    isCorporate: false,
    corporateName: "",
    isGroupBooking: false
  });

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user || user.role !== "manager") {
      navigate({ to: "/manager" });
      return;
    }

    const loadInitial = async () => {
      try {
        setLoading(true);
        const [roomsRes, propRes] = await Promise.all([
          managerService.getRooms().catch(() => ({})),
          managerService.getProperty().catch(() => ({}))
        ]);

        if (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) {
          setRooms(roomsRes.data);
        }
        if (propRes && propRes.success && propRes.data) {
          setProperty(propRes.data);
        }
      } catch (e) {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Check if date is today
  const isDateToday = (dateStr) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return false;
    const now = new Date();
    return now.getFullYear() === y && (now.getMonth() + 1) === m && now.getDate() === d;
  };

  // Automatic calculation of duration (nights) and amount based on stay dates and room type
  const calculateTariff = (checkInDate, checkOutDate, selectedCategory) => {
    let calculatedNights = "";
    if (checkInDate && checkOutDate) {
      const d1 = new Date(checkInDate);
      const d2 = new Date(checkOutDate);
      const diffTime = d2.getTime() - d1.getTime();
      calculatedNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    let totalAmount = "";
    if (calculatedNights !== "" && selectedCategory) {
      let ratePerNight = 3000;
      if (selectedCategory === "Executive Suite") ratePerNight = 6500;
      else if (selectedCategory === "Deluxe Room") ratePerNight = 4500;
      else if (selectedCategory === "Standard Room") ratePerNight = 3000;

      // Check if dynamic rate is available from rooms
      const matchedRoom = rooms.find(r => r.category === selectedCategory && (r.currentRate || r.baseRate || r.rate));
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

    setForm(prev => {
      // If checkIn is tomorrow or later, walk-in should NOT be auto checked-in
      const isToday = isDateToday(nextCheckIn);
      let updatedStatus = prev.status;
      if (prev.source === "Walk-in") {
        updatedStatus = isToday ? "Checked-in" : "Confirmed";
      }

      return {
        ...prev,
        [field]: val,
        nights: nights !== "" ? nights : (field === "checkIn" && !nextCheckOut ? "" : prev.nights),
        amount: amount !== "" ? amount : (form.roomType ? "" : prev.amount),
        balance: prev.balance !== "" ? prev.balance : 0,
        status: updatedStatus
      };
    });
  };

  const handleRoomTypeChange = (category) => {
    const { nights, amount } = calculateTariff(form.checkIn, form.checkOut, category);
    setForm(prev => ({
      ...prev,
      roomType: category,
      nights: nights !== "" ? nights : prev.nights,
      amount: amount !== "" ? amount : prev.amount,
      balance: prev.balance !== "" ? prev.balance : 0
    }));
  };

  const handleNightsChange = (val) => {
    const n = Number(val) || 0;
    let totalAmount = "";
    if (n > 0 && form.roomType) {
      let ratePerNight = form.roomType === "Executive Suite" ? 6500 : form.roomType === "Deluxe Room" ? 4500 : 3000;
      const matchedRoom = rooms.find(r => r.category === form.roomType && (r.currentRate || r.baseRate || r.rate));
      if (matchedRoom) {
        ratePerNight = Number(matchedRoom.currentRate || matchedRoom.baseRate || matchedRoom.rate || ratePerNight);
      }
      totalAmount = n * ratePerNight;
    }
    setForm(prev => ({
      ...prev,
      nights: val,
      amount: totalAmount !== "" ? totalAmount : prev.amount,
      balance: prev.balance !== "" ? prev.balance : 0
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

      // Status rule: Walk-in is only Checked-in if check-in is TODAY, otherwise Confirmed
      const checkInIsToday = isDateToday(form.checkIn);
      let finalStatus = form.status || "Confirmed";
      if (form.source === "Walk-in") {
        finalStatus = checkInIsToday ? "Checked-in" : "Confirmed";
      }

      // Payment rule: Always Paid (balance: 0) unless explicit balance is left
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
        source: form.source || "Direct",
        amount: Number(form.amount) || 0,
        balance: balanceNum,
        status: finalStatus,
        paymentStatus: isPaid ? "Paid" : "Pending",
        notes: form.notes,
        isCorporate: form.isCorporate,
        corporateName: form.corporateName,
        isGroupBooking: form.isGroupBooking
      };

      const res = await managerService.createReservation(payload);
      if (res.success) {
        toast.success(finalStatus === "Checked-in" ? "Walk-in guest checked in successfully!" : "Reservation confirmed successfully!");
        import('@/services/socket').then(({ socket }) => {
          socket.emit('booking_created', { guest: form.guest, room: form.roomNumber });
        });
        navigate({ to: "/manager/reservations" });
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
                  <option value="">Select Guest Capacity</option>
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
          <Panel title="Stay Itinerary & Room Allocation" description="Schedule dates, category tier, and room assignment">
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

              <FormField label="Assign Room #">
                <Select
                  value={form.roomNumber}
                  onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                >
                  <option value="">Select Room Number</option>
                  {rooms.length > 0 ? (
                    rooms.map(rm => (
                      <option key={rm.roomNumber || rm.room} value={rm.roomNumber || rm.room}>
                        Room {rm.roomNumber || rm.room} ({rm.category || 'Standard'}) - {rm.status}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="101">Room 101 (Standard Room)</option>
                      <option value="102">Room 102 (Standard Room)</option>
                      <option value="103">Room 103 (Standard Room)</option>
                      <option value="201">Room 201 (Deluxe Room)</option>
                      <option value="202">Room 202 (Deluxe Room)</option>
                      <option value="203">Room 203 (Deluxe Room)</option>
                      <option value="301">Room 301 (Executive Suite)</option>
                      <option value="302">Room 302 (Executive Suite)</option>
                      <option value="303">Room 303 (Executive Suite)</option>
                    </>
                  )}
                </Select>
              </FormField>

              <FormField label="Booking Source / Channel">
                <Select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  <option value="">Select Booking Source</option>
                  <option value="Direct">Direct Web</option>
                  <option value="Walk-in">Walk-in Desk</option>
                  <option value="Corporate">Corporate Account</option>
                  <option value="Group">Group Booking</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="MakeMyTrip">MakeMyTrip</option>
                  <option value="Agoda">Agoda</option>
                  <option value="Expedia">Expedia</option>
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
                  placeholder="Enter balance (₹)"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: Number(e.target.value) || 0 })}
                />
              </FormField>

              <FormField label="Initial Reservation Status">
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Checked-in">Checked-in (Instant Stay)</option>
                  <option value="Pending">Pending Verification</option>
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
              onClick={() => navigate({ to: "/manager/reservations" })}
              className="h-9 px-5 text-xs font-bold border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors rounded-lg"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-6 text-xs font-bold bg-[#0d1b2a] text-white hover:bg-[#1a2e40] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg transition-all rounded-lg border border-navy/30 flex items-center gap-2"
            >
              {saving ? "Registering..." : (form.source === "Walk-in" ? "Complete Walk-In Check-In" : "Confirm New Reservation")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export const Route = createFileRoute("/manager/reservations/add")({
  component: ManagerAddReservation
});
