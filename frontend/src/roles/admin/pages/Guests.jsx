import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Crumbs, ActionGroup, ViewActionButton, EditActionButton, ExtendActionButton, ActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
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
        <h3 className="mt-1 font-display text-lg font-black text-navy leading-none">{value}</h3>
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

function GuestsCrmPage() {
  const navigate = useNavigate();

  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
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

      const guestUserNames = new Set(guestUsers.map(u => u.name?.toLowerCase()));
      const compiled = guestUsers.map(u => {
        const guestBookings = bookings.filter(b => b.guest?.toLowerCase() === u.name?.toLowerCase() || (b.phone && (b.phone === u.mobile || b.phone === u.phone)));
        const sorted = [...guestBookings].sort((x, y) => new Date(y.checkIn) - new Date(x.checkIn));
        const latest = sorted[0];
        const rNum = extractRoomNumber(latest);
        const roomDisplay = rNum ? `Room ${rNum}` : (latest?.room ? (String(latest.room).startsWith('Room') ? latest.room : `Room ${latest.room}`) : '—');
        const roomType = latest?.roomType || (latest?.room && String(latest.room).includes('·') ? String(latest.room).split('·')[1]?.trim() : 'Deluxe Room');
        
        return {
          ...u,
          id: u._id || u.id,
          _id: u._id || u.id,
          name: u.name,
          email: u.email || "—",
          phone: u.mobile || u.phone || "—",
          stays: guestBookings.length,
          balance: guestBookings.reduce((sum, b) => sum + (b.balance || 0), 0),
          room: rNum || '—',
          roomDisplay,
          roomType,
          currentStay: latest ? `${roomDisplay} · ${roomType}` : '—',
          status: latest ? (latest.status === 'Checked-in' ? 'Staying-In' : latest.status === 'Confirmed' ? 'Expected' : 'Checked-out') : 'Inactive',
          latestStay: latest
        };
      });

      // Extract unique guests from bookings that are not registered users
      const extraGuestsMap = {};
      bookings.forEach(b => {
        if (!b.guest) return;
        const gNameLower = b.guest.toLowerCase();
        if (!guestUserNames.has(gNameLower) && !extraGuestsMap[gNameLower]) {
          const guestBookings = bookings.filter(bk => bk.guest?.toLowerCase() === gNameLower);
          const sorted = [...guestBookings].sort((x, y) => new Date(y.checkIn) - new Date(x.checkIn));
          const latest = sorted[0];
          const rNum = extractRoomNumber(latest);
          const roomDisplay = rNum ? `Room ${rNum}` : (latest?.room ? (String(latest.room).startsWith('Room') ? latest.room : `Room ${latest.room}`) : '—');
          const roomType = latest?.roomType || (latest?.room && String(latest.room).includes('·') ? String(latest.room).split('·')[1]?.trim() : 'Deluxe Room');
          
          extraGuestsMap[gNameLower] = {
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
            spend: guestBookings.reduce((sum, bk) => sum + (bk.amount || 0), 0),
            balance: guestBookings.reduce((sum, bk) => sum + (bk.balance || 0), 0),
            room: rNum || '—',
            roomDisplay,
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
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.phone.includes(searchQuery) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProperty = 
      propertyFilter === "all" || 
      g.currentStay.toLowerCase().includes(propertyFilter.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" || 
      g.status === statusFilter;

    const matchesDate = 
      !dateFilter || 
      g.history.some(h => h.checkIn === dateFilter || h.checkOut === dateFilter);

    return matchesSearch && matchesProperty && matchesStatus && matchesDate;
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

      {/* Filters and Query Parameters Section */}
      <Panel title="Dossier Directories Filters">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <FormField label="Search Guest Details" id="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                className="pl-9 h-10 text-xs font-bold"
                placeholder="Name, phone, email, ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </FormField>

          <FormField label="Property Location" id="property">
            <Select
              id="property"
              value={propertyFilter}
              onChange={(e) => { setPropertyFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All Properties</option>
              <option value="Udaipur">Palace Udaipur</option>
              <option value="Jaipur">Jaipur Resort</option>
              <option value="Goa">Goa Beach</option>
              <option value="Kerala">Kerala Retreat</option>
            </Select>
          </FormField>

          <FormField label="Stay Status" id="status">
            <Select
              id="status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All Statuses</option>
              <option value="Staying-In">Staying-In</option>
              <option value="Expected">Expected</option>
              <option value="Checked-out">Checked-out</option>
            </Select>
          </FormField>

          <FormField label="Stay Activity Date" id="date">
            <Input
              id="date"
              type="date"
              className="h-10 text-xs font-bold"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
            />
          </FormField>

          <div className="flex justify-end select-none">
            <Button
              className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full shadow-soft flex items-center gap-1.5 w-full justify-center"
              onClick={() => navigate({ to: "/admin/guests/add" })}
            >
              <Plus className="size-4" /> Add Guest
            </Button>
          </div>
        </div>
      </Panel>

      {/* Guest Directory listing */}
      <Panel title="Guest Directory Catalog">
        {paginatedList.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground select-none">No guest profiles match the current query parameters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                  <th className="py-3 px-4 cursor-pointer hover:text-navy" onClick={() => toggleSort("name")}>Guest</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-navy" onClick={() => toggleSort("type")}>Guest Type</th>
                  <th className="py-3 px-4">Current/Last Stay</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-navy" onClick={() => toggleSort("stays")}>Total Stays</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-navy" onClick={() => toggleSort("balance")}>Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-left min-w-[160px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30">
                {paginatedList.map((g) => (
                  <tr key={g._id} className="hover:bg-muted/5">
                    <td className="py-3.5 px-4 font-bold text-navy text-left align-middle">
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
                    <td className="py-3.5 px-4 text-left align-middle text-muted-foreground space-y-0.5">
                      <p className="font-semibold text-navy select-all">{g.phone}</p>
                      <p className="text-[10px] select-all">{g.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-left align-middle font-semibold text-navy">{g.type || "Regular"}</td>
                    <td className="py-3.5 px-4 text-left align-middle font-medium text-navy max-w-[180px]">
                      <div>{g.currentStay}</div>
                      {g.latestStay && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 select-none font-semibold">
                          Out: {g.latestStay.checkOut}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-left align-middle font-mono font-bold text-brand">
                      {g.room && g.room !== '—' ? (String(g.room).startsWith('Room') ? g.room : `Room ${g.room}`) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center align-middle font-bold">{g.stays} {g.stays === 1 ? 'Stay' : 'Stays'}</td>
                    <td className={`py-3.5 px-4 text-left align-middle font-black ${g.balance > 0 ? "text-destructive" : "text-success"}`}>
                      ₹{(g.balance || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center align-middle">
                      <Tag tone={g.status === "Staying-In" ? "success" : g.status === "Expected" ? "warning" : "neutral"}>
                        {g.status}
                      </Tag>
                    </td>
                    <td className="py-3 px-4 text-left align-middle min-w-[160px] whitespace-nowrap">
                      <ActionGroup align="left">
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
              <h3 className="font-semibold text-navy text-sm">Add Note: {noteTargetGuest.name}</h3>
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