import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader, Panel, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Checkbox } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { extractRoomNumber } from "@/utils/roomUtils";

function AddReservation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [availableRoomsList, setAvailableRoomsList] = useState([]);

  // Form states
  const searchParams = new URLSearchParams(window.location.search);
  const [guest, setGuest] = useState(searchParams.get("guest") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [idProofType, setIdProofType] = useState(searchParams.get("idProofType") || "Aadhaar Card");
  const [idProofNumber, setIdProofNumber] = useState(searchParams.get("idProofNumber") || "");
  const [room, setRoom] = useState(searchParams.get("room") || "");
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || "");
  const [nights, setNights] = useState(1);
  const [pax, setPax] = useState("2 Adults");
  const [source, setSource] = useState("Direct");
  const [status, setStatus] = useState(searchParams.get("status") || "Pending");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [isGroupBooking, setIsGroupBooking] = useState(false);

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

        // Helper to extract all 3-4 digit room numbers from any reservation object
        const extractNums = (resObj) => {
          const combined = `${resObj.room || ''} ${resObj.roomNumber || ''} ${resObj.assignedRoom || ''} ${resObj.num || ''}`;
          const matches = combined.match(/\b\d{3,4}\b/g);
          return matches ? Array.from(new Set(matches.map(m => m.trim()))) : [];
        };

        // Determine occupied / reserved / confirmed rooms from live reservations
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

        // Filter out occupied, reserved, confirmed, or blocked rooms
        const availableRooms = dbRooms
          .map(r => ({
            num: String(r.roomNumber || r.num || ''),
            type: r.category || 'Standard Room',
            status: r.status || 'Available'
          }))
          .filter(r => {
            if (!r.num) return false;
            if (occupied.has(r.num)) return false; // Reserved / Confirmed / Occupied by reservation
            const roomStat = String(r.status || 'Available').toLowerCase().trim();
            return roomStat === 'available' || roomStat === 'vacant';
          });

        // Deduplicate by room number & sort ascending
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
      } catch (err) {
        console.error("Failed to load real available rooms:", err);
      }
    };
    fetchRealAvailableRooms();
  }, []);

  // Auto-calculate nights and total amount whenever room designation, checkIn, or checkOut changes
  useEffect(() => {
    if (checkIn && checkOut) {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 > d1) {
        const calculatedNights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        setNights(calculatedNights);

        let ratePerNight = 3500;
        if (room) {
          const selectedObj = availableRoomsList.find(r => String(r.num) === String(room));
          if (selectedObj) {
            const typeStr = String(selectedObj.type || '').toLowerCase();
            if (typeStr.includes('executive')) ratePerNight = 6500;
            else if (typeStr.includes('deluxe')) ratePerNight = 4500;
            else if (typeStr.includes('villa')) ratePerNight = 8500;
            else if (typeStr.includes('standard')) ratePerNight = 3000;
            else if (selectedObj.rate || selectedObj.baseRate) ratePerNight = Number(selectedObj.rate || selectedObj.baseRate);
          }
        }
        const totalTariff = ratePerNight * calculatedNights;
        setAmount(totalTariff);
      }
    }
  }, [checkIn, checkOut, room, availableRoomsList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const roomNum = extractRoomNumber(room);
      const roomType = room && room.includes('·') ? room.split('·')[1]?.trim() : (room || "Standard Room");
      const payload = {
        guest,
        phone,
        email,
        idProofType,
        idProofNumber,
        room: roomNum ? `${roomNum} · ${roomType}` : room,
        roomNumber: roomNum,
        roomType: roomType,
        checkIn,
        checkOut,
        nights: Number(nights),
        pax,
        source,
        status,
        amount: Number(amount),
        balance: Number(balance || 0),
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
      toast.error(err.message || "Failed to log booking.");
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
              <FormField label="Guest Name" required className="col-span-2" id="guest">
                <Input
                  id="guest"
                  type="text"
                  required
                  value={guest}
                  onChange={(e) => setGuest(e.target.value)}
                  placeholder="Enter guest's full name"
                />
              </FormField>

              <FormField label="Phone Number" required id="phone">
                <Input
                  id="phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </FormField>

              <FormField label="Email Address" id="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setIdProofNumber(e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                />
              </FormField>

              <FormField label="Room Designation" id="room">
                <Select
                  id="room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                >
                  <option value="">Select Available Room</option>
                  {availableRoomsList.map((r) => (
                    <option key={r.num} value={r.num}>
                      Room #{r.num} ({r.type})
                    </option>
                  ))}
                </Select>
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
              <Button type="submit" disabled={loading} className="bg-navy hover:bg-navy/90 text-white h-10 px-6 font-bold rounded-full">
                {loading ? "Creating..." : "Create Booking"}
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
