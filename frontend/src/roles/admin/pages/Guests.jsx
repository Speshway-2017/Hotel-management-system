import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Crumbs, ActionGroup, ViewActionButton, EditActionButton, ExtendActionButton, ActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { 
  Users, UserCheck, CalendarDays, RefreshCw, Star, 
  Search, SlidersHorizontal, Plus, ArrowRight, Eye, Edit2, PlusCircle, FileText, ChevronLeft, ChevronRight, XCircle, Calendar
} from "lucide-react";
import { superAdminService } from "@/services/superAdmin";
import { managerService } from "@/services/manager";
import { subscribeRealtimeSync } from "@/services/socket";
import { extractRoomNumber } from "@/utils/roomUtils";

export const Route = createFileRoute("/admin/guests")({
  head: () => ({
    meta: [
      { title: "Guests CRM Workspace — Speshway Luxury Hotel" },
      { name: "description", content: "Comprehensive guest profile metrics, history, regulatory docs, and ledger accounts." }
    ]
  }),
  component: GuestsCrmPage
});

// Premium stat card component
function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div>
        <div className="h-6 flex items-start">
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        </div>
        <h3 className="mt-1 font-sans tracking-tight tabular-nums text-lg font-bold text-slate-800 leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

// Utility helpers for date handling
const formatDateToYYYYMMDD = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToString = (date) => {
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getAdditionalNights = (currentOutStr, newOutStr) => {
  const currentOut = new Date(currentOutStr);
  const newOut = new Date(newOutStr);
  if (isNaN(currentOut.getTime()) || isNaN(newOut.getTime())) return 0;
  const diffTime = newOut - currentOut;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const defaultGuests = [];

const normalizePhone = (p) => String(p || '').replace(/\D/g, '').slice(-10);

const matchBookingToUser = (b, u) => {
  const uId = String(u._id || u.id || '').trim();
  const bGuestId = String(b.guestId || b.user || b.userId || '').trim();
  if (uId && bGuestId && uId === bGuestId) return true;

  const uEmail = String(u.email || '').trim().toLowerCase();
  const bEmail = String(b.email || '').trim().toLowerCase();
  if (uEmail && bEmail && uEmail === bEmail) return true;

  const uPhone10 = normalizePhone(u.phone || u.mobile);
  const bPhone10 = normalizePhone(b.phone || b.mobile || b.guestPhone);
  if (uPhone10 && bPhone10 && uPhone10.length >= 10 && uPhone10 === bPhone10) return true;

  const uName = String(u.name || '').trim().toLowerCase();
  const bName = String(b.guest || b.guestName || b.customerName || b.name || '').trim().toLowerCase();
  if (uName && bName) {
    if (uName === bName) return true;
    if (uName.split(' ')[0] === bName.split(' ')[0] && (uPhone10 || uEmail)) return true;
  }
  return false;
};

const findRelevantStay = (guestBookings) => {
  if (!guestBookings || guestBookings.length === 0) return null;
  
  // 1. In-house / Checked-in is active stay
  const active = guestBookings.find(b => {
    const s = String(b.status || '').toLowerCase().trim();
    return s === 'checked-in' || s === 'checked in' || s === 'staying' || s === 'in-house';
  });
  if (active) return active;

  // 2. Upcoming / Confirmed reservation
  const confirmed = guestBookings.find(b => {
    const s = String(b.status || '').toLowerCase().trim();
    return s === 'confirmed' || s === 'expected';
  });
  if (confirmed) return confirmed;

  // 3. Most recent stay
  const sorted = [...guestBookings].sort((x, y) => {
    const dY = new Date(y.checkIn || y.createdAt || 0).getTime() || 0;
    const dX = new Date(x.checkIn || x.createdAt || 0).getTime() || 0;
    return dY - dX;
  });
  return sorted[0];
};

const resolveRoomInfo = (booking) => {
  if (!booking) {
    return { rNum: '', roomVariant: 'AC', roomType: 'Standard Room', roomDisplay: '—' };
  }
  const rNum = extractRoomNumber(booking) || (booking.roomNumber ? String(booking.roomNumber) : '') || (booking.room && String(booking.room).match(/\b\d{3,4}\b/)?.[0]) || '';
  const roomVariant = booking.roomVariant || booking.climateType || (String(booking.roomType || '').toLowerCase().includes('non-ac') ? 'Non-AC' : 'AC');
  const roomType = booking.roomType || (booking.room && String(booking.room).includes('·') ? String(booking.room).split('·')[1]?.trim() : (rNum.startsWith('5') ? 'Penthouse Suite' : rNum.startsWith('4') ? 'Presidential Suite' : rNum.startsWith('3') ? 'Executive Suite' : rNum.startsWith('2') ? 'Deluxe Room' : 'Standard Room'));
  const roomDisplay = rNum ? `Room ${rNum}` : (booking.room || '—');
  return { rNum, roomVariant, roomType, roomDisplay };
};

function GuestsCrmPage() {
  const navigate = useNavigate();

  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Sort & Pagination
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add note modal inline state
  const [noteTargetGuest, setNoteTargetGuest] = useState(null);
  const [newNoteText, setNewNoteText] = useState("");

  // Extend Stay modal state
  const [extendingBooking, setExtendingBooking] = useState(null);

  const handleOpenExtendModal = (b) => {
    setExtendingBooking(b);
  };

  const loadGuests = async () => {
    setLoading(true);
    try {
      const [usersRes, resRes] = await Promise.all([
        superAdminService.getUsers(),
        superAdminService.getReservations()
      ]);
      const guestUsers = usersRes.success && usersRes.data ? usersRes.data.filter(u => u.role === "guest") : [];
      const bookings = resRes.success && resRes.data ? resRes.data : [];

      const matchedBookingIds = new Set();

      const compiled = guestUsers.map(u => {
        const guestBookings = bookings.filter(b => {
          const isMatch = matchBookingToUser(b, u);
          if (isMatch) matchedBookingIds.add(b._id || b.id || b.bookingId);
          return isMatch;
        });

        const latest = findRelevantStay(guestBookings);
        const { rNum, roomVariant, roomType, roomDisplay } = resolveRoomInfo(latest);
        const guestTariff = guestBookings.reduce((sum, b) => sum + Number(b.totalAmount || b.amount || 0), 0) || (latest ? Number(latest.totalAmount || latest.amount || 0) : 0);

        return {
          ...u,
          id: u._id || u.id,
          _id: u._id || u.id,
          name: u.name,
          email: u.email || "—",
          phone: u.mobile || u.phone || "—",
          stays: guestBookings.length,
          tariff: guestTariff,
          balance: guestBookings.reduce((sum, b) => sum + (b.balance || 0), 0),
          room: rNum || '—',
          roomDisplay,
          roomVariant,
          roomType,
          currentStay: latest ? `${roomDisplay} · ${roomType}` : '—',
          status: (u.status === 'Inactive' || u.isDeleted) ? 'Inactive' : (latest ? (latest.status === 'Checked-in' ? 'Staying-In' : latest.status === 'Confirmed' ? 'Expected' : 'Checked-out') : 'Inactive'),
          accountStatus: (u.status === 'Inactive' || u.isDeleted) ? 'Inactive' : (u.status || 'Active'),
          latestStay: latest,
          history: guestBookings
        };
      });

      // Extract unique guests from remaining bookings that weren't matched to a user
      const extraGuestsMap = {};
      bookings.forEach(b => {
        const bId = b._id || b.id || b.bookingId;
        if (!b.guest || matchedBookingIds.has(bId)) return;
        const gNameLower = b.guest.trim().toLowerCase();
        const bPhone10 = normalizePhone(b.phone || b.mobile || b.guestPhone);
        const guestKey = bPhone10 ? `phone_${bPhone10}` : `name_${gNameLower}`;

        if (!extraGuestsMap[guestKey]) {
          const guestBookings = bookings.filter(bk => {
            const bkPhone10 = normalizePhone(bk.phone || bk.mobile || bk.guestPhone);
            if (bPhone10 && bkPhone10 && bPhone10 === bkPhone10) return true;
            return bk.guest?.trim().toLowerCase() === gNameLower;
          });

          const latest = findRelevantStay(guestBookings);
          const { rNum, roomVariant, roomType, roomDisplay } = resolveRoomInfo(latest);
          const guestTariff = guestBookings.reduce((sum, bk) => sum + Number(bk.totalAmount || bk.amount || 0), 0) || (latest ? Number(latest.totalAmount || latest.amount || 0) : 0);

          extraGuestsMap[guestKey] = {
            id: b._id || b.id || `GST-${Date.now()}`,
            _id: b._id || b.id,
            name: b.guest,
            email: b.email || `${b.guest.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
            phone: b.phone || "+91 98765 43210",
            city: b.city || "Hyderabad",
            state: "Telangana",
            country: "India",
            address: "Guest Address",
            tier: "Regular",
            type: "Regular",
            stays: guestBookings.length,
            tariff: guestTariff,
            spend: guestTariff,
            balance: guestBookings.reduce((sum, bk) => sum + (bk.balance || 0), 0),
            room: rNum || '—',
            roomDisplay,
            roomVariant,
            roomType,
            currentStay: latest ? `${roomDisplay} · ${roomType}` : '—',
            status: latest ? (latest.status === 'Checked-in' ? 'Staying-In' : latest.status === 'Confirmed' ? 'Expected' : 'Checked-out') : 'Inactive',
            latestStay: latest,
            history: guestBookings,
            billing: []
          };
        }
      });

      const fullList = [...compiled, ...Object.values(extraGuestsMap)];
      setGuests(fullList);
    } catch (err) {
      toast.error("Failed to load guests from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();

    const unsubscribe = subscribeRealtimeSync(() => {
      loadGuests();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const syncGuests = (updatedList) => {
    setGuests(updatedList);
  };

  // Filter calculations
  const filteredList = guests.filter(g => {
    const matchesSearch = 
      !searchQuery ||
      String(g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(g.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(g.phone || '').includes(searchQuery) ||
      String(g.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(g.room || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(g.roomType || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" || 
      g.status === statusFilter;

    const matchesDate = 
      !dateFilter || 
      (g.latestStay && (g.latestStay.checkIn?.includes(dateFilter) || g.latestStay.checkOut?.includes(dateFilter))) ||
      (Array.isArray(g.history) && g.history.some(h => h.checkIn?.includes(dateFilter) || h.checkOut?.includes(dateFilter)));

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Sort logic
  const sortedList = [...filteredList].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const paginatedList = sortedList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics computations
  const totalGuestsCount = guests.length;
  const stayingGuestsCount = guests.filter(g => g.status === "Staying-In").length;
  const upcomingGuestsCount = guests.filter(g => g.status === "Expected").length;
  const returningGuestsCount = guests.filter(g => g.stays > 5).length;
  const vipGuestsCount = guests.filter(g => g.type === "VIP").length;

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteTargetGuest) return;

    try {
      const targetId = noteTargetGuest._id || noteTargetGuest.id;
      await superAdminService.updateUser(targetId, { notes: newNoteText });
      toast.success(`Note profile updated for ${noteTargetGuest.name}`);
      loadGuests();
      setNoteTargetGuest(null);
      setNewNoteText("");
    } catch (err) {
      toast.error(err.message || "Failed to update guest notes.");
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {/* KPI metrics cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <PremiumStatCard
          label="Total Guests"
          value={totalGuestsCount.toString()}
          hint="All registered profiles"
          accentColor="#0d1b2a"
        />
        <PremiumStatCard
          label="Currently Staying"
          value={stayingGuestsCount.toString()}
          hint="Checked-in guests"
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="Upcoming Stays"
          value={upcomingGuestsCount.toString()}
          hint="Expected check-ins"
          accentColor="#3b82f6"
        />
        <PremiumStatCard
          label="Returning Guests"
          value={returningGuestsCount.toString()}
          hint="More than 5 stays"
          accentColor="#8b5cf6"
        />
        <PremiumStatCard
          label="VIP Stays"
          value={vipGuestsCount.toString()}
          hint="High priority guests"
          accentColor="#eab308"
        />
      </div>

      {/* Filter and Search Bar Panel - Single Line Layout */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:flex-1 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Search guest name, phone, email, room, or guest ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs font-semibold bg-[#FDFCFA]/10 border-muted w-full"
              />
            </div>

            {/* Stay Status Filter (beside right to search bar) */}
            <div className="w-full sm:w-44 shrink-0">
              <Select
                id="status"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="text-xs h-9 font-semibold bg-[#FDFCFA]/10 border-muted w-full"
              >
                <option value="all">All Statuses</option>
                <option value="Staying-In">Staying-In</option>
                <option value="Expected">Expected</option>
                <option value="Checked-out">Checked-out</option>
              </Select>
            </div>

            {/* Stay Date Filter */}
            <div className="w-full sm:w-44 shrink-0">
              <Input
                id="date"
                type="date"
                placeholder="Filter by stay date..."
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs font-semibold bg-[#FDFCFA]/10 border-muted w-full"
              />
            </div>
          </div>

          {/* Add Guest Button */}
          <div className="flex items-center gap-3 select-none shrink-0 w-full lg:w-auto justify-end">
            <Button
              onClick={() => navigate({ to: "/admin/guests/add" })}
              className="bg-navy hover:bg-navy/90 text-white shadow-soft text-xs h-8.5 px-4 font-bold rounded-full shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="size-3.5" /> Add Guest
            </Button>
          </div>
        </div>
      </div>

      {/* Guest Directory listing */}
      <Panel title="Guest Directory Catalog">
        {paginatedList.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground select-none">No guest profiles match the current query parameters.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[1100px] table-auto text-xs">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-3.5 pl-4 pr-3 text-left whitespace-nowrap min-w-[180px] cursor-pointer hover:text-navy" onClick={() => toggleSort("name")}>Guest</th>
                  <th className="py-3.5 px-3 text-left whitespace-nowrap min-w-[160px]">Contact</th>
                  <th className="py-3.5 px-3 text-left whitespace-nowrap min-w-[110px] cursor-pointer hover:text-navy" onClick={() => toggleSort("type")}>Guest Type</th>
                  <th className="py-3.5 px-3 text-left whitespace-nowrap min-w-[200px]">Current/Last Stay</th>
                  <th className="py-3.5 px-3 text-left whitespace-nowrap min-w-[140px]">Room</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap min-w-[110px] cursor-pointer hover:text-navy" onClick={() => toggleSort("stays")}>Total Stays</th>
                  <th className="py-3.5 px-3 text-left whitespace-nowrap min-w-[110px] cursor-pointer hover:text-navy" onClick={() => toggleSort("tariff")}>Tariff</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap min-w-[110px]">Status</th>
                  <th className="py-3.5 pl-3 pr-4 text-left whitespace-nowrap min-w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30">
                {paginatedList.map((g) => (
                  <tr key={g._id} className="hover:bg-muted/5 transition-colors">
                    <td className="py-3.5 pl-4 pr-3 font-bold text-navy text-left align-middle min-w-[180px]">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-navy/5 text-navy font-bold text-xs grid place-items-center shrink-0 select-none">
                          {g.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-bold text-navy leading-snug">{g.name}</p>
                          <span className="text-[9.5px] text-muted-foreground font-semibold">{g.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-left align-middle text-muted-foreground space-y-0.5 min-w-[160px]">
                      <p className="font-semibold text-navy select-all">{g.phone}</p>
                      <p className="text-[10px] select-all">{g.email}</p>
                    </td>
                    <td className="py-3.5 px-3 text-left align-middle font-semibold text-navy min-w-[110px] whitespace-nowrap">{g.type || "Regular"}</td>
                    <td className="py-3.5 px-3 text-left align-middle font-medium text-navy min-w-[200px] whitespace-nowrap">
                      {g.latestStay ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-navy text-xs flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="size-3 text-muted-foreground shrink-0" />
                            <span>{g.latestStay.checkIn || '—'} → {g.latestStay.checkOut || '—'}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-brand font-bold">{g.roomType || 'Standard Room'}</span>
                            <span>•</span>
                            <span>{g.latestStay.nights || 1} {(g.latestStay.nights || 1) === 1 ? 'Night' : 'Nights'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-left align-middle min-w-[140px] whitespace-nowrap">
                      {g.room && g.room !== '—' ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-navy text-xs">
                            {String(g.room).startsWith('Room') ? g.room : `Room #${g.room}`}
                          </span>
                          <span className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                            g.roomVariant === 'Non-AC'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple/10 text-purple border border-purple/20'
                          }`}>
                            {g.roomVariant || 'AC'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center align-middle font-bold min-w-[110px] whitespace-nowrap">{g.stays} {g.stays === 1 ? 'Stay' : 'Stays'}</td>
                    <td className="py-3.5 px-3 text-left align-middle font-bold text-navy min-w-[110px] whitespace-nowrap">
                      ₹{Number(g.tariff !== undefined ? g.tariff : (g.spend || g.balance || 0)).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-3 text-center align-middle min-w-[110px] whitespace-nowrap">
                      <Tag tone={
                        (g.status === "Inactive" || g.accountStatus === "Inactive") ? "error" :
                        g.status === "Staying-In" ? "success" : 
                        g.status === "Expected" ? "warning" : "neutral"
                      }>
                        {(g.status === "Inactive" || g.accountStatus === "Inactive") ? "Inactive" : g.status}
                      </Tag>
                    </td>
                    <td className="py-3.5 pl-3 pr-4 text-left align-middle min-w-[160px] whitespace-nowrap">
                      <ActionGroup align="left">
                        {g.status === "Inactive" || g.accountStatus === "Inactive" ? (
                          <ViewActionButton
                            onClick={() => navigate({ to: `/admin/guests/view/${g._id}` })}
                          />
                        ) : (
                          <>
                            {(g.status === "Staying-In" || g.latestStay?.status === "Checked-in" || g.latestStay?.status === "Staying") && g.latestStay && (
                              <ExtendActionButton
                                onClick={() => navigate({ to: `/admin/reservations/extend/${g.latestStay.bookingId || g.latestStay._id || g.latestStay.id}` })}
                                title="Extend Stay"
                              />
                            )}
                            <ViewActionButton
                              onClick={() => navigate({ to: `/admin/guests/view/${g._id}` })}
                            />
                            {(g.status !== "Checked-out" && g.status !== "Checked Out") && (
                              <EditActionButton
                                onClick={() => navigate({ to: `/admin/guests/edit/${g._id}` })}
                              />
                            )}
                          </>
                        )}
                      </ActionGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-muted/50 flex items-center justify-between select-none">
            <span className="text-xs text-muted-foreground">
              Showing page {currentPage} of {totalPages} ({filteredList.length} guests matching)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                className="size-8 rounded-full"
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                className="size-8 rounded-full"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {/* Add / Edit Note dialog Modal popup */}
      {noteTargetGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Add Note: {noteTargetGuest.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                onClick={() => { setNoteTargetGuest(null); setNewNoteText(""); }}
              >
                <XCircle className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveNote} className="p-5 space-y-4">
              <p className="text-[11px] text-muted-foreground">Append administrative notes regarding check-in preferences or regulatory exemptions:</p>
              
              <textarea
                required
                rows={4}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write guest preferences or check-in instructions here..."
                className="w-full p-3 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy"
              />

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setNoteTargetGuest(null); setNewNoteText(""); }}
                  className="h-8.5 px-4 text-xs rounded-full"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white h-8.5 px-5 text-xs font-bold rounded-full">
                  Save Note
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}