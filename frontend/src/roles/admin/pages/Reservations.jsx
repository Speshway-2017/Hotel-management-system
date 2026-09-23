import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  HorizontalRouteTabs,
  PageHeader,
  Notice,
  LoadingRows,
  Tag,
  ActionGroup,
  ViewActionButton,
  EditActionButton,
  CheckInActionButton,
  CheckOutActionButton,
  DeleteActionButton
} from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { toast } from "sonner";
import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { formatDisplayDate, isToday } from "@/utils/dateUtils";
import { extractRoomNumber } from "@/utils/roomUtils";
import { useServerTime, getCheckInStatusInfo } from "@/utils/serverTime";
import {
  CalendarCheck,
  Bed,
  Users,
  ConciergeBell,
  Search,
  Plus,
  Edit2,
  XCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  List,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Info,
  Percent,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";

const operationsTabs = [
  { label: "Reservations", to: "/admin/reservations", icon: CalendarCheck },
  { label: "Rooms & Rates", to: "/admin/rooms", icon: Bed },
  { label: "Guests", to: "/admin/guests", icon: Users }
];

export const Route = createFileRoute("/admin/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations Console — Speshway Luxury Hotel" },
      { name: "description", content: "Manage guest bookings, group reservations, and occupancy operations." }
    ]
  }),
  component: ReservationsPage
});

const calendarDates = [
  { dateStr: "2026-08-17", label: "17 Aug" },
  { dateStr: "2026-08-18", label: "18 Aug" },
  { dateStr: "2026-08-19", label: "19 Aug" },
  { dateStr: "2026-08-20", label: "20 Aug" },
  { dateStr: "2026-08-21", label: "21 Aug" },
  { dateStr: "2026-08-22", label: "22 Aug" },
  { dateStr: "2026-08-23", label: "23 Aug" }
];

const schedulerRooms = [
  { num: "101", type: "Villa Suite" },
  { num: "104", type: "Heritage Luxury" },
  { num: "205", type: "Heritage Luxury" },
  { num: "302", type: "Maharaja Suite" }
];

// Premium stat card component matching design reference
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
        <h3 className="mt-1.5 font-sans tracking-tight tabular-nums text-lg font-bold text-slate-800 leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[10px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

