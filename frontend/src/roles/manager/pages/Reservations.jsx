import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import {
  CalendarCheck,
  Users,
  Search,
  Eye,
  Edit2,
  XCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  AlertCircle
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
        superAdminService.getProperties(),
        superAdminService.getReservations()
      ]);

      if (propRes.success && propRes.data) {
        const found = propRes.data.find(p => p._id === user.propertyId || p.id === user.propertyId);
        setProperty(found || null);
      }

      if (resRes.success && resRes.data) {
        // Enforce property scoping: filter data to manager's propertyId
        const scoped = resRes.data.filter(r => r.propertyId === user.propertyId || r.property === user.propertyId);
        setReservations(scoped);
      }
    } catch (err) {
      setError(err.message || "Failed to load reservation dataset");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Status Handlers
  async function handleStatusChange(bookingId, newStatus, notes = "") {
    try {
      const payload = { status: newStatus };
      if (notes) payload.notes = notes;
      const res = await superAdminService.updateReservation(bookingId, payload);
      if (res.success) {
        toast.success(`Reservation status updated to ${newStatus}`);
        loadData();
      } else {
        toast.error(res.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  }

  async function handleCancel(bookingId) {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    await handleStatusChange(bookingId, "Cancelled", "Cancelled by Property Manager");
  }

  async function handleNoShow(bookingId) {
    if (!confirm("Mark this reservation as a No-Show? The booking will be cancelled and room released.")) return;
    await handleStatusChange(bookingId, "Cancelled", "Marked as no-show by GM");
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

  // Pagination computations
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage) || 1;
  const paginatedData = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Dynamic Overbooking Checker (active, overlapping dates for same room)
  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    return new Date(dStr);
  };

  const detectOverbookings = () => {
    const active = reservations.filter(r => r.status !== "Cancelled" && r.room);
    const conflicts = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const b1 = active[i];
        const b2 = active[j];
        if (b1.room === b2.room) {
          const s1 = parseDate(b1.checkIn);
          const e1 = parseDate(b1.checkOut);
          const s2 = parseDate(b2.checkIn);
          const e2 = parseDate(b2.checkOut);
          if (s1 < e2 && s2 < e1) {
            conflicts.push({ b1, b2, room: b1.room });
          }
        }
      }
    }
    return conflicts;
  };

  const overbookingConflicts = detectOverbookings();
  const hasOverbooking = overbookingConflicts.length > 0;

  // Statistics Computations
  const totalCount = reservations.length;
  const confirmedCount = reservations.filter(r => r.status === "Confirmed").length;
  const checkedInCount = reservations.filter(r => r.status === "Checked-in").length;
  const checkedOutCount = reservations.filter(r => r.status === "Checked-out").length;
  const noShowCount = reservations.filter(r => r.status === "Cancelled" && r.notes?.toLowerCase().includes("no-show")).length;
  const cancelledCount = reservations.filter(r => r.status === "Cancelled" && !r.notes?.toLowerCase().includes("no-show")).length;

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view the Manager Console. Access is restricted to property managers.
        </Notice>
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
      <PageHeader
        title="Reservations Console"
        subtitle={`Manage bookings, check-in operations, and guest folios for ${property?.name || "assigned hotel branch"}.`}
      />

      {error && <Notice tone="error" title="Dataset Sync Error">{error}</Notice>}

      {hasOverbooking && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 text-destructive animate-pulse">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-sm">Overbooking Collision Alert</h4>
            <p className="mt-0.5">
              The following rooms have overlapping reservation check-ins. Please reassign rooms immediately to avoid guest friction:
            </p>
            <ul className="list-disc pl-4 mt-1.5 space-y-1 font-semibold">
              {overbookingConflicts.map((c, idx) => (
                <li key={idx}>
                  Room {c.room}: {c.b1.guest} ({c.b1.checkIn} → {c.b1.checkOut}) vs {c.b2.guest} ({c.b2.checkIn} → {c.b2.checkOut})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <PremiumStatCard label="Total Bookings" value={totalCount.toString()} hint="All-time bookings log" accentColor="#0d1b2a" />
        <PremiumStatCard label="Confirmed" value={confirmedCount.toString()} hint="Upcoming reservations" accentColor="#3b82f6" />
        <PremiumStatCard label="Checked-In" value={checkedInCount.toString()} hint="Active in-house stays" accentColor="#10b981" />
        <PremiumStatCard label="Checked-Out" value={checkedOutCount.toString()} hint="Completed stays log" accentColor="#6b7280" />
        <PremiumStatCard label="Cancelled" value={cancelledCount.toString()} hint="Revoked stay files" accentColor="#ef4444" />
        <PremiumStatCard label="No-Show" value={noShowCount.toString()} hint="Failed arrivals log" accentColor="#f59e0b" />
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
              placeholder="Filter by date (e.g. 21 Aug)..."
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-muted/50 text-[10px] font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Reservation Status:</span>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-36 text-[10px] h-7 py-0 font-bold"
            >
              <option value="all">All statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Payment Status:</span>
            <Select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
              className="w-36 text-[10px] h-7 py-0 font-bold"
            >
              <option value="all">All payment levels</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Due</option>
              <option value="Unpaid">Unpaid / Full Due</option>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Booking Channel:</span>
            <Select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
              className="w-36 text-[10px] h-7 py-0 font-bold"
            >
              <option value="all">All Channels</option>
              <option value="Direct">Direct</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Booking.com">Booking.com</option>
              <option value="MakeMyTrip">MakeMyTrip</option>
              <option value="Agoda">Agoda</option>
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
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-4.5 px-6">Booking ID</th>
                  <th className="py-4.5 px-4">Guest</th>
                  <th className="py-4.5 px-4">Property</th>
                  <th className="py-4.5 px-4">Room / Type</th>
                  <th className="py-4.5 px-4">Check-In</th>
                  <th className="py-4.5 px-4">Check-Out</th>
                  <th className="py-4.5 px-4 text-center">Pax</th>
                  <th className="py-4.5 px-4">Source</th>
                  <th className="py-4.5 px-4 text-right">Payment</th>
                  <th className="py-4.5 px-4 text-center">Status</th>
                  <th className="py-4.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                {paginatedData.map((res) => {
                  const balanceVal = res.balance || 0;
                  const isPaid = balanceVal === 0;

                  return (
                    <tr key={res._id || res.id} className="hover:bg-[#fcfcfc]/60 transition-colors group">
                      <td className="py-4 px-6 font-mono text-[11px] text-muted-foreground">
                        #{res._id || res.id}
                      </td>
                      <td className="py-4 px-4 font-bold text-navy-deep">
                        <div>{res.guest}</div>
                        <div className="text-[10px] font-normal text-muted-foreground mt-0.5">{res.phone}</div>
                      </td>
                      <td className="py-4 px-4 font-bold text-brand">
                        {property?.name || "Hotel Branch"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-brand">{res.room ? `Room ${res.room}` : "Not Assigned"}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{res.roomType || "Standard Suite"}</div>
                      </td>
                      <td className="py-4 px-4">{res.checkIn}</td>
                      <td className="py-4 px-4">{res.checkOut}</td>
                      <td className="py-4 px-4 text-center text-muted-foreground font-bold">{res.pax || "2 Guests"}</td>
                      <td className="py-4 px-4">
                        <span className="text-[10px] bg-muted/40 font-bold px-2 py-0.5 rounded-full text-navy-deep">
                          {res.source || "Direct"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-semibold text-navy">₹{res.amount?.toLocaleString()}</div>
                        <div className={`text-[10px] font-bold ${isPaid ? "text-success" : "text-destructive"}`}>
                          {isPaid ? "Fully Paid" : `Due: ₹${balanceVal.toLocaleString()}`}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Tag tone={
                          res.status === "Confirmed" ? "brand" :
                          res.status === "Checked-in" ? "success" :
                          res.status === "Checked-out" ? "neutral" : "error"
                        }>
                          {res.status}
                        </Tag>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1 select-none">
                          <Button
                            onClick={() => navigate({ to: `/manager/reservations/view/${res._id || res.id}` })}
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:text-brand cursor-pointer"
                            aria-label="View Details"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            onClick={() => navigate({ to: `/manager/reservations/edit/${res._id || res.id}` })}
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:text-brand cursor-pointer"
                            aria-label="Edit Booking"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          
                          {/* Checked-In / Out action buttons */}
                          {res.status === "Confirmed" && (
                            <Button
                              onClick={() => handleStatusChange(res._id || res.id, "Checked-in")}
                              size="xs"
                              variant="outline"
                              className="text-success border-success/40 hover:bg-success/5 h-6 text-[10px] font-bold px-2 cursor-pointer"
                            >
                              Check-In
                            </Button>
                          )}
                          {res.status === "Checked-in" && (
                            <Button
                              onClick={() => handleStatusChange(res._id || res.id, "Checked-out")}
                              size="xs"
                              variant="outline"
                              className="text-navy border-navy/40 hover:bg-navy/5 h-6 text-[10px] font-bold px-2 cursor-pointer"
                            >
                              Check-Out
                            </Button>
                          )}

                          {/* Cancellation overrides */}
                          {res.status !== "Cancelled" && res.status !== "Checked-out" && (
                            <>
                              <Button
                                onClick={() => handleNoShow(res._id || res.id)}
                                size="xs"
                                variant="ghost"
                                className="text-warning hover:bg-warning/5 h-6 text-[10px] font-bold px-1.5 cursor-pointer"
                                title="Mark as No-Show"
                              >
                                No-Show
                              </Button>
                              <Button
                                onClick={() => handleCancel(res._id || res.id)}
                                size="icon"
                                variant="ghost"
                                className="size-7 text-destructive hover:bg-destructive/5 cursor-pointer"
                                aria-label="Cancel Booking"
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
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