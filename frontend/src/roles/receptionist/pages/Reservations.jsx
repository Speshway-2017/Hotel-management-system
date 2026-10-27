import { createFileRoute } from "@tanstack/react-router";
import { Panel, Tag, ActionGroup, ViewActionButton, CheckInActionButton, CheckOutActionButton, ActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { toast } from "sonner";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, FileText, CheckCircle2, AlertOctagon, HelpCircle,
  CalendarCheck, Trash2, Eye, XCircle, Edit2
} from "lucide-react";

import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { formatDisplayDate, isToday } from "@/utils/dateUtils";
import { extractRoomNumber } from "@/utils/roomUtils";
import { receptionCache } from "@/services/receptionCache";
import { useServerTime, isCheckInPermitted, getCheckInStatusInfo } from "@/utils/serverTime";

export const Route = createFileRoute("/reception/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations Ledger — Hour Stay" },
      { name: "description", content: "Property guest reservation accounts and booking ledger." }
    ]
  }),
  component: ReservationsPage
});

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-2.5 font-sans tracking-tight tabular-nums text-base font-bold text-slate-800 leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

function ReservationsPage() {
  const navigate = useNavigate();
  useServerTime(2000);
  const cachedReservations = receptionCache.get('reservations');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRoomType, setFilterRoomType] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [loading, setLoading] = useState(() => !cachedReservations);
  const [reservations, setReservations] = useState(() => cachedReservations || []);
  const [extendingBooking, setExtendingBooking] = useState(null);

  // KPI calculations
  const totalCount = reservations.length;
  const checkInCount = reservations.filter(r => {
    const s = (r.status || "").toLowerCase();
    return s === "checked in" || s === "checked-in" || s === "checkedin";
  }).length;
  const checkOutCount = reservations.filter(r => {
    const s = (r.status || "").toLowerCase();
    return s === "checked out" || s === "checked-out" || s === "checkedout";
  }).length;
  const pendingCount = reservations.filter(r => {
    const s = (r.status || "").toLowerCase();
    return s === "pending";
  }).length;
  const cancelledCount = reservations.filter(r => {
    const s = (r.status || "").toLowerCase();
    return s === "cancelled" || s === "canceled";
  }).length;

  const loadReservations = (isSilent = false) => {
    if (!isSilent && reservations.length === 0) setLoading(true);
    receptionistService.getReservations()
      .then(res => {
        if (res.success && res.data) {
          const list = res.data.map(r => {
            const cleanRmNum = extractRoomNumber(r) || (r.roomNumber ? String(r.roomNumber) : "");
            const rmNum = cleanRmNum || "Unassigned";
            const rmType = r.roomType || (r.room && r.room.includes('·') ? r.room.split('·')[1]?.trim() : (r.room && !r.room.match(/\b\d{3,4}\b/) ? r.room : (cleanRmNum?.startsWith('2') ? 'Deluxe Room' : cleanRmNum?.startsWith('3') ? 'Executive Suite' : cleanRmNum?.startsWith('4') ? 'Presidential Suite' : 'Standard Room')));
            return {
              ...r,
              room: rmNum,
              roomNumber: rmNum,
              roomType: rmType
            };
          });
          setReservations(list);
          receptionCache.set('reservations', list);
        }
      })
      .catch(err => console.error("Failed to load reservations ledger:", err))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReservations(!loading);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadReservations(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Selected Reservation details Drawer State
  const [selectedRes, setSelectedRes] = useState(null);

  // Status config
  const statusMeta = {
    Confirmed: { tone: "success", label: "Confirmed" },
    Pending: { tone: "warning", label: "Pending" },
    "Checked In": { tone: "brand", label: "Checked In" },
    "Checked-in": { tone: "brand", label: "Checked In" },
    "Checked Out": { tone: "success", label: "Checked Out" },
    "Checked-out": { tone: "success", label: "Checked Out" },
    Cancelled: { tone: "neutral", label: "Cancelled" },
    "No Show": { tone: "error", label: "No Show" },
    "No-show": { tone: "error", label: "No Show" }
  };

  // Filter calculations
  const filteredReservations = reservations.filter(r => {
    const nameStr = (r.name || r.guest || "").toLowerCase();
    const idStr = (r.id || r._id || r.bookingId || "").toLowerCase();
    const roomStr = (r.room || r.roomNumber || "").toLowerCase();
    const phoneStr = r.phone || "";
    const query = searchQuery.toLowerCase();

    const matchesSearch = nameStr.includes(query) || idStr.includes(query) || roomStr.includes(query) || phoneStr.includes(query);
    const matchesStatus = filterStatus === "all" || 
      r.status === filterStatus ||
      (filterStatus === "Checked In" && (r.status === "Checked-in" || r.status === "Checked In")) ||
      (filterStatus === "Checked Out" && (r.status === "Checked-out" || r.status === "Checked Out")) ||
      (filterStatus === "No Show" && (r.status === "No-show" || r.status === "No Show"));
    const matchesRoomType = filterRoomType === "all" || r.roomType === filterRoomType;
    const matchesSource = filterSource === "all" || r.source === filterSource;

    return matchesSearch && matchesStatus && matchesRoomType && matchesSource;
  });

  // Action methods
  const handleCheckIn = async (id, roomNum, booking = null) => {
    if (booking) {
      const checkInStatus = getCheckInStatusInfo(booking);
      if (!checkInStatus.allowed) {
        toast.error(checkInStatus.reason);
        return;
      }
    }

    // If it's a website / OTA booking, route to dedicated ID Verification & Check-in page
    const source = booking?.source || "";
    const isWalkIn = source.toLowerCase().includes("walk-in") || source === "Direct Walk-in";
    if (booking && !isWalkIn) {
      navigate(`/reception/check-in/${id}`);
      return;
    }

    try {
      await receptionistService.updateReservationStatus(id, "Checked-in", roomNum);
      setReservations(prev => prev.map(r => 
        (r.id === id || r._id === id || r.bookingId === id)
          ? { ...r, status: "Checked-in" } 
          : r
      ));
      if (selectedRes && (selectedRes.id === id || selectedRes._id === id || selectedRes.bookingId === id)) {
        setSelectedRes(prev => ({ ...prev, status: "Checked-in" }));
      }
      toast.success("Guest checked in successfully!");
      emitRealtimeEvent('checkin_completed', { id, status: 'Checked-in' });
      loadReservations(true);
    } catch (err) {
      console.error("Failed to check in:", err);
      toast.error(err.message || "Failed to check in guest.");
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "Checked-out");
      setReservations(prev => prev.map(r => 
        (r.id === id || r._id === id || r.bookingId === id)
          ? { ...r, status: "Checked-out" } 
          : r
      ));
      if (selectedRes && (selectedRes.id === id || selectedRes._id === id || selectedRes.bookingId === id)) {
        setSelectedRes(prev => ({ ...prev, status: "Checked-out" }));
      }
      toast.success("Guest checked out successfully!");
      emitRealtimeEvent('checkout_completed', { id, status: 'Checked-out' });
      loadReservations(true);
    } catch (err) {
      console.error("Failed to check out:", err);
      toast.error(err.message || "Failed to check out guest.");
    }
  };

  const handleCancelBooking = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "Cancelled");
      setReservations(prev => prev.map(r => 
        (r.id === id || r._id === id || r.bookingId === id)
          ? { 
              ...r, 
              status: "Cancelled", 
              paymentStatus: r.paymentStatus === "Paid" ? "Refunded" : "Cancelled"
            } 
          : r
      ));
      if (selectedRes && (selectedRes.id === id || selectedRes._id === id || selectedRes.bookingId === id)) {
        setSelectedRes(prev => ({
          ...prev,
          status: "Cancelled",
          paymentStatus: prev.paymentStatus === "Paid" ? "Refunded" : "Cancelled"
        }));
      }
      toast.success("Booking cancelled successfully!");
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      toast.error(err.message || "Failed to cancel booking.");
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* KPI Cards Grid: Total, Check-in, Check-out, Pending, Cancelled */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <PremiumStatCard label="Total" value={totalCount} hint="All reservations" icon={CalendarCheck} accentColor="#6366f1" />
        <PremiumStatCard label="Check-in" value={checkInCount} hint="Currently in-house" icon={LogIn} accentColor="#10b981" />
        <PremiumStatCard label="Check-out" value={checkOutCount} hint="Completed stays" icon={LogOut} accentColor="#0ea5e9" />
        <PremiumStatCard label="Pending" value={pendingCount} hint="Awaiting check-in" icon={Clock} accentColor="#f59e0b" />
        <PremiumStatCard label="Cancelled" value={cancelledCount} hint="Cancelled bookings" icon={XCircle} accentColor="#ef4444" />
      </div>

      {/* Controls: Search, Filters, and New Reservation Button */}
      <div className="bg-white border border-muted rounded-2xl p-3 shadow-soft">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guest name, room #, phone, booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Booking Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer shrink-0"
          >
            <option value="all">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Checked In">Checked In</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No Show">No Show</option>
          </select>

          {/* Room Type Filter */}
          <select
            value={filterRoomType}
            onChange={(e) => setFilterRoomType(e.target.value)}
            className="h-10 px-3 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer shrink-0"
          >
            <option value="all">All Types</option>
            <option value="Standard Room">Standard Room</option>
            <option value="Deluxe Room">Deluxe Room</option>
            <option value="Deluxe King">Deluxe King</option>
            <option value="Executive Room">Executive Room</option>
            <option value="Villa Suite">Villa Suite</option>
            <option value="Premium Deluxe">Premium Deluxe</option>
            <option value="Enterprise Suite">Enterprise Suite</option>
            <option value="Classic Double">Classic Double</option>
          </select>

          {/* Booking Channel Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="h-10 px-3 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer shrink-0"
          >
            <option value="all">All Sources</option>
            <option value="Direct Web">Direct Web</option>
            <option value="Booking.com">Booking.com</option>
            <option value="MakeMyTrip">MakeMyTrip</option>
            <option value="Expedia">Expedia</option>
            <option value="Agoda">Agoda</option>
            <option value="Goibibo">Goibibo</option>
          </select>

          {/* New Reservation Button */}
          <Button asChild className="h-10 px-4 bg-navy hover:bg-navy-deep text-white text-xs rounded-xl font-bold cursor-pointer shrink-0 shadow-sm flex items-center justify-center gap-1.5 transition-colors">
            <Link to="/reception/new-booking">
              <Plus className="size-4" />
              <span>New Reservation</span>
            </Link>
          </Button>

        </div>
      </div>

      {/* Table Ledger Panel */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none whitespace-nowrap">
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Guest Details</th>
                <th className="py-3.5 px-4">Allotted Room</th>
                <th className="py-3.5 px-4">Check-in Date</th>
                <th className="py-3.5 px-4">Check-out Date</th>
                <th className="py-3.5 px-4">Pax Capacity</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-left min-w-[240px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {loading && reservations.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center font-semibold text-xs text-muted-foreground animate-pulse select-none">
                    Loading reservations ledger...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center font-bold text-muted-foreground select-none">
                    No matching reservations found in ledger database.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => {
                  const meta = statusMeta[res.status] || statusMeta.Pending;
                  return (
                    <tr key={res.id} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-deep">{res.id}</td>
                      <td className="py-3.5 px-4 font-bold text-navy">
                        <div>
                          <p>{res.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{res.phone}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-navy">
                            {extractRoomNumber(res) ? `Room ${extractRoomNumber(res)}` : (res.roomNumber ? `Room ${res.roomNumber}` : (res.room && res.room !== "Unassigned" ? res.room : "Unassigned"))}
                          </span>
                          {res.roomVariant && (
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${res.roomVariant === 'Non-AC' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
                              {res.roomVariant}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium block">
                          {res.roomType || (res.room && res.room.includes('·') ? res.room.split('·')[1]?.trim() : "Standard Room")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-navy">{formatDisplayDate(res.checkIn)}</td>
                      <td className="py-3.5 px-4 font-semibold text-navy">{formatDisplayDate(res.checkOut)}</td>
                      <td className="py-3.5 px-4 text-navy">
                        <p className="font-bold">{res.nights}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{res.pax}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag tone="brand">{res.source}</Tag>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <Tag tone={res.paymentStatus === "Paid" ? "success" : res.paymentStatus === "Pending" ? "error" : "neutral"}>
                          {res.paymentStatus}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag tone={meta.tone}>{meta.label}</Tag>
                      </td>
                      <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap min-w-[240px]">
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
                                  onClick={() => navigate(`/reception/reservations/${res.id || res._id}`)}
                                  title="View Reservation Details"
                                />
                              );
                            }

                            return (
                              <>
                                {/* Check-In Button */}
                                {(res.status === "Pending" || res.status === "Confirmed" || res.status === "Pre-checked") && (
                                  <CheckInActionButton
                                    booking={res}
                                    onClick={() => handleCheckIn(res.id || res._id || res.bookingId, res.room || res.roomNumber, res)}
                                  />
                                )}

                                {/* Check-Out Button & Extend Button */}
                                {(res.status === "Checked In" || res.status === "Checked-in" || res.status === "Staying" || res.status === "Staying-In") && (
                                  <>
                                    <ExtendStayButton
                                      size="xs"
                                      label="Extend"
                                      booking={res}
                                      onClick={() => navigate(`/reception/reservations/extend/${res.id || res._id || res.bookingId}`)}
                                    />
                                    <CheckOutActionButton
                                      onClick={() => handleCheckOut(res.id || res._id || res.bookingId)}
                                    />
                                  </>
                                )}

                                {/* View Details */}
                                <ViewActionButton
                                  onClick={() => navigate(`/reception/reservations/${res.id || res._id}`)}
                                  title="View Reservation Details"
                                />

                                {/* Cancel */}
                                <ActionButton
                                  icon={XCircle}
                                  label="Cancel"
                                  variant="danger"
                                  onClick={() => handleCancelBooking(res.id || res._id)}
                                  title="Cancel Booking"
                                />
                              </>
                            );
                          })()}
                        </ActionGroup>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Reusable Extend Stay Modal */}
      <ExtendStayModal
        booking={extendingBooking}
        isOpen={!!extendingBooking}
        onClose={() => setExtendingBooking(null)}
        onSuccess={() => loadReservations(false)}
        userRole="receptionist"
      />
    </div>
  );
}