function ReservationsPage() {
  const navigate = useNavigate();
  useServerTime(2000);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState("list");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Reservation drawer state
  const [selectedRes, setSelectedRes] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [extendingBooking, setExtendingBooking] = useState(null);

  // Calendar View Start Date and Helpers
  const [calendarStart, setCalendarStart] = useState(() => new Date());

  const getCalendarDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(calendarStart);
      d.setDate(calendarStart.getDate() + i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      dates.push({ dateStr, label });
    }
    return dates;
  };
  const activeCalendarDates = getCalendarDates();

  const handlePrevWeek = () => {
    setCalendarStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCalendarStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const getWeekRangeLabel = () => {
    if (activeCalendarDates.length === 0) return "";
    const start = activeCalendarDates[0];
    const end = activeCalendarDates[6];
    return `${start.label} - ${end.label}, ${calendarStart.getFullYear()}`;
  };

  // Waitlist state
  const [waitlist, setWaitlist] = useState([]);

  async function loadReservations(showSpinner = true) {
    try {
      if (showSpinner && reservations.length === 0) setLoading(true);
      setError(null);      const res = await superAdminService.getReservations();
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map(b => {
          const cleanRoomNum = extractRoomNumber(b) || (b.roomNumber ? String(b.roomNumber) : "");
          const roomNum = cleanRoomNum || "Unassigned";
          const roomType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : (b.room && !b.room.match(/\b\d{3,4}\b/) ? b.room : (cleanRoomNum?.startsWith('5') ? 'Penthouse Suite' : cleanRoomNum?.startsWith('4') ? 'Presidential Suite' : cleanRoomNum?.startsWith('3') ? 'Executive Suite' : cleanRoomNum?.startsWith('2') ? 'Deluxe Room' : 'Standard Room')));

          let checkInDate = b.checkIn || b.checkInDate || "";
          if (checkInDate.includes('T')) checkInDate = checkInDate.split('T')[0];

          let checkOutDate = b.checkOut || b.checkOutDate || "";
          if (checkOutDate.includes('T')) checkOutDate = checkOutDate.split('T')[0];

          return {
            _id: b._id || b.id || b.bookingId,
            id: b.bookingId || b.id || b._id,
            bookingId: b.bookingId || b.id || b._id,
            guest: b.guest || b.guestName || b.name || "Guest",
            phone: b.phone || b.guestPhone || b.mobile || "--",
            room: roomNum,
            roomNumber: roomNum,
            roomType: roomType,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            nights: b.nights || 1,
            pax: b.pax || "2 Adults",
            source: b.source || "Direct Web",
            amount: b.amount || b.totalAmount || 0,
            balance: b.balance !== undefined ? b.balance : (b.paymentStatus === "Paid" || b.status === "Paid" || b.status === "Checked-in" ? 0 : (b.amount || b.totalAmount || 0)),
            status: b.status || "Confirmed",
            notes: b.notes || ""
          };
        });
        setReservations(mapped);
      }
    } catch (err) {
      setError(err.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }

  const notifySocketEvents = (action = 'update', roomNum = null) => {
    emitRealtimeEvent('booking_updated', { action, roomNum });
    emitRealtimeEvent('room_status_changed', { action, roomNum });
    emitRealtimeEvent('availability_changed', { action, roomNum });
    emitRealtimeEvent('dashboard_sync', { action, roomNum });
  };

  const handleStatusChange = async (bookingId, newStatus, notes = "", booking = null) => {
    const targetBooking = booking || reservations.find(r => r._id === bookingId || r.id === bookingId || r.bookingId === bookingId);

    if (newStatus === "Checked-in" && targetBooking) {
      const checkInStatus = getCheckInStatusInfo(targetBooking);
      if (!checkInStatus.allowed) {
        toast.error(checkInStatus.reason);
        return;
      }
    }

    const source = targetBooking?.source || "";
    const isWalkIn = source.toLowerCase().includes("walk-in") || source === "Direct Walk-in";

    if (newStatus === "Checked-in" && targetBooking && !isWalkIn) {
      navigate({ to: `/admin/check-in/${bookingId}` });
      return;
    }

    try {
      const payload = { status: newStatus };
      if (notes) payload.notes = notes;
      const res = await superAdminService.updateReservation(bookingId, payload);
      if (res.success) {
        setReservations(prev => prev.map(r => 
          (r._id === bookingId || r.id === bookingId || r.bookingId === bookingId)
            ? { ...r, status: newStatus }
            : r
        ));
        if (selectedRes && (selectedRes._id === bookingId || selectedRes.id === bookingId || selectedRes.bookingId === bookingId)) {
          setSelectedRes(prev => ({ ...prev, status: newStatus }));
        }
        toast.success(newStatus === "Checked-in" ? "Guest checked in successfully!" : newStatus === "Checked-out" ? "Guest checked out successfully!" : `Reservation status updated to ${newStatus}`);
        notifySocketEvents(newStatus === 'Checked-in' ? 'checkin' : newStatus === 'Checked-out' ? 'checkout' : 'update');
        loadReservations(false);
      } else {
        toast.error(res.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  useEffect(() => {
    loadReservations(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadReservations(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await superAdminService.deleteReservation(id);
      if (res.success) {
        toast.success("Reservation cancelled and inventory released.");
        notifySocketEvents('delete');
        loadReservations(false);
        if (selectedRes && selectedRes._id === id) {
          setIsDrawerOpen(false);
        }
      } else {
        toast.error(res.message || "Failed to cancel reservation");
      }
    } catch (err) {
      toast.error(err.message || "Failed to cancel reservation");
    }
  }

  const handleApplyDiscountOverride = async (bookingId, amount) => {
    try {
      // Fetch the full booking
      const bObj = reservations.find(r => r._id === bookingId);
      if (!bObj) return;

      const nextBal = Math.max(0, (bObj.balance || 0) - amount);
      const res = await superAdminService.updateReservation(bookingId, {
        balance: nextBal,
        notes: `Admin discount override of ₹${amount} applied.`
      });

      if (res.success) {
        toast.success(`Admin discount of ₹${amount} authorized!`);
        loadReservations();
        if (selectedRes && selectedRes._id === bookingId) {
          setSelectedRes(prev => ({ ...prev, balance: nextBal }));
        }
      } else {
        toast.error(res.message || "Failed to authorize discount");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  function handleAddFromWaitlist(item) {
    const checkInDate = "2026-08-18";
    const checkOutDate = "2026-08-20";
    const roomNum = item.roomType === "Maharaja Suite" ? "302" : "101";
    
    // Remove from waitlist locally
    setWaitlist(prev => prev.filter(w => w.id !== item.id));

    navigate({
      to: `/admin/reservations/add?guest=${encodeURIComponent(item.guest)}&phone=${encodeURIComponent(item.phone)}&room=${roomNum}&checkIn=${checkInDate}&checkOut=${checkOutDate}&status=Confirmed`
    });
  }

  // Filter computations
  const filteredReservations = reservations.filter((res) => {
    const guestName = res.guest || "";
    const bookingId = res._id || res.id || "";
    const roomNum = res.room || "";

    const matchesSearch =
      guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roomNum.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = !dateFilter || 
      (res.checkIn && res.checkIn.toLowerCase().includes(dateFilter.toLowerCase())) ||
      (res.checkOut && res.checkOut.toLowerCase().includes(dateFilter.toLowerCase()));

    const matchesStatus = statusFilter === "all" || res.status === statusFilter;
    const matchesSource = sourceFilter === "all" || res.source === sourceFilter;

    let matchesPayment = true;
    if (paymentFilter !== "all") {
      const balance = res.balance || 0;
      const amount = res.amount || 0;
      if (paymentFilter === "Paid") {
        matchesPayment = balance === 0;
      } else if (paymentFilter === "Partial") {
        matchesPayment = balance > 0 && balance < amount;
      } else if (paymentFilter === "Unpaid") {
        matchesPayment = balance === amount;
      }
    }

    return matchesSearch && matchesDate && matchesStatus && matchesSource && matchesPayment;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage) || 1;
  const paginatedData = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Dynamic Overbooking Checker - Only flags true room-level conflicts with overlapping stay dates
  const parseStayDate = (dStr) => {
    if (!dStr) return null;
    const s = String(dStr).trim();
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))).getTime();
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).getTime();
    }
    return null;
  };

  const isInactiveBooking = (status) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return (
      s === "checked-out" ||
      s === "checked out" ||
      s === "cancelled" ||
      s === "no-show" ||
      s === "no show" ||
      s === "refunded" ||
      s === "rejected"
    );
  };

  const getSpecificRoomNumber = (b) => {
    if (!b) return null;
    const extracted = extractRoomNumber(b);
    if (extracted && /^\d{1,4}$/.test(extracted)) return extracted;
    const rawNum = b.roomNumber ? String(b.roomNumber).trim() : "";
    if (rawNum && /^\d{1,4}$/.test(rawNum)) return rawNum;
    const rawRoom = b.room ? String(b.room).trim() : "";
    const digitMatch = rawRoom.match(/\b\d{1,4}\b/);
    if (digitMatch) return digitMatch[0];
    return null;
  };

  const detectOverbookings = () => {
    // Only consider active reservations that have an actual assigned physical room number
    const activeWithRoom = reservations.filter(r => {
      if (isInactiveBooking(r.status)) return false;
      const roomNum = getSpecificRoomNumber(r);
      return Boolean(roomNum);
    });

    const conflicts = [];
    const seenPairs = new Set();

    for (let i = 0; i < activeWithRoom.length; i++) {
      for (let j = i + 1; j < activeWithRoom.length; j++) {
        const b1 = activeWithRoom[i];
        const b2 = activeWithRoom[j];

        // Ensure not comparing the exact same reservation
        const id1 = String(b1._id || b1.id || b1.bookingId || '');
        const id2 = String(b2._id || b2.id || b2.bookingId || '');
        if (id1 && id2 && id1 === id2) continue;

        const r1 = getSpecificRoomNumber(b1);
        const r2 = getSpecificRoomNumber(b2);

        // Real conflict requires the exact same physical room number
        if (r1 && r2 && r1 === r2) {
          const s1 = parseStayDate(b1.checkIn);
          const e1 = parseStayDate(b1.checkOut);
          const s2 = parseStayDate(b2.checkIn);
          const e2 = parseStayDate(b2.checkOut);

          if (s1 && e1 && s2 && e2) {
            // Overlap condition: start1 < end2 AND start2 < end1
            if (s1 < e2 && s2 < e1) {
              const pairKey = [id1, id2].sort().join('::');
              if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                conflicts.push({
                  b1,
                  b2,
                  room: r1,
                  stay1: `${b1.checkIn} → ${b1.checkOut}`,
                  stay2: `${b2.checkIn} → ${b2.checkOut}`
                });
              }
            }
          }
        }
      }
    }
    return conflicts;
  };

  const overbookingConflicts = detectOverbookings();
  const hasOverbooking = overbookingConflicts.length > 0;

  // Calculate high-level KPIs matching design references
  const totalCount = reservations.length;
  const confirmedCount = reservations.filter((r) => r.status === "Confirmed" || r.status === "Pre-checked" || r.status === "Paid").length;
  const checkedInCount = reservations.filter((r) => r.status === "Checked-in" || r.status === "Checked In" || r.status === "Staying").length;
  const checkedOutCount = reservations.filter((r) => r.status === "Checked-out" || r.status === "Checked Out").length;
  const pendingCount = reservations.filter((r) => r.status === "Pending").length;
  const cancelledCount = reservations.filter((r) => r.status === "Cancelled").length;

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui">


      {error && <Notice tone="error" title="Sync Failure">{error}</Notice>}

      {hasOverbooking && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 text-destructive animate-pulse select-none">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-sm">Overbooking Threshold Alert</h4>
            <p className="mt-0.5">The following rooms have overlapping reservation check-ins. Please reassign rooms immediately:</p>
            <ul className="list-disc pl-4 mt-1.5 space-y-1 font-semibold">
              {overbookingConflicts.map((c, idx) => (
                <li key={idx}>
                  Room {c.room}: {c.b1.guest} ({c.stay1}) vs {c.b2.guest} ({c.stay2})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI Cards Grid - Redesigned to match Manager 6-card template */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <PremiumStatCard label="Total Reservations" value={totalCount.toString()} hint="All-time bookings log" accentColor="#0d1b2a" />
        <PremiumStatCard label="Confirmed" value={confirmedCount.toString()} hint="Upcoming bookings" accentColor="#3b82f6" />
        <PremiumStatCard label="Checked-in" value={checkedInCount.toString()} hint="Active stays log" accentColor="#10b981" />
        <PremiumStatCard label="Checked-out" value={checkedOutCount.toString()} hint="Completed stays log" accentColor="#6b7280" />
        <PremiumStatCard label="Pending" value={pendingCount.toString()} hint="Awaiting verification" accentColor="#f59e0b" />
        <PremiumStatCard label="Cancelled" value={cancelledCount.toString()} hint="Released inventory keys" accentColor="#ef4444" />
      </div>

      {/* Filter and Search Bar Panel */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search guest name, room number, or booking reference..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs font-semibold bg-[#FDFCFA]/10 border-muted w-full"
              />
            </div>

            <div className="w-full sm:w-48">
              <Input
                type="text"
                placeholder="Filter by date (e.g. 21 Aug)..."
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs font-semibold bg-[#FDFCFA]/10 border-muted w-full"
              />
            </div>
          </div>

          {/* View Mode Toggle and New Booking button placed on the right of top row */}
          <div className="flex items-center gap-3 select-none shrink-0 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex rounded-lg border border-muted bg-[#fcfcfc] p-1 gap-1">
              <Button
                size="sm"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                className="h-8 text-xs font-bold px-3"
                onClick={() => setViewMode("list")}
              >
                <List className="size-3.5 mr-1" /> List
              </Button>
              <Button
                size="sm"
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                className="h-8 text-xs font-bold px-3"
                onClick={() => setViewMode("calendar")}
              >
                <Calendar className="size-3.5 mr-1" /> Calendar
              </Button>
            </div>
            <Button
              onClick={() => navigate({ to: "/admin/reservations/add" })}
              className="bg-navy hover:bg-navy/90 text-white shadow-soft text-xs h-8.5 px-4 font-bold rounded-full shrink-0"
            >
              <Plus className="size-3.5 mr-1" /> New Booking
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 border-t border-muted/50">
          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Reservation Status</span>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Payment Status</span>
            <Select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All payment levels</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Due</option>
              <option value="Unpaid">Unpaid / Full Due</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Booking Channels</span>
            <Select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Channels</option>
              <option value="Direct">Direct</option>
              <option value="MakeMyTrip">OTA (MMT)</option>
              <option value="Booking.com">OTA (Booking.com)</option>
              <option value="Agoda">OTA (Agoda)</option>
              <option value="Corporate">Corporate / GDS</option>
              <option value="Walk-in">Walk-in</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "list" ? (
        /* List View Component */
        <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
          {loading && reservations.length === 0 ? (
            <div className="p-8">
              <LoadingRows rows={5} />
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="p-16 text-center">
              <CalendarCheck className="size-12 text-muted-foreground/45 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-800">No reservations found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try modifying your filter settings or create a new booking.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1050px] table-fixed">
                  <thead>
                    <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                      <th className="py-4 pl-4 pr-2 text-left w-[14%]">Guest Info</th>
                      <th className="py-4 px-2 text-left w-[12%]">Room / Type</th>
                      <th className="py-4 px-3 text-left w-[16%]">Stay Dates</th>
                      <th className="py-4 px-3 text-left w-[12%]">Channel / Type</th>
                      <th className="py-4 px-3 text-left w-[14%]">Payment</th>
                      <th className="py-4 px-3 text-left w-[14%]">Status</th>
                      <th className="py-4 pl-3 pr-4 text-left min-w-[240px] whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted text-xs text-[#2a2a2a]">
                    {paginatedData.map((res) => {
                      const balanceVal = res.balance || 0;
                      const isPaid = balanceVal === 0;

                      return (
                        <tr key={res._id} className="hover:bg-[#fcfcfc]/60 transition-colors group align-middle">
                          <td className="py-3.5 pl-4 pr-2 align-middle">
                            <div className="font-bold text-navy group-hover:text-purple transition-colors flex items-center gap-1.5 truncate">
                              {res.guest}
                              {res.groupBooking && (
                                <span className="rounded bg-navy/15 border border-navy/35 text-[9px] font-bold px-1 text-navy-deep uppercase scale-90">Group</span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-medium truncate">{res.phone}</div>
                          </td>
                          <td className="py-3.5 px-2 align-middle truncate">
                            <div className="font-mono text-xs font-bold text-navy">
                              {extractRoomNumber(res) ? `Room ${extractRoomNumber(res)}` : (res.roomNumber ? `Room ${res.roomNumber}` : (res.room && res.room !== "Unassigned" ? res.room : "Unassigned"))}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-medium truncate">
                              {res.roomType || (res.room && res.room.includes('·') ? res.room.split('·')[1]?.trim() : "Standard Room")}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 align-middle">
                            <div className="font-bold text-navy whitespace-nowrap">{formatDisplayDate(res.checkIn)} → {formatDisplayDate(res.checkOut)}</div>
                            <div className="text-[11px] text-muted-foreground font-medium">{res.nights || 1} Night(s) / {res.pax || "2 Adults"}</div>
                          </td>
                          <td className="py-3.5 px-3 align-middle">
                            <span className="inline-flex items-center rounded-full bg-muted/60 border border-muted/80 px-2.5 py-0.5 text-[11px] font-semibold text-navy whitespace-nowrap">
                              {res.source || "Direct"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-left align-middle">
                            <div className="font-bold text-navy text-xs">₹{(res.amount || 0).toLocaleString("en-IN")}</div>
                            <div className="mt-1 flex justify-start">
                              {(res.paymentStatus === "Refunded" || res.refundStatus === "Refunded") ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple/10 text-purple border border-purple/20 shadow-2xs whitespace-nowrap">
                                  Refunded
                                </span>
                              ) : isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
                                  <CheckCircle className="size-2.5 shrink-0" />
                                  Fully Paid
                                </span>
                              ) : balanceVal < (res.amount || 0) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs whitespace-nowrap">
                                  <AlertTriangle className="size-2.5 shrink-0" />
                                  Due: ₹{balanceVal.toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs whitespace-nowrap">
                                  <XCircle className="size-2.5 shrink-0" />
                                  Unpaid
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-left align-middle">
                            <div className="flex items-center justify-start">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                                  res.status === "Confirmed"
                                    ? "bg-purple/10 text-purple border border-purple/20"
                                    : res.status === "Checked-in"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : res.status === "Checked-out"
                                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                                    : res.status === "Cancelled"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {res.status === "Checked-in" && <CheckCircle className="size-3 shrink-0 text-emerald-600" />}
                                {res.status === "Pending" && <Clock className="size-3 shrink-0 text-amber-600" />}
                                {res.status === "Confirmed" && <CalendarCheck className="size-3 shrink-0 text-purple" />}
                                {res.status === "Cancelled" && <XCircle className="size-3 shrink-0 text-rose-600" />}
                                {res.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 pl-3 pr-4 text-left align-middle min-w-[240px] whitespace-nowrap">
                            <ActionGroup align="left">
                              {(() => {
                                const statusLower = String(res.status || '').toLowerCase().trim();
                                const isTerminal = 
                                  statusLower === "checked-out" || 
                                  statusLower === "checked out" || 
                                  statusLower === "checked_out" || 
                                  statusLower === "completed" || 
                                  statusLower === "cancelled" || 
                                  statusLower === "canceled";

                                if (isTerminal) {
                                  return (
                                    <ViewActionButton
                                      onClick={() => navigate({ to: `/admin/reservations/view/${res._id || res.id}` })}
                                    />
                                  );
                                }

                                return (
                                  <>
                                    {(res.status === "Pending" || res.status === "Confirmed" || res.status === "Pre-checked") && (
                                      <CheckInActionButton
                                        booking={res}
                                        onClick={() => handleStatusChange(res._id || res.id, "Checked-in", "", res)}
                                      />
                                    )}
                                    {(res.status === "Checked-in" || res.status === "Checked In" || res.status === "Staying" || res.status === "Staying-In") && (
                                      <>
                                        <ExtendStayButton
                                          booking={res}
                                          onClick={() => navigate({ to: `/admin/reservations/extend/${res._id || res.id || res.bookingId}` })}
                                        />
                                        <CheckOutActionButton
                                          onClick={() => handleStatusChange(res._id || res.id, "Checked-out")}
                                        />
                                      </>
                                    )}
                                    <ViewActionButton
                                      onClick={() => navigate({ to: `/admin/reservations/view/${res._id || res.id}` })}
                                    />
                                    <EditActionButton
                                      onClick={() => navigate({ to: `/admin/reservations/edit/${res._id || res.id}` })}
                                    />
                                    <DeleteActionButton
                                      label="Cancel"
                                      title="Cancel Reservation"
                                      onClick={() => handleDelete(res._id)}
                                    />
                                  </>
                                );
                              })()}
                            </ActionGroup>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-muted bg-[#fcfcfc] p-4 select-none">
                  <span className="text-xs text-muted-foreground font-semibold">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="h-8 border-muted"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="h-8 border-muted"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Scheduler Reservation Calendar Component */
        <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-muted">
            <h3 className="font-sans tracking-tight tabular-nums font-bold text-slate-800 text-md">Room Scheduler Grid</h3>
            <div className="flex items-center gap-2 select-none">
              <Button size="icon" variant="ghost" className="size-8 cursor-pointer" onClick={handlePrevWeek} title="Previous Week">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-bold text-navy">{getWeekRangeLabel()}</span>
              <Button size="icon" variant="ghost" className="size-8 cursor-pointer" onClick={handleNextWeek} title="Next Week">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[830px] table-fixed">
              <colgroup>
                <col className="w-[160px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-3.5 px-4 w-[160px] min-w-[160px]">Room</th>
                  {activeCalendarDates.map((d, idx) => (
                    <th key={idx} className="py-3.5 px-2 text-center w-[96px] min-w-[96px]">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a]">
                {schedulerRooms.map((room) => (
                  <tr key={room.num} className="hover:bg-[#fcfcfc]/60">
                    <td className="py-4.5 px-4 font-semibold text-navy text-left align-middle w-[160px] min-w-[160px]">
                      <div>#{room.num}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{room.type}</div>
                    </td>
                    
                    {activeCalendarDates.map((dateObj, dIdx) => {
                      const activeRes = reservations.find((r) => {
                        const match = r.room && r.room.match(/\d+/);
                        const roomNum = match ? match[0] : r.room;
                        return roomNum === room.num && r.checkIn <= dateObj.dateStr && r.checkOut >= dateObj.dateStr && r.status !== "Cancelled";
                      });

                      if (activeRes) {
                        const isStart = activeRes.checkIn === dateObj.dateStr;
                        
                        return (
                          <td key={dIdx} className="py-4.5 px-2 text-center select-none cursor-pointer align-middle w-[96px] min-w-[96px]" onClick={() => {
                            navigate({ to: `/admin/reservations/view/${activeRes._id || activeRes.id}` });
                          }}>
                            <div className="flex items-center justify-center">
                              <div className={`py-1.5 px-2 rounded-lg text-[10px] font-bold truncate text-center w-full max-w-[84px] cursor-pointer ${
                                activeRes.status === "Checked-in"
                                  ? "bg-success/15 text-success border border-success/30"
                                  : "bg-brand/15 text-brand border border-brand/30"
                              }`}>
                                {isStart ? activeRes.guest.split(" ")[0] : "→"}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={dIdx} className="py-4.5 px-2 text-center select-none text-muted-foreground/35 align-middle w-[96px] min-w-[96px]">
                          <div className="flex items-center justify-center">
                            <span className="text-[10px] italic">Free</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Waitlist Management Section */}
      <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
        <div className="pb-3 border-b border-muted flex items-center justify-between">
          <h3 className="font-sans tracking-tight tabular-nums font-bold text-slate-800 text-sm">Waitlisted Stays & Approvals</h3>
          <span className="rounded-full bg-warning/10 text-warning px-2.5 py-0.5 text-[10px] font-bold border border-warning/20">
            {waitlist.length} Pending Approval
          </span>
        </div>

        {waitlist.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No pending guests in waitlist.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waitlist.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-muted flex items-start justify-between gap-3 hover:bg-muted/15 transition-all">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{item.guest}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.phone} · Category: <span className="font-semibold">{item.roomType}</span></p>
                  <p className="text-[10px] text-muted-foreground mt-1">Requested Dates: {item.dates}</p>
                </div>
                <div className="flex gap-1.5 shrink-0 self-center">
                  <Button
                    onClick={() => handleAddFromWaitlist(item)}
                    size="xs"
                    className="bg-navy hover:bg-navy-deep text-white text-xs h-7 px-2.5 font-bold"
                  >
                    Confirm Room
                  </Button>
                  <Button
                    onClick={() => setWaitlist(prev => prev.filter(w => w.id !== item.id))}
                    size="xs"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/5 text-xs h-7 px-2"
                  >
                    Drop
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premium Side-over Stay Drawer / Diagnostic details panel */}
      {isDrawerOpen && selectedRes && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans">
          {/* Overlay */}
          <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          
          {/* Drawer container */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between text-left animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800-deep">Stay Diagnostic & Actions Panel</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Booking Reference: <strong className="text-navy">{selectedRes._id || selectedRes.id}</strong></p>
              </div>
              <Button size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => setIsDrawerOpen(false)}>
                <X className="size-4.5" />
              </Button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-navy leading-relaxed scrollbar-none">
              
              {/* Guest Overview Card */}
              <div className="bg-muted/15 border border-muted rounded-xl p-4 space-y-2.5">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block tracking-wide">Guest Details</span>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-muted/30">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Guest Name:</span>
                    <strong className="text-navy block text-sm mt-0.5">{selectedRes.guest}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Contact Phone:</span>
                    <strong className="text-navy block mt-0.5">{selectedRes.phone || "—"}</strong>
                  </div>
                </div>
                <div className="pt-2">
                  <span className="text-[10px] text-muted-foreground">Stay Status:</span>
                  <div className="mt-1">
                    <Tag tone={
                      selectedRes.status === "Confirmed" 
                        ? "success" 
                        : selectedRes.status === "Checked-in" 
                        ? "brand" 
                        : selectedRes.status === "Cancelled" 
                        ? "error" 
                        : "warning"
                    }>{selectedRes.status}</Tag>
                  </div>
                </div>
              </div>

              {/* Stay configuration Details */}
              <div className="bg-white border border-muted rounded-xl p-4 space-y-2.5 shadow-soft">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block tracking-wide">Stay Config & Schedule</span>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-muted/30">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Check-in Date:</span>
                    <strong className="text-navy block mt-0.5">{selectedRes.checkIn}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Check-out Date:</span>
                    <strong className="text-navy block mt-0.5">{selectedRes.checkOut}</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-muted/20">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Allocated Room:</span>
                    <strong className="text-navy block font-mono mt-0.5">
                      {selectedRes.room && selectedRes.room !== "Unassigned" ? (String(selectedRes.room).startsWith('Room') ? selectedRes.room : `Room ${selectedRes.room}`) : "Unassigned"} · {selectedRes.roomType || "Deluxe Room"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Pax limits:</span>
                    <strong className="text-navy block mt-0.5">{selectedRes.pax || "2 Adults"}</strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-muted/20">
                  <span className="text-[10px] text-muted-foreground">Booking Source / Parity Sync:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag tone="brand">{selectedRes.source || "Direct"}</Tag>
                    <span className="text-[10px] text-muted-foreground font-semibold">GDS Sync OK</span>
                  </div>
                </div>
              </div>

              {/* Ledger ledger details */}
              <div className="bg-white border border-muted rounded-xl p-4 space-y-2.5 shadow-soft">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block tracking-wide">Tariff Billing & Payments</span>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-muted/30">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Invoiced Tariff:</span>
                    <strong className="text-navy block text-sm mt-0.5">₹{selectedRes.amount?.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Ledger Balance:</span>
                    <strong className={`block text-sm mt-0.5 font-bold ${(selectedRes.balance || 0) === 0 ? "text-success" : "text-destructive"}`}>
                      ₹{(selectedRes.balance || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Quick discount action override */}
                {(selectedRes.balance || 0) > 0 && selectedRes.status !== "Cancelled" && (
                  <div className="pt-3 border-t border-muted/20 space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Percent className="size-3.5 text-success" /> Admin Exception Override Discount</span>
                    <div className="flex gap-1.5">
                      <Button
                        onClick={() => handleApplyDiscountOverride(selectedRes._id, 1000)}
                        size="xs"
                        variant="outline"
                        className="text-success border-success/40 hover:bg-success/5 text-[10px] py-1 h-7"
                      >
                        Apply -₹1,000
                      </Button>
                      <Button
                        onClick={() => handleApplyDiscountOverride(selectedRes._id, 2000)}
                        size="xs"
                        variant="outline"
                        className="text-success border-success/40 hover:bg-success/5 text-[10px] py-1 h-7"
                      >
                        Apply -₹2,000
                      </Button>
                      <Button
                        onClick={() => handleApplyDiscountOverride(selectedRes._id, selectedRes.balance)}
                        size="xs"
                        className="bg-success hover:bg-success-deep text-white text-[10px] py-1 h-7"
                      >
                        Waiver Full Due
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Audit history activity feed logs */}
              <div className="space-y-2.5">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block tracking-wide">Activity Logs & Modification history</span>
                <div className="bg-[#fdfbfc]/40 border border-muted p-3.5 rounded-xl space-y-2 text-muted-foreground">
                  <div className="flex items-start gap-2.5 text-[11px]">
                    <span className="size-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                    <p>Booking processed via front desk reservation system.</p>
                  </div>
                  <div className="flex items-start gap-2.5 text-[11px]">
                    <span className="size-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <p>GDS Inventory blocked: Room {selectedRes.room || "unassigned"} synchronized.</p>
                  </div>
                  {selectedRes.notes && (
                    <div className="flex items-start gap-2.5 text-[11px] pt-1.5 border-t border-muted/30">
                      <Info className="size-3.5 text-warning shrink-0 mt-0.5" />
                      <p className="italic text-navy font-semibold">"{selectedRes.notes}"</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Quick Status actions controls at the footer */}
            <div className="p-4 bg-muted/15 border-t border-muted flex flex-wrap gap-2.5">
              {(selectedRes.status === "Pending" || selectedRes.status === "Confirmed" || selectedRes.status === "Pre-checked") && (
                <Button
                  onClick={() => handleStatusChange(selectedRes._id || selectedRes.id, "Checked-in", "", selectedRes)}
                  className="bg-success hover:bg-success-deep text-white text-xs font-bold px-4 h-9 rounded-full flex-1 cursor-pointer"
                >
                  Confirm Check-In
                </Button>
              )}
              {(selectedRes.status === "Checked-in" || selectedRes.status === "Checked In" || selectedRes.status === "Staying" || selectedRes.status === "Staying-In") && (
                <>
                  <ExtendStayButton
                    variant="header"
                    label="Extend Stay"
                    booking={selectedRes}
                    onClick={() => navigate({ to: `/admin/reservations/extend/${selectedRes._id || selectedRes.id || selectedRes.bookingId}` })}
                    className="flex-1 justify-center"
                  />
                  <Button
                    onClick={() => handleStatusChange(selectedRes._id || selectedRes.id, "Checked-out")}
                    className="bg-navy hover:bg-navy-deep text-white text-xs font-bold px-4 h-9 rounded-xl flex-1 cursor-pointer"
                  >
                    Confirm Check-Out
                  </Button>
                </>
              )}
              {selectedRes.status !== "Cancelled" && selectedRes.status !== "Checked-out" && selectedRes.status !== "Checked Out" && (
                <Button
                  onClick={() => handleStatusChange(selectedRes._id || selectedRes.id, "Cancelled", "Marked as Cancelled by Administrator")}
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/5 text-xs font-bold px-4 h-9 rounded-full cursor-pointer"
                >
                  Cancel Booking
                </Button>
              )}
              <Button
                onClick={() => navigate({ to: `/admin/reservations/edit/${selectedRes._id}` })}
                variant="outline"
                className="text-navy border-navy/40 hover:bg-[#FDFCFA]/30 text-xs font-bold px-4 h-9 rounded-full"
              >
                Modify stay
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Extend Stay Modal */}
      <ExtendStayModal
        booking={extendingBooking}
        isOpen={!!extendingBooking}
        onClose={() => setExtendingBooking(null)}
        onSuccess={() => loadReservations(false)}
        userRole="admin"
      />
    </div>
  );
}