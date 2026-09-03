import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Crumbs } from "@/components/hs/kit";
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
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [dailyRate, setDailyRate] = useState(0);
  const [extendingSubmit, setExtendingSubmit] = useState(false);

  const handleOpenExtendModal = (b) => {
    setExtendingBooking(b);
    const currentOut = new Date(b.checkOut);
    const nextDay = new Date(currentOut.getTime() + 24 * 60 * 60 * 1000);
    setNewCheckOutDate(formatDateToYYYYMMDD(nextDay));
    const avgNightWithTax = b.amount / (b.nights || 1);
    setDailyRate(Math.round(avgNightWithTax / 1.18));
  };

  const handleConfirmExtend = async () => {
    if (!extendingBooking || !newCheckOutDate) return;
    const additionalNights = getAdditionalNights(extendingBooking.checkOut, newCheckOutDate);
    if (additionalNights <= 0) {
      toast.error("New check-out date must be after current check-out date.");
      return;
    }
    
    setExtendingSubmit(true);
    try {
      const roomCharges = dailyRate * additionalNights;
      const gst = Math.round(roomCharges * 0.18);
      const totalAdditionalAmount = roomCharges + gst;
      
      const payload = {
        newCheckOut: formatDateToString(new Date(newCheckOutDate)),
        additionalNights,
        additionalAmount: totalAdditionalAmount
      };
      
      const res = await managerService.extendReservation(extendingBooking._id || extendingBooking.id, payload);
      if (res.success) {
        toast.success(`Stay extended successfully until ${payload.newCheckOut}!`);
        setExtendingBooking(null);
        loadGuests();
      } else {
        toast.error(res.message || "Failed to extend stay.");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred while extending stay.");
    } finally {
      setExtendingSubmit(false);
    }
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
        
        return {
          ...u,
          id: u._id || u.id,
          _id: u._id || u.id,
          name: u.name,
          email: u.email || "—",
          phone: u.mobile || u.phone || "—",
          stays: guestBookings.length,
          balance: guestBookings.reduce((sum, b) => sum + (b.balance || 0), 0),
          room: latest && latest.room ? latest.room.split(" ")[0] : '—',
          currentStay: latest ? `${latest.room ? latest.room : 'Not Assigned'}` : '—',
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
            room: latest && latest.room ? latest.room.split(" ")[0] : '—',
            currentStay: latest ? `${latest.room ? latest.room : 'Not Assigned'}` : '—',
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

    const handleFocus = () => {
      loadGuests();
    };
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadGuests();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
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
                  <th className="py-3 px-4 text-left font-bold" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Action</th>
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
                          {g.latestStay.status === "Checked-in" && (
                            <button
                              onClick={() => handleOpenExtendModal(g.latestStay)}
                              className="text-brand hover:underline font-bold ml-1.5 cursor-pointer"
                            >
                              Extend
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-left align-middle font-mono font-bold">#{g.room}</td>
                    <td className="py-3.5 px-4 text-center align-middle font-bold">{g.stays} {g.stays === 1 ? 'Stay' : 'Stays'}</td>
                    <td className={`py-3.5 px-4 text-left align-middle font-black ${g.balance > 0 ? "text-destructive" : "text-success"}`}>
                      ₹{(g.balance || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center align-middle">
                      <Tag tone={g.status === "Staying-In" ? "success" : g.status === "Expected" ? "warning" : "neutral"}>
                        {g.status}
                      </Tag>
                    </td>
                    <td className="py-3 px-4 text-left align-middle" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                      <div className="flex items-center justify-start gap-1 select-none">
                        <Button
                          onClick={() => navigate({ to: `/admin/guests/view/${g._id}` })}
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 flex items-center justify-center rounded-full cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="size-4" />
                        </Button>
                        {(g.status !== "Checked-out" && g.status !== "Checked Out") && (
                          <>
                            <Button
                              onClick={() => navigate({ to: `/admin/guests/edit/${g._id}` })}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 flex items-center justify-center rounded-full cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              onClick={() => { setNoteTargetGuest(g); setNewNoteText(g.notes || ""); }}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-navy hover:bg-muted/15 flex items-center justify-center rounded-full cursor-pointer"
                              title="Add Note"
                            >
                              <FileText className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
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

      {/* Extend Stay Modal */}
      {extendingBooking && (
        <div className="fixed inset-0 bg-[#071420]/75 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-muted shadow-lift w-full max-w-md overflow-hidden animate-scale-up text-left font-sans">
            
            {/* Modal Header */}
            <div className="bg-navy p-5 text-white flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold">Extend Stay Duration</h3>
                <p className="text-[10px] text-[#A5F3FC] font-semibold mt-1">Guest: {extendingBooking.guest} · Room: {extendingBooking.room}</p>
              </div>
              <button
                onClick={() => setExtendingBooking(null)}
                className="text-white/60 hover:text-white cursor-pointer text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs text-navy">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Current Checkout</label>
                  <p className="font-semibold text-navy-deep bg-muted/20 border border-muted/50 p-2.5 rounded-lg text-[11px]">{extendingBooking.checkOut}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">New Checkout Date</label>
                  <input
                    type="date"
                    min={formatDateToYYYYMMDD(new Date(new Date(extendingBooking.checkOut).getTime() + 24 * 60 * 60 * 1000))}
                    value={newCheckOutDate}
                    onChange={(e) => setNewCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy text-navy font-semibold h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Additional Nights</label>
                  <p className="font-bold text-navy bg-muted/20 border border-muted/50 p-2.5 rounded-lg text-xs">
                    {getAdditionalNights(extendingBooking.checkOut, newCheckOutDate)} Nights
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Daily Charge (Excl. GST)</label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy text-navy font-bold h-9"
                  />
                </div>
              </div>

              {/* Price Breakdown Ledger */}
              <div className="border-t border-muted pt-4 space-y-2 select-none">
                <div className="flex justify-between font-semibold text-muted-foreground">
                  <span>Room Charges (Excl. GST):</span>
                  <span>₹{(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-muted-foreground">
                  <span>GST (18%):</span>
                  <span>₹{Math.round(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) * 0.18).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-black text-navy text-sm pt-2 border-t border-muted/50">
                  <span>Total Additional Amount:</span>
                  <span className="text-brand">
                    ₹{(
                      dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) +
                      Math.round(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) * 0.18)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex justify-end gap-2 border-t border-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setExtendingBooking(null)}
                  className="h-9 px-4 text-xs font-bold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmExtend}
                  disabled={extendingSubmit || getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) <= 0}
                  className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-5 rounded-md cursor-pointer"
                >
                  {extendingSubmit ? "Processing..." : "Confirm Extension"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}