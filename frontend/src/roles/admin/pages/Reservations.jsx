import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, PageHeader, Notice, LoadingRows } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
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
  ChevronRight
} from "lucide-react";

const operationsTabs = [
  { label: "Reservations", to: "/admin/reservations", icon: CalendarCheck },
  { label: "Rooms & Rates", to: "/admin/rooms", icon: Bed },
  { label: "Guests", to: "/admin/guests", icon: Users },
  { label: "Front Desk", to: "/admin/front-desk", icon: ConciergeBell }
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

function ReservationsPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState("list");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Waitlist state
  const [waitlist, setWaitlist] = useState([
    { id: "WTL-01", guest: "Devendra Shastri", phone: "+91 93450 09912", roomType: "Maharaja Suite", dates: "18 Aug - 20 Aug" },
    { id: "WTL-02", guest: "Siddharth Sen", phone: "+91 98450 11223", roomType: "Villa Suite", dates: "20 Aug - 22 Aug" }
  ]);

  async function loadReservations() {
    try {
      setLoading(true);
      setError(null);
      const res = await superAdminService.getReservations();
      setReservations(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations();
  }, []);

  async function handleStatusChange(booking, newStatus) {
    try {
      await superAdminService.updateReservation(booking._id, { status: newStatus });
      loadReservations();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await superAdminService.deleteReservation(id);
      loadReservations();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

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
    const matchesSearch =
      res.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.room && res.room.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || res.status === statusFilter;
    const matchesSource = sourceFilter === "all" || res.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Calculate high-level KPIs
  const totalBookingsCount = filteredReservations.length;
  const confirmedCount = filteredReservations.filter((r) => r.status === "Confirmed").length;
  const checkedInCount = filteredReservations.filter((r) => r.status === "Checked-in").length;
  const pendingCount = filteredReservations.filter((r) => r.status === "Pending").length;

  // Overbooking checker: Maharaja Suite limit (max 2 bookings on any day)
  let showOverbookingWarning = false;
  const bookingsOnAug18 = reservations.filter(r => r.checkIn <= "2026-08-18" && r.checkOut >= "2026-08-18" && r.room?.includes("302"));
  if (bookingsOnAug18.length > 1) {
    showOverbookingWarning = true;
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={operationsTabs} />

      {error && <Notice tone="error" title="Sync Failure">{error}</Notice>}

      {showOverbookingWarning && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 text-destructive animate-pulse select-none">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Overbooking Threshold Alert</h4>
            <p className="text-xs mt-0.5">Maharaja Suite Room 302 has multiple active overlapping check-ins scheduled for August 18. Immediate reassignment recommended.</p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-muted p-5 shadow-soft border-l-4 border-l-navy transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Bookings</p>
            <p className="mt-2 font-display text-2xl font-black text-navy leading-none">{totalBookingsCount}</p>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">Across all room types and dates</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-5 shadow-soft border-l-4 border-l-success transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Checked In</p>
            <p className="mt-2 font-display text-2xl font-black text-navy leading-none">{checkedInCount}</p>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">Currently active in-house stays</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-5 shadow-soft border-l-4 border-l-brand transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confirmed Bookings</p>
            <p className="mt-2 font-display text-2xl font-black text-navy leading-none">{confirmedCount}</p>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">Upcoming future reservations</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-5 shadow-soft border-l-4 border-l-warning transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending Action</p>
            <p className="mt-2 font-display text-2xl font-black text-navy leading-none">{pendingCount}</p>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">Awaiting check-in or deposit clearance</p>
        </div>
      </div>

      {/* Filter and Search Bar Panel */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="Search by guest name or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </Select>

            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-40"
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

        {/* View Mode Toggle and New Reservation Actions */}
        <div className="flex items-center gap-2 select-none shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex rounded-lg border border-muted bg-[#fcfcfc] p-1 gap-1">
            <Button
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              className="h-8 text-xs font-bold px-3.5"
              onClick={() => setViewMode("list")}
            >
              <List className="size-3.5 mr-1" /> List View
            </Button>
            <Button
              size="sm"
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              className="h-8 text-xs font-bold px-3.5"
              onClick={() => setViewMode("calendar")}
            >
              <Calendar className="size-3.5 mr-1" /> Calendar View
            </Button>
          </div>
          <Button
            onClick={() => navigate({ to: "/admin/reservations/add" })}
            className="bg-navy hover:bg-navy/90 text-white shadow-soft text-xs h-8.5 px-3.5 font-bold rounded-full"
          >
            <Plus className="size-3.5 mr-1" /> New Booking
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "list" ? (
        /* List View Component */
        <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-8">
              <LoadingRows rows={5} />
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="p-16 text-center">
              <CalendarCheck className="size-12 text-muted-foreground/45 mx-auto mb-3" />
              <h3 className="font-semibold text-navy">No reservations found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try modifying your filter settings or create a new booking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                    <th className="py-4.5 px-6">Guest Info</th>
                    <th className="py-4.5 px-4">Room No</th>
                    <th className="py-4.5 px-4">Stay Dates</th>
                    <th className="py-4.5 px-4">Channel / Type</th>
                    <th className="py-4.5 px-4 text-right">Payment</th>
                    <th className="py-4.5 px-4 text-center">Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted text-sm text-[#2a2a2a]">
                  {filteredReservations.map((res) => {
                    const balanceVal = res.balance || 0;
                    const isPaid = balanceVal === 0;

                    return (
                      <tr key={res._id} className="hover:bg-[#fcfcfc]/60 transition-colors group">
                        <td className="py-4.5 px-6">
                          <div className="font-medium text-navy group-hover:text-brand transition-colors flex items-center gap-1.5">
                            {res.guest}
                            {res.groupBooking && (
                              <span className="rounded bg-navy/15 border border-navy/35 text-[9px] font-bold px-1 text-navy-deep uppercase scale-90">Group</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{res.phone}</div>
                        </td>
                        <td className="py-4.5 px-4 font-mono text-[13px]">{res.room || "—"}</td>
                        <td className="py-4.5 px-4">
                          <div className="font-medium">{res.checkIn} → {res.checkOut}</div>
                          <div className="text-[11px] text-muted-foreground">{res.nights || 1} Night(s) / {res.pax || "2 Adults"}</div>
                        </td>
                        <td className="py-4.5 px-4">
                          <span className="inline-flex items-center rounded-full bg-muted/60 border border-muted/80 px-2.5 py-0.5 text-xs font-semibold text-navy">
                            {res.source || "Direct"}
                          </span>
                        </td>
                        <td className="py-4.5 px-4 text-right">
                          <div className="font-semibold text-navy">₹{res.amount?.toLocaleString()}</div>
                          <div className={`text-[11px] font-bold ${isPaid ? "text-success" : "text-destructive"}`}>
                            {isPaid ? "Fully Paid" : `Bal: ₹${balanceVal.toLocaleString()}`}
                          </div>
                        </td>
                        <td className="py-4.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                              res.status === "Confirmed"
                                ? "bg-brand/10 text-brand border border-brand/20"
                                : res.status === "Checked-in"
                                ? "bg-success/10 text-success border border-success/20"
                                : res.status === "Checked-out"
                                ? "bg-muted text-muted-foreground border border-muted-foreground/15"
                                : res.status === "Cancelled"
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : "bg-warning/10 text-warning border border-warning/20"
                            }`}
                          >
                            {res.status === "Checked-in" && <CheckCircle className="size-3 shrink-0" />}
                            {res.status === "Pending" && <Clock className="size-3 shrink-0" />}
                            {res.status}
                          </span>
                        </td>
                        <td className="py-4.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
                            {res.status === "Pending" && (
                              <Button
                                onClick={() => handleStatusChange(res, "Checked-in")}
                                size="xs"
                                variant="outline"
                                className="text-success border-success/40 hover:bg-success/5 h-7 px-2.5 text-xs"
                              >
                                Check-In
                              </Button>
                            )}
                            {res.status === "Checked-in" && (
                              <Button
                                onClick={() => handleStatusChange(res, "Checked-out")}
                                size="xs"
                                variant="outline"
                                className="text-navy border-navy/40 hover:bg-navy/5 h-7 px-2.5 text-xs"
                              >
                                Check-Out
                              </Button>
                            )}
                             <Button
                               onClick={() => navigate({ to: `/admin/reservations/view/${res._id || res.id}` })}
                               size="icon"
                               variant="ghost"
                               className="size-8 hover:text-[#4f46e5]"
                               aria-label="View details"
                             >
                               <Eye className="size-3.5" />
                             </Button>
                             <Button
                               onClick={() => navigate({ to: `/admin/reservations/edit/${res._id || res.id}` })}
                               size="icon"
                               variant="ghost"
                               className="size-8 hover:text-brand"
                               aria-label="Edit booking"
                             >
                               <Edit2 className="size-3.5" />
                             </Button>
                            <Button
                              onClick={() => handleDelete(res._id)}
                              size="icon"
                              variant="ghost"
                              className="size-8 text-destructive hover:bg-destructive/5"
                              aria-label="Cancel booking"
                            >
                              <XCircle className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Scheduler Reservation Calendar Component */
        <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-muted">
            <h3 className="font-display font-black text-navy text-md">Room Scheduler Grid</h3>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="size-8"><ChevronLeft className="size-4" /></Button>
              <span className="text-xs font-bold text-navy">17 Aug - 23 Aug, 2026</span>
              <Button size="icon" variant="ghost" className="size-8"><ChevronRight className="size-4" /></Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-3 px-4 w-40">Room</th>
                  {calendarDates.map((d, idx) => (
                    <th key={idx} className="py-3 px-2 text-center w-24">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a]">
                {schedulerRooms.map((room) => (
                  <tr key={room.num} className="hover:bg-[#fcfcfc]/60">
                    <td className="py-4.5 px-4 font-semibold text-navy">
                      <div>#{room.num}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{room.type}</div>
                    </td>
                    
                    {calendarDates.map((dateObj, dIdx) => {
                      // Check if any reservation is active on this day in this room
                      const activeRes = reservations.find((r) => {
                        const match = r.room && r.room.match(/\d+/);
                        const roomNum = match ? match[0] : r.room;
                        return roomNum === room.num && r.checkIn <= dateObj.dateStr && r.checkOut >= dateObj.dateStr && r.status !== "Cancelled";
                      });

                      if (activeRes) {
                        const isStart = activeRes.checkIn === dateObj.dateStr;
                        
                        return (
                          <td key={dIdx} className="py-2.5 px-1 text-center select-none">
                            <div className={`py-1.5 px-2 rounded-lg text-[10px] font-bold truncate text-center ${
                              activeRes.status === "Checked-in"
                                ? "bg-success/15 text-success border border-success/30"
                                : "bg-brand/15 text-brand border border-brand/30"
                            }`}>
                              {isStart ? activeRes.guest.split(" ")[0] : "→"}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={dIdx} className="py-2.5 px-1 text-center select-none text-muted-foreground/35">
                          <span className="text-[10px] italic">Free</span>
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
          <h3 className="font-display font-black text-navy text-sm">Waitlisted Stays & Approvals</h3>
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
                  <h4 className="font-semibold text-navy text-sm">{item.guest}</h4>
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
    </div>
  );
}