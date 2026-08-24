import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, PageHeader, Notice, LoadingRows, Tag, Panel } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import {
  CalendarCheck,
  Bed,
  Users,
  ConciergeBell,
  Search,
  Check,
  LogOut,
  Sparkles,
  ClipboardList,
  DollarSign,
  UserCheck,
  XCircle,
  FileText,
  Plus,
  ArrowRight,
  Sliders,
  Calendar,
  ChevronRight,
  Eye,
  CreditCard,
  CalendarDays
} from "lucide-react";

const operationsTabs = [
  { label: "Reservations", to: "/admin/reservations", icon: CalendarCheck },
  { label: "Rooms & Rates", to: "/admin/rooms", icon: Bed },
  { label: "Guests", to: "/admin/guests", icon: Users },
  { label: "Front Desk", to: "/admin/front-desk", icon: ConciergeBell }
];

export const Route = createFileRoute("/admin/front-desk")({
  head: () => ({
    meta: [
      { title: "Front Desk Operations — Speshway Luxury Hotel" },
      { name: "description", content: "Visual room status grid, check-in, check-out, and billing folio management." }
    ]
  }),
  component: FrontDeskPage
});

// Seed default hotel rooms state
const initialRooms = [
  { num: "101", type: "Villa Suite", floor: "Floor 1" },
  { num: "102", type: "Villa Suite", floor: "Floor 1" },
  { num: "103", type: "Heritage Luxury", floor: "Floor 1" },
  { num: "104", type: "Heritage Luxury", floor: "Floor 1" },
  { num: "105", type: "Heritage Luxury", floor: "Floor 1" },
  { num: "106", type: "Superior Deluxe", floor: "Floor 1" },
  { num: "107", type: "Superior Deluxe", floor: "Floor 1" },
  { num: "108", type: "Superior Deluxe", floor: "Floor 1" },

  { num: "201", type: "Maharaja Suite", floor: "Floor 2" },
  { num: "202", type: "Maharaja Suite", floor: "Floor 2" },
  { num: "203", type: "Villa Suite", floor: "Floor 2" },
  { num: "204", type: "Heritage Luxury", floor: "Floor 2" },
  { num: "205", type: "Heritage Luxury", floor: "Floor 2" },
  { num: "206", type: "Superior Deluxe", floor: "Floor 2" },
  { num: "207", type: "Superior Deluxe", floor: "Floor 2" },
  { num: "208", type: "Superior Deluxe", floor: "Floor 2" },

  { num: "301", type: "Maharaja Suite", floor: "Floor 3" },
  { num: "302", type: "Maharaja Suite", floor: "Floor 3" },
  { num: "303", type: "Villa Suite", floor: "Floor 3" },
  { num: "304", type: "Heritage Luxury", floor: "Floor 3" },
  { num: "305", type: "Heritage Luxury", floor: "Floor 3" },
  { num: "306", type: "Superior Deluxe", floor: "Floor 3" },
  { num: "307", type: "Superior Deluxe", floor: "Floor 3" },
  { num: "308", type: "Superior Deluxe", floor: "Floor 3" }
];

// Premium stat card component
function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full text-left"
    >
      <div>
        <div className="h-8 flex items-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        </div>
        <h3 className="mt-1.5 font-display text-lg font-black text-navy leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[10px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

function FrontDeskPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Core PMS states
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const targetDate = "2026-08-24";

  // Interaction Dialog flags
  const [selectedFolio, setSelectedFolio] = useState(null);
  const [isFolioOpen, setIsFolioOpen] = useState(false);

  // Quick Action Modal states
  const [activeModal, setActiveModal] = useState(null); // 'walkin' | 'checkin' | 'checkout' | 'assign' | 'change' | 'extend' | 'payment'

  // Modal Form States
  const [formGuest, setFormGuest] = useState("");
  const [formRoomNum, setFormRoomNum] = useState("");
  const [formRoomType, setFormRoomType] = useState("Villa Suite");
  const [formNights, setFormNights] = useState("1");
  const [formSource, setFormSource] = useState("Direct");
  const [formRate, setFormRate] = useState("38900");
  const [formPaymentStatus, setFormPaymentStatus] = useState("Paid");
  const [formAmountPaid, setFormAmountPaid] = useState("38900");

  const [targetBookingId, setTargetBookingId] = useState("");
  const [targetRoomNum, setTargetRoomNum] = useState("");
  const [extendNightsCount, setExtendNightsCount] = useState("2");
  const [collectAmount, setCollectAmount] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const roomsRes = await adminService.getRooms().catch(() => ({ success: true, data: [] }));
      const mappedRooms = (roomsRes.data || []).map(r => ({
        num: r.roomNumber,
        type: r.category,
        status: r.status
      }));
      setRooms(mappedRooms.length > 0 ? mappedRooms : initialRooms);

      const res = await superAdminService.getReservations();
      setReservations(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to initialize frontdesk datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // State modification logic
  const handleWalkinSubmit = async (e) => {
    e.preventDefault();
    if (!formGuest || !formRoomNum) {
      toast.error("Please enter guest name and select room.");
      return;
    }

    const matchedRoom = rooms.find(r => r.num === formRoomNum);
    const cost = Number(formRate) * Number(formNights);
    const amtPaid = formPaymentStatus === "Paid" ? cost : formPaymentStatus === "Partial" ? Number(formAmountPaid) : 0;
    const balance = cost - amtPaid;

    const newBooking = {
      guest: formGuest,
      phone: formPhone,
      room: formRoomNum,
      category: matchedRoom ? matchedRoom.type : formRoomType,
      checkIn: targetDate,
      checkOut: new Date(new Date(targetDate).getTime() + Number(formNights) * 86400000).toISOString().split("T")[0],
      status: "Checked-in",
      paymentStatus: formPaymentStatus,
      source: formSource,
      balance,
      amount: cost,
      nights: Number(formNights)
    };

    try {
      await superAdminService.createReservation(newBooking);
      toast.success(`Walk-in guest ${formGuest} checked-in to room #${formRoomNum}!`);
      loadData();
      setActiveModal(null);
      clearFormFields();
    } catch (err) {
      toast.error(err.message || "Failed to register walk-in check-in.");
    }
  };

  const handleCheckinAction = async (bookingId) => {
    const booking = reservations.find(r => (r._id || r.id) === bookingId);
    if (!booking) return;

    if (!booking.room) {
      toast.error("Please assign a room number first before checking in.");
      return;
    }

    try {
      const targetId = booking._id || booking.id;
      await superAdminService.updateReservation(targetId, { status: "Checked-in" });
      toast.success(`Guest ${booking.guest} successfully checked-in.`);
      loadData();
      setActiveModal(null);
    } catch (err) {
      toast.error(err.message || "Failed to complete check-in.");
    }
  };

  const handleCheckoutAction = async (bookingId) => {
    const booking = reservations.find(r => (r._id || r.id) === bookingId);
    if (!booking) return;

    if (booking.balance > 0) {
      toast.warning(`Guest has an outstanding balance of ₹${booking.balance}. Collect payment before completing check-out.`);
      return;
    }

    try {
      const targetId = booking._id || booking.id;
      await superAdminService.updateReservation(targetId, { status: "Checked-out" });
      toast.success(`Guest ${booking.guest} successfully checked-out.`);
      loadData();
      setActiveModal(null);
    } catch (err) {
      toast.error(err.message || "Failed to complete check-out.");
    }
  };

  const handleAssignRoomSubmit = async (e) => {
    e.preventDefault();
    if (!targetBookingId || !targetRoomNum) return;

    try {
      const booking = reservations.find(r => (r._id || r.id) === targetBookingId);
      const targetId = booking?._id || booking?.id || targetBookingId;
      await superAdminService.updateReservation(targetId, { room: targetRoomNum });
      toast.success("Room mapping assigned successfully.");
      loadData();
      setActiveModal(null);
    } catch (err) {
      toast.error(err.message || "Failed to map room assignment.");
    }
  };

  const handleChangeRoomSubmit = async (e) => {
    e.preventDefault();
    if (!targetBookingId || !targetRoomNum) return;

    const booking = reservations.find(r => (r._id || r.id) === targetBookingId);
    if (!booking) return;

    const oldRoom = booking.room;

    try {
      const targetId = booking._id || booking.id;
      await superAdminService.updateReservation(targetId, { room: targetRoomNum });
      toast.success(`Room changed from #${oldRoom} to #${targetRoomNum}.`);
      loadData();
      setActiveModal(null);
    } catch (err) {
      toast.error(err.message || "Failed to update room change.");
    }
  };

  const handleExtendStaySubmit = async (e) => {
    e.preventDefault();
    if (!targetBookingId || !extendNightsCount) return;

    const booking = reservations.find(r => (r._id || r.id) === targetBookingId);
    if (!booking) return;

    const addedCost = (booking.amount / booking.nights) * Number(extendNightsCount);
    const payload = {
      nights: booking.nights + Number(extendNightsCount),
      amount: booking.amount + addedCost,
      balance: booking.balance + addedCost,
      checkOut: new Date(new Date(booking.checkOut).getTime() + Number(extendNightsCount) * 86400000).toISOString().split("T")[0]
    };

    try {
      const targetId = booking._id || booking.id;
      await superAdminService.updateReservation(targetId, payload);
      toast.success("Stay extension registered successfully.");
      loadData();
      setActiveModal(null);
    } catch (err) {
      toast.error(err.message || "Failed to extend stay.");
    }
  };

  const handleCollectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!targetBookingId || !collectAmount) return;

    const booking = reservations.find(r => (r._id || r.id) === targetBookingId);
    if (!booking) return;

    const remaining = Math.max(0, booking.balance - Number(collectAmount));
    const payload = {
      balance: remaining,
      paymentStatus: remaining === 0 ? "Paid" : "Partial"
    };

    try {
      const targetId = booking._id || booking.id;
      await superAdminService.updateReservation(targetId, payload);
      
      // Log payment record in payments database collection
      await adminService.createPayment({
        bookingId: targetId,
        guestName: booking.guest,
        amount: Number(collectAmount),
        paymentMethod: 'Card',
        status: 'Settled'
      });

      toast.success(`Collected payment of ₹${Number(collectAmount).toLocaleString()}. Folio updated.`);
      loadData();
      setActiveModal(null);
    } catch (err) {
      toast.error(err.message || "Failed to record payment.");
    }
  };

  const clearFormFields = () => {
    setFormGuest("");
    setFormRoomNum("");
    setFormNights("1");
    setFormAmountPaid("38900");
    setFormRate("38900");
    setTargetBookingId("");
    setTargetRoomNum("");
    setCollectAmount("");
  };

  // Helper selectors
  const activeCheckInsToday = reservations.filter(r => r.checkIn === targetDate);
  const activeCheckOutsToday = reservations.filter(r => r.checkOut === targetDate);
  const inHouseGuests = reservations.filter(r => r.status === "Checked-in");

  // Room assignments selector
  const roomReservations = {};
  reservations.forEach((r) => {
    if (r.room && r.status !== "Checked-out" && r.status !== "Cancelled") {
      roomReservations[r.room] = r;
    }
  });

  // KPI count metrics
  const arrivalsTodayCount = activeCheckInsToday.length;
  const departuresTodayCount = activeCheckOutsToday.length;
  const inHouseGuestsCount = inHouseGuests.length;

  const occupiedRoomsCount = rooms.filter(r => roomReservations[r.num]?.status === "Checked-in").length;
  const availableRoomsCount = rooms.length - occupiedRoomsCount;

  // Search filter implementation
  const filterBooking = (r) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      r.guest.toLowerCase().includes(term) ||
      (r.room && r.room.toLowerCase().includes(term)) ||
      r._id.toLowerCase().includes(term)
    );
  };

  const filteredArrivals = activeCheckInsToday.filter(filterBooking);
  const filteredDepartures = activeCheckOutsToday.filter(filterBooking);
  const filteredInHouse = inHouseGuests.filter(filterBooking);

  // Status mapping colors helper
  const statusMeta = {
    Available: { tone: "success", label: "Available" },
    Occupied: { tone: "brand", label: "Occupied" },
    Reserved: { tone: "warning", label: "Reserved" }
  };

  const getRoomOccupationalStatus = (room) => {
    const res = roomReservations[room.num];
    if (res) {
      if (res.status === "Checked-in") return "Occupied";
      if (res.status === "Pending") return "Reserved";
    }
    return "Available";
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Front Desk Operations" subtitle="Synchronizing room configurations..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui">
      


      {/* 2. Stat KPIs Grid matching other pages */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 select-none">
        <PremiumStatCard label="Arrivals Today" value={arrivalsTodayCount.toString()} hint="Expected arrivals" accentColor="#f59e0b" />
        <PremiumStatCard label="Departures Today" value={departuresTodayCount.toString()} hint="Expected departures" accentColor="#6366f1" />
        <PremiumStatCard label="In-House Guests" value={inHouseGuestsCount.toString()} hint="Active guest stays" accentColor="#3b82f6" />
        <PremiumStatCard label="Available Rooms" value={availableRoomsCount.toString()} hint="Available rooms" accentColor="#10b981" />
        <PremiumStatCard label="Occupied Rooms" value={occupiedRoomsCount.toString()} hint="Occupied rooms" accentColor="#0d1b2a" />
      </div>

      {/* 3. Navigation Tabs (Overview | Arrivals | Departures | In-House | Room Status) & Search next to it */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-muted pb-px select-none">
        <div className="flex flex-wrap gap-1">
          {[
            { id: "overview", label: "Desk Overview" },
            { id: "arrivals", label: `Arrivals (${filteredArrivals.length})` },
            { id: "departures", label: `Departures (${filteredDepartures.length})` },
            { id: "inhouse", label: `In-House Guests (${filteredInHouse.length})` },
            { id: "rooms", label: "Room Status Grid" }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px focus:outline-none cursor-pointer ${
                activeTab === t.id
                  ? "border-navy text-navy"
                  : "border-transparent text-muted-foreground hover:text-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72 mb-1 lg:mb-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 left-3 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search guest, room, or booking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-8.5 border border-[#E7E9EE] hover:border-navy/20 focus:border-navy focus:ring-2 focus:ring-navy/10 rounded-lg text-xs bg-[#fafafa]/40 transition-all font-sans"
          />
        </div>
      </div>

      {/* Active Tab Contents */}

      {/* Tab 1: Overview Panel */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Panel title="Today's Active Arrivals Calendar" description="Pending arrivals checking in today.">
              {filteredArrivals.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground select-none">No arrivals scheduled for today.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                        <th className="py-2.5 px-4">Guest</th>
                        <th className="py-2.5 px-4">Room Specs</th>
                        <th className="py-2.5 px-4">Arrival</th>
                        <th className="py-2.5 px-4">Source</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30">
                      {filteredArrivals.map((arr) => (
                        <tr key={arr._id} className="hover:bg-muted/5">
                          <td className="py-3 px-4 font-bold text-navy">{arr.guest}</td>
                          <td className="py-3 px-4">{arr.room ? `Room ${arr.room}` : "Not Assigned"} ({arr.category})</td>
                          <td className="py-3 px-4">{arr.arrivalTime}</td>
                          <td className="py-3 px-4 font-mono text-[10px]">{arr.source}</td>
                          <td className="py-3 px-4">
                            <Tag tone={arr.status === "Checked-in" ? "success" : "warning"}>{arr.status}</Tag>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Expected Departures Today" description="Guests scheduled for check-out.">
              {filteredDepartures.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground select-none">No departures scheduled for today.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                        <th className="py-2.5 px-4">Guest</th>
                        <th className="py-2.5 px-4">Room</th>
                        <th className="py-2.5 px-4">Folio Balance</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30">
                      {filteredDepartures.map((dep) => (
                        <tr key={dep._id} className="hover:bg-muted/5">
                          <td className="py-3 px-4 font-bold text-navy">{dep.guest}</td>
                          <td className="py-3 px-4">Room {dep.room}</td>
                          <td className="py-3 px-4 font-semibold text-navy">₹{dep.balance?.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <Tag tone={dep.status === "Checked-out" ? "neutral" : "brand"}>{dep.status}</Tag>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          {/* Quick Actions sidebar panel and status Index Legend */}
          <div className="space-y-4">
            
            {/* Quick Actions in a clean stack box container above status index */}
            <Panel title="Desk Quick Actions" description="Fast operations commands.">
              <div className="p-4 space-y-2 select-none">
                <button
                  onClick={() => { clearFormFields(); setActiveModal("walkin"); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-muted hover:bg-muted/20 text-xs font-bold text-navy transition-all"
                >
                  <span className="flex items-center gap-2"><Plus className="size-4 text-brand" /> New Walk-In</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => { clearFormFields(); setActiveModal("checkin"); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-muted hover:bg-muted/20 text-xs font-bold text-navy transition-all"
                >
                  <span className="flex items-center gap-2"><UserCheck className="size-4 text-success" /> Process Check-In</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => { clearFormFields(); setActiveModal("checkout"); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-muted hover:bg-muted/20 text-xs font-bold text-navy transition-all"
                >
                  <span className="flex items-center gap-2"><LogOut className="size-4 text-destructive" /> Process Check-Out</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => navigate({ to: "/admin/front-desk/assign" })}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-muted hover:bg-muted/20 text-xs font-bold text-navy transition-all"
                >
                  <span className="flex items-center gap-2"><Plus className="size-4 text-warning" /> Assign Room Key</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => { clearFormFields(); setActiveModal("change"); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-muted hover:bg-muted/20 text-xs font-bold text-navy transition-all"
                >
                  <span className="flex items-center gap-2"><Sliders className="size-4 text-navy" /> Move Room Key</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            </Panel>

            <Panel title="Room Status Index" description="Color coding parameters.">
              <div className="p-4 space-y-3 text-xs select-none">
                <div className="flex items-center justify-between font-semibold"><span className="flex items-center gap-2"><span className="size-3 rounded bg-success/20 border border-success/45" /> Vacant Available</span> <span className="text-muted-foreground font-mono">Available</span></div>
                <div className="flex items-center justify-between font-semibold"><span className="flex items-center gap-2"><span className="size-3 rounded bg-brand/20 border border-brand/45" /> Guest In-House</span> <span className="text-muted-foreground font-mono">Occupied</span></div>
                <div className="flex items-center justify-between font-semibold"><span className="flex items-center gap-2"><span className="size-3 rounded bg-warning/20 border border-warning/45" /> Blocked/Reserved</span> <span className="text-muted-foreground font-mono">Reserved</span></div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* Tab 2: Arrivals Table */}
      {activeTab === "arrivals" && (
        <Panel title="Today's Expected Arrivals Catalog" description="Manage guest pre-allocations and payments.">
          {filteredArrivals.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground select-none">No arrivals match the current search filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Reservation ID</th>
                    <th className="py-3 px-4">Room Allocation</th>
                    <th className="py-3 px-4">Room Type</th>
                    <th className="py-3 px-4">Arrival Time</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-left font-bold" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30">
                  {filteredArrivals.map((arr) => (
                    <tr key={arr._id} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-bold text-navy">{arr.guest}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px]">{arr._id}</td>
                      <td className="py-3.5 px-4 font-bold">{arr.room ? `Room ${arr.room}` : "Unassigned"}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{arr.category}</td>
                      <td className="py-3.5 px-4">{arr.arrivalTime}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          arr.paymentStatus === "Paid" ? "bg-success/10 text-success" : arr.paymentStatus === "Partial" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                        }`}>{arr.paymentStatus}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px]">{arr.source}</td>
                      <td className="py-3.5 px-4"><Tag tone={arr.status === "Checked-in" ? "success" : "warning"}>{arr.status}</Tag></td>
                      <td className="py-3 px-4 text-left" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                        <div className="flex items-center justify-start gap-1 select-none">
                          <Button
                            onClick={() => navigate({ to: `/admin/reservations/view/${arr._id}` })}
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 flex items-center justify-center rounded-full"
                            title="View details"
                          >
                            <Eye className="size-4" />
                          </Button>
                          {arr.status === "Pending" && (
                            !arr.room ? (
                              <Button
                                onClick={() => navigate({ to: `/admin/front-desk/assign/${arr._id}` })}
                                variant="outline"
                                className="h-7 w-7 p-0 border-muted hover:bg-muted/15 text-navy flex items-center justify-center rounded-full"
                                title="Assign Room"
                              >
                                <Sliders className="size-4" />
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleCheckinAction(arr._id)}
                                className="h-7 w-7 p-0 bg-navy hover:bg-navy-deep text-white flex items-center justify-center rounded-full"
                                title="Check-In"
                              >
                                <UserCheck className="size-4" />
                              </Button>
                            )
                          )}
                          {arr.balance > 0 && (
                            <Button
                              onClick={() => navigate({ to: `/admin/front-desk/payment/${arr._id}` })}
                              className="h-7 w-7 p-0 bg-success hover:bg-success/90 text-white flex items-center justify-center rounded-full"
                              title="Collect Pay"
                            >
                              <CreditCard className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* Tab 3: Departures Table */}
      {activeTab === "departures" && (
        <Panel title="Expected Departures List" description="Manage settlements and room checkout procedures.">
          {filteredDepartures.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground select-none">No departures match the current search filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4">Checkout Target</th>
                    <th className="py-3 px-4">Folio Balance</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-left font-bold" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30">
                  {filteredDepartures.map((dep) => (
                    <tr key={dep._id} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-bold text-navy">{dep.guest}</td>
                      <td className="py-3.5 px-4 font-bold">Room {dep.room}</td>
                      <td className="py-3.5 px-4">12:00 PM</td>
                      <td className="py-3.5 px-4 font-semibold text-navy">₹{dep.balance?.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          dep.paymentStatus === "Paid" ? "bg-success/10 text-success" : dep.paymentStatus === "Partial" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                        }`}>{dep.paymentStatus}</span>
                      </td>
                      <td className="py-3.5 px-4"><Tag tone={dep.status === "Checked-out" ? "neutral" : "brand"}>{dep.status}</Tag></td>
                      <td className="py-3 px-4 text-left" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                        <div className="flex items-center justify-start gap-1 select-none">
                          <Button
                            onClick={() => navigate({ to: `/admin/reservations/view/${dep._id}` })}
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 flex items-center justify-center rounded-full"
                            title="View details"
                          >
                            <Eye className="size-4" />
                          </Button>
                          {dep.balance > 0 && (
                            <Button
                              onClick={() => navigate({ to: `/admin/front-desk/payment/${dep._id}` })}
                              className="h-7 w-7 p-0 bg-success hover:bg-success/90 text-white flex items-center justify-center rounded-full"
                              title="Collect Pay"
                            >
                              <CreditCard className="size-4" />
                            </Button>
                          )}
                          {dep.status === "Checked-in" && (
                            <Button
                              onClick={() => handleCheckoutAction(dep._id)}
                              className="h-7 w-7 p-0 bg-navy hover:bg-navy-deep text-white flex items-center justify-center rounded-full"
                              title="Check-Out"
                            >
                              <LogOut className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* Tab 4: In-House Guests Table */}
      {activeTab === "inhouse" && (
        <Panel title="Active Stay Guests" description="Currently checked-in hotel residents.">
          {filteredInHouse.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground select-none">No active guests found stay-in.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Assigned Room</th>
                    <th className="py-3 px-4">Check-In Date</th>
                    <th className="py-3 px-4">Departure Target</th>
                    <th className="py-3 px-4">Stay Nights</th>
                    <th className="py-3 px-4">Balance</th>
                    <th className="py-3 px-4 text-left font-bold" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30">
                  {filteredInHouse.map((res) => (
                    <tr key={res._id} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-bold text-navy">{res.guest}</td>
                      <td className="py-3.5 px-4 font-mono font-bold">#{res.room}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{res.checkIn}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{res.checkOut}</td>
                      <td className="py-3.5 px-4">{res.nights} Nights</td>
                      <td className="py-3.5 px-4 font-semibold text-navy">₹{res.balance?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-left" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                        <div className="flex items-center justify-start gap-1 select-none">
                          <Button
                            onClick={() => navigate({ to: `/admin/reservations/view/${res._id}` })}
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 flex items-center justify-center rounded-full"
                            title="View details"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            onClick={() => { setTargetBookingId(res._id); setTargetRoomNum(res.room); setActiveModal("change"); }}
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:text-navy hover:bg-muted/15 flex items-center justify-center rounded-full"
                            title="Move Room"
                          >
                            <Sliders className="size-4" />
                          </Button>
                          <Button
                            onClick={() => { setTargetBookingId(res._id); setExtendNightsCount("1"); setActiveModal("extend"); }}
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:text-navy hover:bg-muted/15 flex items-center justify-center rounded-full"
                            title="Extend Stay"
                          >
                            <CalendarDays className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* Tab 5: Room Status Grid */}
      {activeTab === "rooms" && (
        <div className="space-y-6">
          {["Floor 3", "Floor 2", "Floor 1"].map((floor) => {
            const roomsOnFloor = rooms.filter(r => r.floor === floor);
            return (
              <div key={floor} className="space-y-3">
                <h4 className="font-display font-black text-navy text-sm border-b border-muted pb-1 select-none">{floor} Layout</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {roomsOnFloor.map((room) => {
                    const activeRes = roomReservations[room.num];
                    const occStatus = getRoomOccupationalStatus(room);
                    const meta = statusMeta[occStatus] || statusMeta.Available;

                    return (
                      <div
                        key={room.num}
                        className={`rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between min-h-[140px] bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lift border-l-4 ${
                          occStatus === "Occupied" ? "border-l-brand" : occStatus === "Reserved" ? "border-l-warning" : "border-l-success"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 select-none">
                          <div>
                            <span className="font-mono text-base font-bold text-navy">#{room.num}</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{room.type}</p>
                          </div>
                          
                          <Tag tone={meta.tone}>{meta.label}</Tag>
                        </div>

                        {activeRes ? (
                          <div className="my-2.5 text-left">
                            <h5 className="font-bold text-navy text-xs truncate">{activeRes.guest}</h5>
                            <p className="text-[9.5px] text-muted-foreground">{activeRes.checkIn} → {activeRes.checkOut}</p>
                          </div>
                        ) : (
                          <div className="my-2.5 text-left">
                            <span className="text-[11px] text-muted-foreground/60 italic">Vacant Available</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-muted/50 flex items-center justify-end select-none">
                          {activeRes && (
                            <Button
                              onClick={() => { setSelectedFolio(activeRes); setIsFolioOpen(true); }}
                              size="icon" variant="ghost" className="size-7.5"
                              title="View Folio"
                            >
                              <FileText className="size-3.5 text-navy" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Folio Invoice overlay modal */}
      {isFolioOpen && selectedFolio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-navy text-sm">Guest Folio Invoice</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Booking Reference: #{selectedFolio._id?.toUpperCase()}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => {
                  setIsFolioOpen(false);
                  setSelectedFolio(null);
                }}
              >
                <XCircle className="size-4" />
              </Button>
            </div>
            
            <div className="p-5 space-y-4 text-xs text-navy">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-muted/50">
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">Guest Profile</span>
                  <strong className="block text-xs font-bold mt-0.5">{selectedFolio.guest}</strong>
                </div>
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">Room Number</span>
                  <strong className="block text-xs font-bold mt-0.5">#{selectedFolio.room || "Pending Assignment"}</strong>
                </div>
              </div>

              <div>
                <span className="text-[9.5px] uppercase font-bold text-muted-foreground mb-1 block">Folio Transactions</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-muted text-[11px]">
                    <span>Base Tariff ({selectedFolio.nights} nights)</span>
                    <strong className="font-bold">₹{selectedFolio.amount?.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-muted text-[11px]">
                    <span>CGST/SGST Tax (18%)</span>
                    <strong className="font-bold">₹{Math.round(selectedFolio.amount * 0.18).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-muted/50 flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">Grand Total</span>
                  <strong className="text-sm font-black text-navy block">₹{Math.round(selectedFolio.amount * 1.18).toLocaleString()}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">Outstanding Balance</span>
                  <strong className={`text-xs font-black block ${selectedFolio.balance === 0 ? "text-success" : "text-destructive"}`}>
                    {selectedFolio.balance === 0 ? "Settled" : `₹${selectedFolio.balance?.toLocaleString()}`}
                  </strong>
                </div>
              </div>

              <div className="pt-4 border-t border-muted/50 flex justify-end gap-2 select-none">
                <Button
                  onClick={() => {
                    setIsFolioOpen(false);
                    setSelectedFolio(null);
                    toast.success("Print command sent to network terminal printer.");
                  }}
                  className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-5 font-bold rounded-full"
                >
                  Print Invoice Folio
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Quick Action Modals overlay */}

      {/* Modal A: Walk-In check-in */}
      {activeModal === "walkin" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-navy text-sm">Register Walk-In Guest</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Onboard an unscheduled guest check-in directly.</p>
              </div>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => setActiveModal(null)}>
                <XCircle className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleWalkinSubmit} className="p-5 space-y-4">
              <FormField label="Guest Full Name" required id="formGuest">
                <Input
                  id="formGuest"
                  required
                  placeholder="e.g. Vikram Seth"
                  value={formGuest}
                  onChange={(e) => setFormGuest(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Select Room Key" required id="formRoomNum">
                  <Select
                    id="formRoomNum"
                    value={formRoomNum}
                    onChange={(e) => {
                      const num = e.target.value;
                      setFormRoomNum(num);
                      const matched = rooms.find(r => r.num === num);
                      if (matched) {
                        const base = matched.type === "Villa Suite" ? 38900 : matched.type === "Maharaja Suite" ? 24500 : matched.type === "Heritage Luxury" ? 11400 : 8500;
                        setFormRate(base.toString());
                      }
                    }}
                    className="font-bold text-xs h-10"
                  >
                    <option value="">-- Choose Vacant Room --</option>
                    {rooms
                      .filter(r => !roomReservations[r.num])
                      .map(r => (
                        <option key={r.num} value={r.num}>Room #{r.num} ({r.type})</option>
                      ))}
                  </Select>
                </FormField>

                <FormField label="Stay Nights" required id="formNights">
                  <Select
                    id="formNights"
                    value={formNights}
                    onChange={(e) => setFormNights(e.target.value)}
                    className="font-bold text-xs h-10"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <option key={n} value={n}>{n} Night{n > 1 ? "s" : ""}</option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Booking Source" required id="formSource">
                  <Select
                    id="formSource"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="font-bold text-xs h-10"
                  >
                    <option value="Direct">Direct Walk-In</option>
                    <option value="MMT">MakeMyTrip Walk-In</option>
                    <option value="Booking.com">Booking.com Walk-In</option>
                  </Select>
                </FormField>

                <FormField label="Daily Rate (₹)" required id="formRate">
                  <Input
                    id="formRate"
                    type="number"
                    required
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Payment Status" required id="formPaymentStatus">
                  <Select
                    id="formPaymentStatus"
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value)}
                    className="font-bold text-xs h-10"
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Partial">Partial Deposit</option>
                    <option value="Unpaid">Unpaid Folio</option>
                  </Select>
                </FormField>

                {formPaymentStatus === "Partial" && (
                  <FormField label="Deposit Amount (₹)" required id="formAmountPaid">
                    <Input
                      id="formAmountPaid"
                      type="number"
                      value={formAmountPaid}
                      onChange={(e) => setFormAmountPaid(e.target.value)}
                    />
                  </FormField>
                )}
              </div>

              <div className="pt-4 border-t border-muted/50 flex justify-end gap-2.5 select-none">
                <Button type="button" variant="ghost" className="h-10 text-xs px-5 rounded-full" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full">
                  Check-In Guest
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal B: Check-in list */}
      {activeModal === "checkin" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-sm">Select Arrival for Check-In</h3>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => setActiveModal(null)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            
            <div className="p-5 space-y-2 max-h-[300px] overflow-y-auto">
              {reservations.filter(r => r.status === "Pending" && r.checkIn === targetDate).length === 0 ? (
                <div className="text-center text-xs text-muted-foreground p-4">No pending arrivals today.</div>
              ) : (
                reservations
                  .filter(r => r.status === "Pending" && r.checkIn === targetDate)
                  .map(r => (
                    <button
                      key={r._id}
                      onClick={() => handleCheckinAction(r._id)}
                      className="w-full text-left p-3 border border-muted rounded-xl hover:bg-muted/15 transition-all text-xs font-bold text-navy flex justify-between items-center"
                    >
                      <div>
                        <span>{r.guest}</span>
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{r.category} — {r.room ? `Room ${r.room}` : "No room key assigned"}</p>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal C: Check-out list */}
      {activeModal === "checkout" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-sm">Select Resident for Check-Out</h3>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => setActiveModal(null)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            
            <div className="p-5 space-y-2 max-h-[300px] overflow-y-auto">
              {inHouseGuests.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground p-4">No stay-in residents checked-in.</div>
              ) : (
                inHouseGuests.map(r => (
                  <button
                    key={r._id}
                    onClick={() => handleCheckoutAction(r._id)}
                    className="w-full text-left p-3 border border-muted rounded-xl hover:bg-muted/15 transition-all text-xs font-bold text-navy flex justify-between items-center"
                  >
                    <div>
                      <span>{r.guest}</span>
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Room #{r.room} (Balance: ₹{r.balance})</p>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal D: Assign Room mappings */}
      {activeModal === "assign" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-sm">Assign Room Mapping</h3>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => setActiveModal(null)}>
                <XCircle className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleAssignRoomSubmit} className="p-5 space-y-4">
              <FormField label="Target Reservation" required id="targetBookingId">
                <Select
                  id="targetBookingId"
                  value={targetBookingId}
                  onChange={(e) => setTargetBookingId(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="">-- Choose Reservation --</option>
                  {reservations
                    .filter(r => !r.room && r.status !== "Checked-out")
                    .map(r => (
                      <option key={r._id} value={r._id}>{r.guest} ({r.category})</option>
                    ))}
                </Select>
              </FormField>

              <FormField label="Select Vacant Room" required id="targetRoomNum">
                <Select
                  id="targetRoomNum"
                  value={targetRoomNum}
                  onChange={(e) => setTargetRoomNum(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="">-- Choose Vacant Room --</option>
                  {rooms
                    .filter(r => !roomReservations[r.num])
                    .map(r => (
                      <option key={r.num} value={r.num}>Room #{r.num} ({r.type})</option>
                    ))}
                </Select>
              </FormField>

              <div className="pt-4 border-t border-muted/50 flex justify-end gap-2 select-none">
                <Button type="button" variant="ghost" className="h-10 text-xs px-5 rounded-full" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full">
                  Map Room Key
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal E: Change Room configuration */}
      {activeModal === "change" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-sm">Move Stay Room</h3>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => setActiveModal(null)}>
                <XCircle className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleChangeRoomSubmit} className="p-5 space-y-4">
              <FormField label="Target In-House Guest" required id="targetBookingId">
                <Select
                  id="targetBookingId"
                  value={targetBookingId}
                  onChange={(e) => setTargetBookingId(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="">-- Choose Stay Guest --</option>
                  {inHouseGuests.map(r => (
                    <option key={r._id} value={r._id}>{r.guest} (Room #{r.room})</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Select New Vacant Room" required id="targetRoomNum">
                <Select
                  id="targetRoomNum"
                  value={targetRoomNum}
                  onChange={(e) => setTargetRoomNum(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="">-- Choose New Vacant Room --</option>
                  {rooms
                    .filter(r => !roomReservations[r.num])
                    .map(r => (
                      <option key={r.num} value={r.num}>Room #{r.num} ({r.type})</option>
                    ))}
                </Select>
              </FormField>

              <div className="pt-4 border-t border-muted/50 flex justify-end gap-2 select-none">
                <Button type="button" variant="ghost" className="h-10 text-xs px-5 rounded-full" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full">
                  Re-assign Room
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal F: Extend Stay */}
      {activeModal === "extend" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-sm">Extend Stay Nights</h3>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => setActiveModal(null)}>
                <XCircle className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleExtendStaySubmit} className="p-5 space-y-4">
              <FormField label="Target Active Resident" required id="targetBookingId">
                <Select
                  id="targetBookingId"
                  value={targetBookingId}
                  onChange={(e) => setTargetBookingId(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="">-- Choose Resident --</option>
                  {inHouseGuests.map(r => (
                    <option key={r._id} value={r._id}>{r.guest} (Checkout: {r.checkOut})</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Additional Nights" required id="extendNightsCount">
                <Select
                  id="extendNightsCount"
                  value={extendNightsCount}
                  onChange={(e) => setExtendNightsCount(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>{n} Night{n > 1 ? "s" : ""}</option>
                  ))}
                </Select>
              </FormField>

              <div className="pt-4 border-t border-muted/50 flex justify-end gap-2 select-none">
                <Button type="button" variant="ghost" className="h-10 text-xs px-5 rounded-full" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full">
                  Process Extension
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal G: Collect Payment */}
      {activeModal === "payment" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-sm">Collect Ledger Payment</h3>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => setActiveModal(null)}>
                <XCircle className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCollectPaymentSubmit} className="p-5 space-y-4">
              <FormField label="Target Reservation" required id="targetBookingId">
                <Select
                  id="targetBookingId"
                  value={targetBookingId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setTargetBookingId(id);
                    const matched = reservations.find(r => r._id === id);
                    if (matched) {
                      setCollectAmount(matched.balance.toString());
                    }
                  }}
                  className="font-bold text-xs h-10"
                >
                  <option value="">-- Choose Reservation --</option>
                  {reservations
                    .filter(r => r.balance > 0 && r.status !== "Checked-out")
                    .map(r => (
                      <option key={r._id} value={r._id}>{r.guest} (Outstanding: ₹{r.balance})</option>
                    ))}
                </Select>
              </FormField>

              <FormField label="Payment Settle Amount (₹)" required id="collectAmount">
                <Input
                  id="collectAmount"
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                />
              </FormField>

              <div className="pt-4 border-t border-muted/50 flex justify-end gap-2 select-none">
                <Button type="button" variant="ghost" className="h-10 text-xs px-5 rounded-full" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full">
                  Record Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}