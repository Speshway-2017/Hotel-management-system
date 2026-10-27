import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag, ActionGroup, ViewActionButton, CheckInActionButton, CheckOutActionButton, ActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, Upload, FileText, CheckCircle2, AlertOctagon, HelpCircle,
  Eye, XCircle
} from "lucide-react";

import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { toast } from "sonner";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { isToday, formatDisplayDate } from "@/utils/dateUtils";
import { extractRoomNumber } from "@/utils/roomUtils";
import { receptionCache } from "@/services/receptionCache";
import { useServerTime, isCheckInPermitted, getCheckInStatusInfo } from "@/utils/serverTime";

export const Route = createFileRoute("/reception/check-in")({
  head: () => ({
    meta: [
      { title: "Today's Arrivals Desk — Hour Stay" },
      { name: "description", content: "Front desk arrivals and guest check-in desk." }
    ]
  }),
  component: ArrivalsPage
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

function ArrivalsPage() {
  const navigate = useNavigate();
  useServerTime(2000);
  const cachedArrivals = receptionCache.get('arrivals');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [loading, setLoading] = useState(() => !cachedArrivals);
  const [arrivals, setArrivals] = useState(() => cachedArrivals || []);
  const [extendingBooking, setExtendingBooking] = useState(null);

  const loadArrivals = (isSilent = false) => {
    if (!isSilent && arrivals.length === 0) setLoading(true);
    receptionistService.getArrivals()
      .then(res => {
        if (!res || !res.data) return;
        const raw = Array.isArray(res.data) ? res.data : [];
        const list = raw
          .filter(b => (isToday(b.checkIn) || String(b.checkIn).toLowerCase() === 'today') && b.status !== 'Checked-out' && b.status !== 'Checked Out' && b.status !== 'Cancelled')
          .map(b => {
            const cleanRoom = extractRoomNumber(b) || '101';
            const cleanRoomType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : (cleanRoom.startsWith('2') ? 'Deluxe Room' : cleanRoom.startsWith('3') ? 'Executive Suite' : cleanRoom.startsWith('4') ? 'Presidential Suite' : 'Standard Room'));

            return {
              id: b.bookingId || b.id || b._id,
              _id: b._id || b.id || b.bookingId,
              bookingId: b.bookingId || b.id || b._id,
              name: b.guest || b.name || 'Guest',
              guest: b.guest || b.name || 'Guest',
              phone: b.phone || '--',
              email: b.email || `${(b.guest || 'guest').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
              room: cleanRoom,
              roomNumber: cleanRoom,
              type: cleanRoomType,
              roomType: cleanRoomType,
              roomReady: true,
              isEarly: false,
              idVerification: 'Verified',
              paymentStatus: Number(b.balance || 0) === 0 || b.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
              source: b.source || 'Direct Web',
              status: b.status === 'Confirmed' ? 'Pre-checked' : (b.status === 'Checked-in' || b.status === 'Checked-In' ? 'Checked-In' : b.status),
              time: formatDisplayDate(b.checkIn) || 'Today',
              checkIn: b.checkIn || 'Today',
              checkOut: b.checkOut || 'Tomorrow',
              nights: b.nights || 1,
              amount: b.amount || 0,
              balance: b.balance || 0
            };
          });

        setArrivals(list);
        receptionCache.set('arrivals', list);
      })
      .catch(err => console.error("Failed to load arrivals list:", err))
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    loadArrivals(!loading);
    const interval = setInterval(() => loadArrivals(true), 10000);
    const handleFocus = () => loadArrivals(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadArrivals(true);
    });

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Stats
  const totalCount = arrivals.length;
  const pendingCount = arrivals.filter(a => a.status === "Pending" || a.status === "Pre-checked" || a.status === "Confirmed").length;
  const checkedInCount = arrivals.filter(a => a.status === "Checked-In" || a.status === "Checked-in").length;
  const precheckedCount = arrivals.filter(a => a.status === "Pre-checked" || a.status === "Confirmed").length;
  const earlyCount = arrivals.filter(a => a.isEarly).length;
  const noShowCount = arrivals.filter(a => a.status === "No-show" || a.status === "No-Show").length;

  // Filters mapping
  const filteredArrivals = arrivals.filter(a => {
    const nameStr = String(a.name || a.guest || "").toLowerCase();
    const idStr = String(a.id || a._id || a.bookingId || "").toLowerCase();
    const roomStr = String(a.room || a.roomNumber || "").toLowerCase();
    const phoneStr = String(a.phone || "");
    const query = searchQuery.toLowerCase();

    const matchesSearch = nameStr.includes(query) || idStr.includes(query) || roomStr.includes(query) || phoneStr.includes(query);
    const matchesStatus = filterStatus === "All" || a.status === filterStatus || (filterStatus === "Pending" && (a.status === "Pre-checked" || a.status === "Confirmed" || a.status === "Pending"));
    const matchesSource = filterSource === "All" || a.source === filterSource;

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Sort arrivals in alphabetical order A-Z by guest name
  const sortedArrivals = [...filteredArrivals].sort((a, b) => {
    const nameA = String(a.name || a.guest || "").trim();
    const nameB = String(b.name || b.guest || "").trim();
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  });

  // Action methods
  const handleCheckIn = async (id, roomNum) => {
    const target = arrivals.find(a => a.id === id || a._id === id || a.bookingId === id);
    if (target) {
      const checkInStatus = getCheckInStatusInfo(target);
      if (!checkInStatus.allowed) {
        toast.error(checkInStatus.reason);
        return;
      }
    }
    const isWebsiteBooking = !target || (target.source !== "Walk-in" && !String(target.source || "").toLowerCase().includes("walk-in"));

    if (isWebsiteBooking) {
      navigate(`/reception/check-in/${id}`);
      return;
    }

    try {
      await receptionistService.updateReservationStatus(id, "Checked-in", roomNum);
      setArrivals(prev => prev.map(a => 
        (a.id === id || a._id === id || a.bookingId === id)
          ? { ...a, status: "Checked-In", room: roomNum || a.room }
          : a
      ));
      toast.success("Walk-in guest checked in successfully!");
      emitRealtimeEvent('checkin_completed', { id, status: 'Checked-in', roomNumber: roomNum });
      loadArrivals(true);
    } catch (err) {
      console.error("Failed to check in guest:", err);
      toast.error(err.message || "Failed to check in guest.");
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "Checked-out");
      setArrivals(prev => prev.map(a => 
        (a.id === id || a._id === id || a.bookingId === id)
          ? { ...a, status: "Checked Out" }
          : a
      ));
      toast.success("Guest checked out successfully!");
      emitRealtimeEvent('checkout_completed', { id, status: 'Checked-out' });
      loadArrivals(true);
    } catch (err) {
      console.error("Failed to check out guest:", err);
      toast.error(err.message || "Failed to check out guest.");
    }
  };

  const handleMarkNoShow = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "No-show");
      setArrivals(prev => prev.map(a => 
        (a.id === id || a._id === id || a.bookingId === id)
          ? { ...a, status: "No-Show" }
          : a
      ));
      toast.success("Marked as No-Show.");
      emitRealtimeEvent('booking_updated', { id, status: 'No-show' });
      loadArrivals(true);
    } catch (err) {
      console.error("Failed to mark no-show:", err);
      toast.error(err.message || "Failed to update status.");
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <PremiumStatCard label="Total Arrivals" value={totalCount} hint="Expected today" icon={LogIn} accentColor="#6366f1" />
        <PremiumStatCard label="Checked-In" value={checkedInCount} hint="Already in house" icon={ClipboardCheck} accentColor="#10b981" />
        <PremiumStatCard label="Pending Check-ins" value={pendingCount} hint="Arrivals remaining" icon={Clock} accentColor="#f59e0b" />
        <PremiumStatCard label="Early Arrivals" value={earlyCount} hint="Billed surcharges" icon={Sparkles} accentColor="#0ea5e9" />
        <PremiumStatCard label="No-Shows" value={noShowCount} hint="To be cancelled" icon={AlertTriangle} accentColor="#ef4444" />
      </div>

      {/* Controls: Inline Search, Status Dropdown, Source Dropdown, and Walk-in Booking */}
      <div className="bg-white border border-muted rounded-2xl p-3 shadow-soft">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guest name, booking ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Status Dropdown Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer shrink-0"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Pre-checked">Pre-checked</option>
            <option value="Checked-In">Checked-In</option>
            <option value="No-Show">No-Show</option>
          </select>

          {/* Source Dropdown Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="h-10 px-3 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer shrink-0"
          >
            <option value="All">All Sources</option>
            <option value="Direct Web">Direct Web</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Booking.com">Booking.com</option>
            <option value="MakeMyTrip">MakeMyTrip</option>
            <option value="Expedia">Expedia</option>
            <option value="Agoda">Agoda</option>
            <option value="Goibibo">Goibibo</option>
          </select>

          {/* Walk-in Booking Button */}
          <Button asChild className="h-10 px-4 bg-navy hover:bg-navy-deep text-white text-xs rounded-xl font-bold cursor-pointer shrink-0 shadow-sm flex items-center justify-center gap-1.5 transition-colors">
            <Link to="/reception/new-booking" className="flex items-center justify-center gap-1.5">
              <Plus className="size-3.5" />
              <span>Walk-in Booking</span>
            </Link>
          </Button>

        </div>
      </div>

      {/* Main Arrivals Table */}
      <Panel title="Arrivals Registration Ledger" description="Real-time listing of expected guest arrivals, verification status, and checklist tools.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none whitespace-nowrap">
                <th className="py-3.5 px-4">Guest Name</th>
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Room Type / No</th>
                <th className="py-3.5 px-4">ETA</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">ID Status</th>
                <th className="py-3.5 px-4">Check-in Status</th>
                <th className="py-3.5 px-4 text-left min-w-[240px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {loading && arrivals.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center font-semibold text-xs text-muted-foreground animate-pulse select-none">
                    Loading today's arrivals...
                  </td>
                </tr>
              ) : sortedArrivals.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center font-bold text-muted-foreground select-none">
                    No matching arrivals found today.
                  </td>
                </tr>
              ) : (
                sortedArrivals.map((guest) => (
                  <tr key={guest.id} className="hover:bg-muted/5">
                    <td className="py-3.5 px-4 font-bold text-navy">
                      <div>
                        <p>{guest.name}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">{guest.phone}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{guest.id}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold">{guest.type}</span>
                      <span className="text-[10px] text-muted-foreground block font-bold">
                        Room #{guest.room} 
                        {!guest.roomReady && guest.status !== "Checked-In" && (
                          <strong className="text-amber-600 ml-1 select-none font-black">(Dirty)</strong>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-navy">
                      <div className="flex items-center gap-1.5">
                        <span>{guest.time}</span>
                        {guest.isEarly && (
                          <span className="rounded bg-sky-50 text-sky-700 px-1.5 py-0.5 text-[9px] font-black uppercase select-none border border-sky-200">Early</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Tag tone="brand">{guest.source}</Tag>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <Tag tone={guest.paymentStatus === "Paid" ? "success" : guest.paymentStatus === "Deposit Paid" ? "info" : "error"}>
                        {guest.paymentStatus}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <Tag tone={guest.idVerification === "Verified" ? "success" : guest.idVerification === "Mismatch" ? "error" : "neutral"}>
                        {guest.idVerification}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <Tag tone={guest.status === "Checked-In" ? "success" : guest.status === "Pre-checked" ? "info" : guest.status === "No-Show" ? "neutral" : "warning"}>
                        {guest.status}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap min-w-[240px]">
                      <ActionGroup align="left">
                        {guest.status !== "Checked-In" && guest.status !== "Checked-in" && guest.status !== "No-Show" && guest.status !== "No-show" && (
                          <CheckInActionButton
                            booking={guest}
                            onClick={() => handleCheckIn(guest.id || guest._id, guest.roomNumber || guest.room)}
                          />
                        )}

                        {(guest.status === "Checked-In" || guest.status === "Checked-in" || guest.status === "Staying" || guest.status === "Staying-In") && (
                          <>
                            <ExtendStayButton
                              size="xs"
                              label="Extend"
                              booking={guest}
                              onClick={() => navigate(`/reception/reservations/extend/${guest.id || guest._id || guest.bookingId}`)}
                            />
                            <CheckOutActionButton
                              onClick={() => handleCheckOut(guest.id || guest._id)}
                            />
                          </>
                        )}
                        
                        {/* View Details */}
                        <ViewActionButton
                          onClick={() => navigate(`/reception/reservations/${guest.id || guest._id || guest.bookingId}`)}
                          title="View Reservation Details"
                        />

                        {/* No-Show Action */}
                        {(guest.status === "Pending" || guest.status === "Confirmed" || guest.status === "Pre-checked") && (
                          <ActionButton
                            icon={XCircle}
                            label="No-Show"
                            variant="danger"
                            onClick={() => handleMarkNoShow(guest.id || guest._id)}
                            title="Mark as No-Show"
                          />
                        )}
                      </ActionGroup>
                    </td>
                  </tr>
                ))
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
        onSuccess={() => loadArrivals(false)}
        userRole="receptionist"
      />
    </div>
  );
}