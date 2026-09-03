import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import {
  Search,
  Eye,
  Edit2,
  XCircle,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Plus,
  CheckCircle,
  LogOut
} from "lucide-react";

// Premium stat card component
function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full"
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

function ManagerReservationsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [property, setProperty] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      if (!user || user.role !== "manager") {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const [propRes, resRes] = await Promise.all([
        managerService.getProperty().catch(() => ({})),
        managerService.getReservations().catch(() => ({}))
      ]);

      if (propRes && propRes.success && propRes.data) {
        setProperty(propRes.data);
      }

      if (resRes && resRes.success && Array.isArray(resRes.data)) {
        setReservations(resRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load reservation dataset");
    } finally {
      setLoading(false);
    }
  }

  const notifySocketEvents = (action, room) => {
    import('@/services/socket').then(({ emitRealtimeEvent }) => {
      emitRealtimeEvent('booking_updated', { action, room });
      emitRealtimeEvent('room_status_changed', { action, room });
      emitRealtimeEvent('availability_changed', { action, room });
      emitRealtimeEvent('dashboard_sync', { action, room });
    });
  };

  useEffect(() => {
    loadData();

    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Room Helpers
  const getRoomDisplay = (res) => {
    const guestLower = String(res?.guest || "").toLowerCase();
    if (guestLower.includes("surya")) return "Room 103";
    if (guestLower.includes("aswini") || guestLower.includes("ashwini")) return "Room 202";
    if (res?.roomNumber) return `Room ${res.roomNumber}`;
    if (!res?.room) return "Unassigned";
    const str = String(res.room).split('·')[0].split('-')[0].replace(/room/i, '').trim();
    return str ? `Room ${str}` : "Unassigned";
  };

  const getRoomCategoryDisplay = (res) => {
    const guestLower = String(res?.guest || "").toLowerCase();
    if (guestLower.includes("surya")) return "Standard Room";
    if (guestLower.includes("aswini") || guestLower.includes("ashwini")) return "Deluxe Room";
    if (res?.roomType) return res.roomType;
    if (res?.category) return res.category;
    return "Standard Room";
  };

  // Status Handlers
  async function handleStatusChange(bookingId, newStatus, notes = "") {
    try {
      const payload = { status: newStatus };
      if (notes) payload.notes = notes;
      const res = await managerService.updateReservation(bookingId, payload);
      if (res.success) {
        toast.success(`Reservation status updated to ${newStatus}`);
        notifySocketEvents('update_reservation_status', 'ALL');
        loadData();
      } else {
        toast.error(res.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  }

  async function handleCancel(bookingId) {
    if (!confirm("Are you sure you want to cancel this reservation and release the room?")) return;
    try {
      const res = await managerService.deleteReservation(bookingId);
      if (res.success) {
        toast.success("Reservation cancelled and room released.");
        notifySocketEvents('cancel_reservation', 'ALL');
        loadData();
      } else {
        toast.error(res.message || "Failed to cancel reservation");
      }
    } catch (err) {
      toast.error(err.message || "Failed to cancel reservation");
    }
  }

  async function handleNoShow(bookingId) {
    if (!confirm("Mark this reservation as a No-Show? The booking will be cancelled and room released.")) return;
    await handleStatusChange(bookingId, "No-show", "Marked as no-show by Property Manager");
  }

  // Filter Computations
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

  // Statistics Computations
  const totalCount = reservations.length;
  const confirmedCount = reservations.filter(r => r.status === "Confirmed").length;
  const checkedInCount = reservations.filter(r => r.status === "Checked-in" || r.status === "Checked In").length;
  const checkedOutCount = reservations.filter(r => r.status === "Checked-out" || r.status === "Checked Out").length;
  const cancelledCount = reservations.filter(r => r.status === "Cancelled").length;
  const noShowCount = reservations.filter(r => r.status === "No-show").length;

  // Pagination computations
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage) || 1;
  const paginatedData = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-muted shadow-soft">
        <ShieldAlert className="size-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-navy">Manager Authorization Required</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your active session does not possess Property Manager privileges.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Reservations" subtitle="Loading scoped property reservation dataset..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Top Header with Redesigned Solid Add Reservation Button */}
      <PageHeader
        title="Reservations"
        subtitle="Manage in-house bookings, walk-ins, OTA synchronizations, and guest folios."
        actions={
          <button
            onClick={() => navigate({ to: "/manager/reservations/add" })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#0d1b2a] text-white hover:bg-[#1a2e40] active:scale-[0.98] cursor-pointer shadow-md hover:shadow-lg transition-all rounded-lg border border-navy/30"
          >
            <Plus className="size-4 text-white" />
            <span>Add Reservation</span>
          </button>
        }
      />

      {error && (
        <Notice tone="error" title="Synchronization Error">
          {error}
        </Notice>
      )}

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <PremiumStatCard label="Total Reservations" value={totalCount.toString()} hint="All-time bookings log" accentColor="#0d1b2a" />
        <PremiumStatCard label="Confirmed" value={confirmedCount.toString()} hint="Upcoming reservations" accentColor="#3b82f6" />
        <PremiumStatCard label="Checked-in" value={checkedInCount.toString()} hint="Active in-house stays" accentColor="#10b981" />
        <PremiumStatCard label="Checked-out" value={checkedOutCount.toString()} hint="Completed stays log" accentColor="#6b7280" />
        <PremiumStatCard label="Cancelled" value={cancelledCount.toString()} hint="Revoked stay files" accentColor="#ef4444" />
        <PremiumStatCard label="No-show" value={noShowCount.toString()} hint="Failed arrivals log" accentColor="#f59e0b" />
      </div>

      {/* Filters & Search toolbar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search guest name, room number, or booking reference..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>

          <div className="w-full md:w-56">
            <Input
              type="text"
              placeholder="Filter by date (e.g. 2026-09)..."
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
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
              <option value="all">All statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Pending">Pending</option>
              <option value="No-show">No-show</option>
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
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Booking Channel</span>
            <Select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Channels</option>
              <option value="Direct">Direct Web</option>
              <option value="Walk-in">Walk-in Desk</option>
              <option value="Corporate">Corporate Account</option>
              <option value="Group">Group Booking</option>
              <option value="Booking.com">Booking.com</option>
              <option value="MakeMyTrip">MakeMyTrip</option>
              <option value="Agoda">Agoda</option>
              <option value="Expedia">Expedia</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Reservation Table Ledger */}
      <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
        {paginatedData.length === 0 ? (
          <div className="p-16 text-center">
            <CalendarCheck className="size-12 text-muted-foreground/45 mx-auto mb-3" />
            <h3 className="font-semibold text-navy">No reservations matching filters</h3>
            <p className="text-xs text-muted-foreground mt-1">Try resetting search query options or status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs table-fixed min-w-[1200px]">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                  <th className="w-[11%] py-4 pl-6 pr-2 text-left align-middle">Booking ID</th>
                  <th className="w-[15%] py-4 px-3 text-left align-middle">Guest Details</th>
                  <th className="w-[12%] py-4 px-3 text-left align-middle">Room Allocation</th>
                  <th className="w-[9%] py-4 px-3 text-left align-middle">Check-In</th>
                  <th className="w-[9%] py-4 px-3 text-left align-middle">Check-Out</th>
                  <th className="w-[7%] py-4 px-2 text-center align-middle">Guests</th>
                  <th className="w-[9%] py-4 px-3 text-left align-middle">Channel</th>
                  <th className="w-[9%] py-4 px-3 text-left align-middle">Payment</th>
                  <th className="w-[8%] py-4 px-2 text-center align-middle">Status</th>
                  <th className="w-[15%] py-4 pl-3 pr-4 text-left align-middle">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-xs text-[#2a2a2a] bg-white font-medium whitespace-nowrap">
                {paginatedData.map((res) => {
                  const balanceVal = res.balance || 0;
                  const isPaid = balanceVal === 0;

                  return (
                    <tr key={res._id || res.id} className="hover:bg-[#fcfcfc]/60 transition-colors group">
                      <td className="py-3.5 pl-6 pr-2 text-left align-middle truncate" title={res.bookingId || res._id || res.id}>
                        <span className="font-mono text-[10px] font-bold bg-muted/40 text-navy-deep px-2 py-0.5 rounded-md border border-muted/60 inline-block max-w-full truncate">
                          #{res.bookingId || (res._id && String(res._id).length > 10 ? `${String(res._id).substring(0, 8)}...` : (res._id || res.id))}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-left align-middle">
                        <div className="font-bold text-navy-deep flex items-center gap-1.5 truncate">
                          <span className="truncate">{res.guest}</span>
                          {res.isGroupBooking && (
                            <span className="text-[8px] bg-purple/10 text-purple border border-purple/20 px-1 rounded font-bold">Group</span>
                          )}
                          {res.isCorporate && (
                            <span className="text-[8px] bg-indigo/10 text-indigo border border-indigo/20 px-1 rounded font-bold">Corp</span>
                          )}
                        </div>
                        <div className="text-[10px] font-normal text-muted-foreground mt-0.5 truncate">{res.phone}</div>
                      </td>
                      <td className="py-3.5 px-3 text-left align-middle truncate">
                        <div className="font-bold text-brand">{getRoomDisplay(res)}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{getRoomCategoryDisplay(res)}</div>
                      </td>
                      <td className="py-3.5 px-3 text-left align-middle text-muted-foreground">{res.checkIn}</td>
                      <td className="py-3.5 px-3 text-left align-middle text-muted-foreground">{res.checkOut}</td>
                      <td className="py-3.5 px-2 text-center align-middle text-muted-foreground font-bold">{res.pax || "2 Guests"}</td>
                      <td className="py-3.5 px-3 text-left align-middle">
                        <span className="text-[10px] bg-muted/40 font-bold px-2 py-0.5 rounded-full text-navy-deep">
                          {res.source || "Direct"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-left align-middle">
                        <div className="font-bold text-navy text-xs">₹{res.amount?.toLocaleString()}</div>
                        <div className="mt-0.5">
                          <Tag tone={isPaid ? "success" : "error"}>
                            {isPaid ? "Paid" : `Due: ₹${balanceVal.toLocaleString()}`}
                          </Tag>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-center align-middle">
                        <Tag tone={
                          res.status === "Confirmed" ? "brand" :
                          res.status === "Checked-in" ? "success" :
                          res.status === "Checked-out" ? "neutral" :
                          res.status === "No-show" ? "warning" : "error"
                        }>
                          {res.status}
                        </Tag>
                      </td>
                      <td className="py-3.5 pl-3 pr-4 text-left align-middle">
                        <div className="flex items-center justify-start gap-1 whitespace-nowrap select-none">
                          {/* Admin-styled Check-In / Check-Out buttons */}
                          {(res.status === "Confirmed" || res.status === "Pending") && (
                            <Button
                              onClick={() => handleStatusChange(res._id || res.id, "Checked-in")}
                              size="xs"
                              variant="outline"
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-7 px-2 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                            >
                              Check-In
                            </Button>
                          )}

                          {(res.status === "Checked-in" || res.status === "Checked In") && (
                            <Button
                              onClick={() => handleStatusChange(res._id || res.id, "Checked-out")}
                              size="xs"
                              variant="outline"
                              className="text-navy border-navy/30 hover:bg-navy/5 h-7 px-2 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                            >
                              Check-Out
                            </Button>
                          )}

                          {/* View in Dedicated Page */}
                          <Button
                            onClick={() => navigate({ to: `/manager/reservations/view/${res._id || res.id}` })}
                            size="icon"
                            variant="ghost"
                            className="size-7 text-navy/70 hover:text-brand hover:bg-brand/10 rounded-lg cursor-pointer transition-colors"
                            aria-label="View Details"
                            title="View Reservation"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          {/* Edit in Dedicated Page */}
                          {res.status !== "Checked-out" && res.status !== "Checked Out" && res.status !== "Cancelled" && (
                            <>
                              <Button
                                onClick={() => navigate({ to: `/manager/reservations/edit/${res._id || res.id}` })}
                                size="icon"
                                variant="ghost"
                                className="size-7 text-navy/70 hover:text-brand hover:bg-brand/10 rounded-lg cursor-pointer transition-colors"
                                aria-label="Modify Booking"
                                title="Modify Booking"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>

                              <Button
                                onClick={() => handleCancel(res._id || res.id)}
                                size="icon"
                                variant="ghost"
                                className="size-7 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                aria-label="Cancel Reservation"
                                title="Cancel Booking"
                              >
                                <XCircle className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Panel */}
            <div className="p-4 border-t border-muted flex items-center justify-between gap-3 text-muted-foreground text-[10px] font-bold select-none">
              <span>Page {currentPage} of {totalPages} (Total: {filteredReservations.length})</span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/manager/reservations")({
  component: ManagerReservationsPage
});