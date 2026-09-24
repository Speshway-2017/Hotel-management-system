import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { superAdminService } from "@/services/superAdmin";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Checkbox } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { validateWithZod, walkInBookingSchema } from "@/schemas";

function ManagerEditReservation() {
  const params = useParams() || {};
  const id = params.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form states
  const [guest, setGuest] = useState("");
  const [phone, setPhone] = useState("");
  const [room, setRoom] = useState("");
  const [roomType, setRoomType] = useState("Standard Room");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [nights, setNights] = useState(1);
  const [pax, setPax] = useState("2 Adults");
  const [source, setSource] = useState("Direct");
  const [status, setStatus] = useState("Pending");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [isCorporate, setIsCorporate] = useState(false);
  const [corporateName, setCorporateName] = useState("");

  const [availableRoomsList, setAvailableRoomsList] = useState([]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || (user.role !== "manager" && user.role !== "admin" && user.role !== "super-admin")) {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    const loadBookingDetail = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [mgrRes, superRes, roomsRes] = await Promise.all([
          managerService.getReservations().catch(() => ({ success: false })),
          superAdminService.getReservations().catch(() => ({ success: false })),
          managerService.getRooms().catch(() => ({}))
        ]);

        let allReservations = [];
        if (mgrRes.success && Array.isArray(mgrRes.data)) allReservations.push(...mgrRes.data);
        if (superRes.success && Array.isArray(superRes.data)) allReservations.push(...superRes.data);

        const match = allReservations.find(r => 
          String(r._id) === String(id) || 
          String(r.id) === String(id) || 
          String(r.bookingId) === String(id)
        );

        let currentRoomNum = "";
        let category = "Standard Room";

        if (match) {
          setGuest(match.guest || match.guestName || "");
          setPhone(match.phone || match.mobile || match.phoneNumber || "");
          
          currentRoomNum = match.roomNumber || match.room || "";
          category = match.roomType || match.category || "Standard Room";
          if (currentRoomNum.includes("·")) {
            currentRoomNum = currentRoomNum.split("·")[0].trim();
          }
          if (currentRoomNum.toLowerCase().includes("room")) {
            currentRoomNum = currentRoomNum.replace(/room/i, "").trim();
          }
          
          setRoom(currentRoomNum);
          setRoomType(category);
          if (match.checkIn) setCheckIn(match.checkIn.substring(0, 10));
          if (match.checkOut) setCheckOut(match.checkOut.substring(0, 10));
          setNights(match.nights || 1);
          setPax(match.pax || "2 Adults");
          setSource(match.source || "Direct");
          setStatus(match.status || "Pending");
          setAmount(match.totalAmount || match.amount || "");
          setBalance(match.balance !== undefined ? match.balance : "");
          setNotes(match.notes || "");
          setIsGroupBooking(!!match.isGroupBooking);
          setIsCorporate(!!match.isCorporate);
          setCorporateName(match.corporateName || "");
        } else {
          setError("Reservation details not found.");
        }

        let dbRooms = (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) ? roomsRes.data : [
          { roomNumber: "101", category: "Standard Room", status: "Available" },
          { roomNumber: "102", category: "Standard Room", status: "Available" },
          { roomNumber: "103", category: "Standard Room", status: "Available" },
          { roomNumber: "201", category: "Deluxe Room", status: "Available" },
          { roomNumber: "202", category: "Deluxe Room", status: "Available" },
          { roomNumber: "203", category: "Deluxe Room", status: "Available" },
          { roomNumber: "301", category: "Executive Suite", status: "Available" },
          { roomNumber: "302", category: "Executive Suite", status: "Available" },
          { roomNumber: "303", category: "Executive Suite", status: "Available" },
          { roomNumber: "401", category: "Standard Room", status: "Available" },
          { roomNumber: "402", category: "Standard Room", status: "Available" },
          { roomNumber: "403", category: "Standard Room", status: "Available" }
        ];

        if (currentRoomNum && !dbRooms.some(r => String(r.roomNumber) === String(currentRoomNum))) {
          dbRooms.unshift({
            roomNumber: currentRoomNum,
            category: category,
            status: "Assigned"
          });
        }

        setAvailableRoomsList(dbRooms);
      } catch (err) {
        setError(err.message || "Failed to load reservation details.");
      } finally {
        setLoading(false);
      }
    };
    loadBookingDetail();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const val = validateWithZod(walkInBookingSchema, {
      guest,
      phone,
      room,
      roomType,
      checkIn,
      checkOut,
      nights: Number(nights) || 1,
      amount,
      balance: balance ? Number(balance) : 0,
      pax,
      notes
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      toast.error(val.firstError);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const payload = {
        guest,
        phone,
        roomNumber: room,
        room: room ? `${room} · ${roomType}` : "",
        roomType,
        checkIn,
        checkOut,
        nights: Number(nights) || 1,
        pax,
        source,
        status,
        amount: Number(amount) || 0,
        balance: Number(balance || 0),
        paymentStatus: Number(balance || 0) === 0 ? "Paid" : "Pending",
        notes,
        isGroupBooking,
        isCorporate,
        corporateName
      };

      const res = await managerService.updateReservation(id, payload);
      if (res.success) {
        toast.success("Reservation details updated successfully!");
        import('@/services/socket').then(({ socket }) => {
          socket.emit('booking_updated', { guest, room });
        });
        navigate({ to: "/manager/reservations" });
      } else {
        toast.error(res.message || "Failed to save adjustments.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save adjustments.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to modify reservations for this property.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans pb-12">
      <Crumbs
        items={[
          { label: "Dashboard", to: "/manager" },
          { label: "Today's Operations", to: "/manager/operations" },
          { label: "Reservations", to: "/manager/reservations" },
          { label: `Modify Stay — ${guest || id}` }
        ]}
      />

      <PageHeader
        title={`Modify Reservation: ${guest || id}`}
        subtitle="Adjust room allocation, stay dates, guest folio, tariffs, and distribution parameters."
      />

      {error && <Notice tone="error" title="Synchronization Warning">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Panel title="Guest Identification" description="Contact and identification parameters">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Guest Full Name" required status={fieldErrors.guest ? "error" : undefined} errorMsg={fieldErrors.guest}>
                <Input
                  required
                  nameOnly
                  value={guest}
                  onChange={(e) => {
                    setGuest(e.target.value);
                    if (fieldErrors.guest) setFieldErrors(p => ({ ...p, guest: null }));
                  }}
                />
              </FormField>

              <FormField label="Contact Phone Number" required status={fieldErrors.phone ? "error" : undefined} errorMsg={fieldErrors.phone}>
                <Input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: null }));
                  }}
                />
              </FormField>
            </div>
          </Panel>

          <Panel title="Stay & Room Parameters" description="Scheduled stay dates and room assignment">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="Check-In Date" required>
                <Input
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </FormField>

              <FormField label="Check-Out Date" required>
                <Input
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </FormField>

              <FormField label="Duration (Nights)">
                <Input
                  type="number"
                  min="1"
                  value={nights}
                  onChange={(e) => setNights(Number(e.target.value) || 1)}
                />
              </FormField>

              <FormField label="Room Category">
                <Select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                >
                  <option value="Standard Room">Standard Room</option>
                  <option value="Deluxe Room">Deluxe Room</option>
                  <option value="Executive Suite">Executive Suite</option>
                </Select>
              </FormField>

              <FormField label="Allocated Room #">
                <Select
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {availableRoomsList.map((rm) => (
                    <option key={rm.roomNumber || rm.room} value={rm.roomNumber || rm.room}>
                      Room {rm.roomNumber || rm.room} ({rm.category || rm.roomType || 'Standard'}) - {rm.status}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Guest Capacity (Pax)">
                <Select
                  value={pax}
                  onChange={(e) => setPax(e.target.value)}
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

          <Panel title="Tariff & Financials" description="Reservation billing and channel distribution">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FormField label="Booking Source">
                <Select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
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

              <FormField label="Total Tariff (₹)" status={fieldErrors.amount ? "error" : undefined} errorMsg={fieldErrors.amount}>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(Number(e.target.value) || 0);
                    if (fieldErrors.amount) setFieldErrors(p => ({ ...p, amount: null }));
                  }}
                />
              </FormField>

              <FormField label="Outstanding Balance (₹)">
                <Input
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value) || 0)}
                />
              </FormField>

              <FormField label="Reservation Status">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Checked-in">Checked-in</option>
                  <option value="Checked-out">Checked-out</option>
                  <option value="Pending">Pending</option>
                  <option value="No-show">No-show</option>
                  <option value="Cancelled">Cancelled</option>
                </Select>
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Special Notes / Requests">
                  <Input
                    placeholder="Guest requests..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
              {saving ? "Saving Changes..." : "Save Modifications"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export const Route = createFileRoute("/manager/reservations/edit/$id")({
  component: ManagerEditReservation
});
