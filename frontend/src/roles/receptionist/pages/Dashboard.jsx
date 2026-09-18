import { PageHeader, Panel, Tag, ActionGroup, ViewActionButton, CheckInActionButton, CheckOutActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import { receptionistService } from "@/services/receptionist";
import { properties } from "@/data/hs-data";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, ArrowRightLeft, CreditCard, Eye,
  Star, MessageSquareHeart
} from "lucide-react";

import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { toast } from "sonner";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { isToday, formatDisplayDate } from "@/utils/dateUtils";
import { extractRoomNumber, calculateRoomKPIs } from "@/utils/roomUtils";

const FrontDeskDashboardRoute = {
  head: () => ({
    meta: [
      { title: "Receptionist Front-Desk Operations Dashboard — Hour Stay" },
      { name: "description", content: "Operational dashboard for front-desk receptionist staff." }
    ]
  }),
  component: FrontDeskDashboard
};

export { FrontDeskDashboardRoute as Route };

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-2.5 font-sans text-base font-bold text-slate-800 leading-none tracking-tight tabular-nums">{value}</h3>
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

function FrontDeskDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arrivals, setArrivals] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [stats, setStats] = useState({
    available: 0,
    occupied: 0,
    dirty: 0,
    cleaning: 0,
    ooo: 0,
    blocked: 0
  });

  const [propName, setPropName] = useState("Assigned Hotel");
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState(null);

  const [feedbackStats, setFeedbackStats] = useState({ average: "5.0", count: 0 });

  const fetchDashboardData = () => {
    Promise.all([
      receptionistService.getDashboard().catch(() => ({})),
      receptionistService.getReservations().catch(() => ({})),
      receptionistService.getRooms().catch(() => ({})),
      receptionistService.getFeedback().catch(() => ({}))
    ]).then(([dashRes, resRes, roomsRes, fbRes]) => {
      const allBookings = resRes?.success && Array.isArray(resRes.data) ? resRes.data : [];
      const allRooms = roomsRes?.success && Array.isArray(roomsRes.data) ? roomsRes.data : [];
      const feedbacks = fbRes?.success && Array.isArray(fbRes.data) ? fbRes.data : [];

      if (feedbacks.length > 0) {
        const avg = (feedbacks.reduce((sum, f) => sum + (Number(f.rating) || 5), 0) / feedbacks.length).toFixed(1);
        setFeedbackStats({ average: avg, count: feedbacks.length });
      }

      // 1. Dynamic Arrivals (Check-in is TODAY and status is Confirmed / Paid / Pending / Pre-checked)
      const finalArrivals = allBookings
        .filter(b => isToday(b.checkIn) && (b.status === 'Confirmed' || b.status === 'Paid' || b.status === 'Pending' || b.status === 'Pre-checked'))
        .map(b => ({
          id: b.bookingId || b.id || b._id,
          _id: b._id || b.id || b.bookingId,
          name: b.guest || b.name || 'Guest',
          room: extractRoomNumber(b) || b.roomNumber || '—',
          type: b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : (b.room || 'Standard Room')),
          time: formatDisplayDate(b.checkIn) || 'Today',
          checkIn: b.checkIn || 'Today',
          checkOut: b.checkOut || 'Tomorrow',
          source: b.source || 'Direct Web',
          status: b.status === 'Confirmed' ? 'Pre-checked' : b.status
        }));

      // 2. Dynamic Departures (Check-out is TODAY and status is Checked-in / Checked In / Staying / Checked-out / Checked Out)
      const finalDepartures = allBookings
        .filter(b => isToday(b.checkOut) && (b.status === 'Checked-in' || b.status === 'Checked In' || b.status === 'Staying' || b.status === 'Checked-out' || b.status === 'Checked Out'))
        .map(b => ({
          id: b.bookingId || b.id || b._id,
          _id: b._id || b.id || b.bookingId,
          name: b.guest || b.name || 'Guest',
          room: extractRoomNumber(b) || b.roomNumber || '—',
          time: formatDisplayDate(b.checkOut) || 'Today',
          checkIn: b.checkIn || 'Today',
          checkOut: b.checkOut || 'Today',
          balance: Number(b.balance || 0),
          status: (b.status === 'Checked-out' || b.status === 'Checked Out') ? 'Checked Out' : (Number(b.balance || 0) > 0 ? 'Pending Balance' : 'Ready')
        }));

      // Dynamic Room metrics using shared helper
      const roomKPIs = calculateRoomKPIs(allRooms, allBookings);

      // Dynamic Total Revenue
      const revenue = allBookings
        .filter(b => b.status !== 'Cancelled')
        .reduce((sum, b) => sum + (Number(b.amount) || Number(b.totalAmount) || 0), 0) || dashRes?.data?.stats?.totalRevenue || 0;

      setArrivals(finalArrivals);
      setDepartures(finalDepartures);

      setStats({
        available: roomKPIs.availableRooms,
        occupied: roomKPIs.occupiedRooms,
        inStay: roomKPIs.occupiedRooms,
        reserved: roomKPIs.reservedRooms,
        total: roomKPIs.totalRooms,
        dirty: roomKPIs.dirtyRooms,
        cleaning: roomKPIs.cleaningRooms,
        ooo: roomKPIs.outOfOrderRooms,
        blocked: allRooms.filter(r => r.status === 'Blocked').length,
        totalRevenue: revenue
      });
    })
    .catch(err => console.error("Failed to load dashboard data:", err))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Load dynamic user profile details
    let user = authService.getCurrentUser();
    setCurrentUser(user);

    authService.getProfile()
      .then(res => {
        if (res.success && res.data) {
          setCurrentUser(res.data);
        }
      })
      .catch(err => console.warn("Failed to refresh profile:", err));

    receptionistService.getProperty()
      .then(res => {
        if (res.success && res.data) {
          setPropName(res.data.name);
        }
      })
      .catch(err => console.warn("Failed to load property details:", err));

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // 15 seconds poll fallback

    const handleFocus = () => fetchDashboardData();

    const unsubscribe = subscribeRealtimeSync(() => {
      fetchDashboardData();
    });

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Action handlers
  const handleCheckIn = async (id, roomNum, booking = null) => {
    // If it's a website / OTA booking, route to dedicated ID Verification & Check-in page
    const source = booking?.source || "";
    const isWalkIn = source.toLowerCase().includes("walk-in") || source === "Direct Walk-in";
    if (booking && !isWalkIn) {
      navigate(`/reception/check-in/${id}`);
      return;
    }

    try {
      await receptionistService.updateReservationStatus(id, "Checked-in", roomNum);
      toast.success("Guest checked in successfully!");
      emitRealtimeEvent('checkin_completed', { id, status: 'Checked-in', roomNumber: roomNum });
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to check in:", err);
      toast.error(err.message || "Failed to check in guest.");
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "Checked-out");
      toast.success("Guest checked out successfully!");
      emitRealtimeEvent('checkout_completed', { id, status: 'Checked-out' });
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to check out:", err);
      toast.error(err.message || "Failed to check out guest.");
    }
  };

  const receptionistName = currentUser?.name || "Imran Sheikh";
  const currentShift = currentUser?.shift || "Afternoon (15:00 - 23:00)";
  const propertyName = propName;

  const roomStatusCounts = [
    { label: "Clean / Inspected", count: stats.available, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "Occupied", count: stats.occupied, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "Dirty", count: stats.dirty, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Cleaning", count: stats.cleaning, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
    { label: "Out of Order", count: stats.ooo, color: "text-red-600 bg-red-50 border-red-200" },
    { label: "Blocked", count: stats.blocked, color: "text-slate-600 bg-slate-50 border-slate-200" }
  ];

  const alerts = [
    { type: "Pending Check-ins", message: `${arrivals.filter(a => a.status === 'Pending' || a.status === 'Pre-checked').length} arrivals pending check-in`, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { type: "Late Check-outs", message: `${departures.filter(d => d.status === 'Late Checkout').length} departures requesting extensions`, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { type: "Pending Payments", message: `${departures.filter(d => d.balance > 0).length} checkout rooms have pending folio balances`, icon: IndianRupee, color: "text-orange-600 bg-orange-50" }
  ];

  const totalOutstandingBalance = departures.reduce((sum, d) => sum + d.balance, 0);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading operational dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">

      {/* Premium KPI Stat Cards Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
        <PremiumStatCard label="Arrivals" value={arrivals.length} hint={`${arrivals.filter(a => a.status === 'Pre-checked').length} Pre-checked, ${arrivals.filter(a => a.status === 'Pending').length} Pending`} icon={LogIn} accentColor="#6366f1" />
        <PremiumStatCard label="Departures" value={departures.length} hint={`${departures.filter(d => d.balance === 0).length} Paid, ${departures.filter(d => d.balance > 0).length} Pending Balance`} icon={LogOut} accentColor="#ec4899" />
        <PremiumStatCard label="In-Stay" value={stats.inStay || 0} hint={`${stats.occupied || 0} Room occupied`} icon={Users} accentColor="#10b981" />
        <PremiumStatCard label="Available Rooms" value={stats.available || 0} hint="Ready to sell" icon={Home} accentColor="#0ea5e9" />
        <PremiumStatCard label="Total Revenue" value={`₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}`} hint="Real-time ledger collection" icon={IndianRupee} accentColor="#10b981" />
        <PremiumStatCard label="Guest Feedback" value={`${feedbackStats.average} ★`} hint={`${feedbackStats.count} stay records logged`} icon={MessageSquareHeart} accentColor="#f59e0b" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Arrivals and Departures tables */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Arrivals */}
          <Panel title="Today's Arrivals List" description="Track expected guest check-ins, room mapping, and booking sources.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                    <th className="py-3 px-4">Guest Name</th>
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Room Type / No</th>
                    <th className="py-3 px-4">ETA</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-left min-w-[140px] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                  {arrivals.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-muted-foreground font-semibold">No pending arrivals today</td>
                    </tr>
                  ) : (
                    arrivals.map((arr) => (
                      <tr key={arr.id} className="hover:bg-muted/5">
                        <td className="py-3.5 px-4 font-bold text-navy">{arr.name}</td>
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">{arr.id}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold">{arr.type}</span>
                          <span className="text-[10px] text-muted-foreground block font-bold">Room #{arr.room}</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-navy">{arr.time}</td>
                        <td className="py-3.5 px-4">
                          <Tag tone="brand">{arr.source}</Tag>
                        </td>
                        <td className="py-3.5 px-4">
                          <Tag tone={arr.status === "Pre-checked" ? "success" : "warning"}>{arr.status}</Tag>
                        </td>
                        <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap min-w-[140px]">
                          <ActionGroup align="left">
                            {(arr.status === "Pending" || arr.status === "Confirmed" || arr.status === "Pre-checked") && (
                              <CheckInActionButton
                                onClick={() => handleCheckIn(arr.id || arr._id, arr.room, arr)}
                              />
                            )}
                            <ViewActionButton
                              onClick={() => {
                                const targetId = arr.id || arr._id || arr.bookingId;
                                navigate(targetId ? `/reception/reservations/${targetId}` : "/reception/reservations");
                              }}
                              title="View Reservation Details"
                            />
                          </ActionGroup>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Today's Departures */}
          <Panel title="Today's Departures List" description="Track check-outs, outstanding billing balances, and checkout times.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                    <th className="py-3 px-4">Guest Name</th>
                    <th className="py-3 px-4">Room No</th>
                    <th className="py-3 px-4">Departure Time</th>
                    <th className="py-3 px-4">Folio Balance</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-left min-w-[160px] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                  {departures.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-muted-foreground font-semibold">No departures today</td>
                    </tr>
                  ) : (
                    departures.map((dep, idx) => (
                      <tr key={dep.id || idx} className="hover:bg-muted/5">
                        <td className="py-3.5 px-4 font-bold text-navy">{dep.name}</td>
                        <td className="py-3.5 px-4 font-bold text-navy-deep">Room #{dep.room}</td>
                        <td className="py-3.5 px-4 font-semibold text-navy">{dep.time}</td>
                        <td className="py-3.5 px-4 font-black text-navy">
                          ₹{dep.balance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4">
                          <Tag tone={dep.balance > 0 ? "error" : dep.status === "Late Checkout" ? "warning" : dep.status === "Checked Out" || dep.status === "Checked-out" ? "neutral" : "success"}>
                            {dep.status === "Ready" ? "Checked-in" : dep.status}
                          </Tag>
                        </td>
                        <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap min-w-[160px]">
                          <ActionGroup align="left">
                            {dep.status !== "Checked-out" && dep.status !== "Checked Out" && (
                              <>
                                <ExtendStayButton
                                  size="xs"
                                  label="Extend"
                                  booking={dep}
                                  onClick={() => navigate(`/reception/reservations/extend/${dep.id || dep._id || dep.bookingId}`)}
                                />
                                <CheckOutActionButton
                                  onClick={() => handleCheckOut(dep.id || dep._id)}
                                />
                              </>
                            )}
                            <ViewActionButton
                              onClick={() => {
                                const targetId = dep.id || dep._id || dep.bookingId;
                                navigate(targetId ? `/reception/reservations/${targetId}` : "/reception/reservations");
                              }}
                              title="View Reservation Details"
                            />
                          </ActionGroup>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

        </div>

        {/* Right Column: Desk Actions and Alerts */}
        <div className="space-y-6">

          {/* Quick Actions Panel */}
          <Panel title="Quick Desk Actions" description="Fast track controls for front desk staff.">
            <div className="p-4 grid grid-cols-2 gap-3 bg-white rounded-b-xl">
              <Link to="/reception/check-in" className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 transition-all text-center group cursor-pointer hover:no-underline">
                <LogIn className="size-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold mt-1.5 text-emerald-800">Check-in</span>
                <span className="text-[9px] text-emerald-600/70 mt-0.5">Arriving guests</span>
              </Link>
              
              <Link to="/reception/check-out" className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 transition-all text-center group cursor-pointer hover:no-underline">
                <LogOut className="size-5 text-rose-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold mt-1.5 text-rose-800">Check-out</span>
                <span className="text-[9px] text-rose-600/70 mt-0.5">Departing guests</span>
              </Link>

              <Link to="/reception/reservations" className="flex flex-col items-center justify-center p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 transition-all text-center group cursor-pointer hover:no-underline">
                <Calendar className="size-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold mt-1.5 text-blue-800">Reservations</span>
                <span className="text-[9px] text-blue-600/70 mt-0.5">New booking</span>
              </Link>

              <Link to="/reception/new-booking" className="flex flex-col items-center justify-center p-3 rounded-xl border border-purple/20 bg-purple/5 hover:bg-purple/10 text-purple transition-all text-center group cursor-pointer hover:no-underline">
                <Plus className="size-5 text-purple group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold mt-1.5 text-purple-deep">Walk-in</span>
                <span className="text-[9px] text-purple/70 mt-0.5">Instant booking</span>
              </Link>
            </div>
          </Panel>

          {/* Quick Tasks / Alerts */}
          <Panel title="Active Desk Alerts" description="Operational highlights requiring front desk action.">
            <div className="p-4 space-y-3">
              {alerts.map((al, idx) => {
                const Icon = al.icon;
                return (
                  <div key={idx} className="flex gap-3 p-3 bg-[#fafafa]/50 border border-muted rounded-xl text-xs text-left">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${al.color}`}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-navy leading-none mt-0.5">{al.type}</p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed mt-1">{al.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

        </div>
      </div>

      {/* Extend Stay Modal */}
      <ExtendStayModal
        isOpen={extendModalOpen}
        booking={selectedBookingForExtend}
        onClose={() => {
          setExtendModalOpen(false);
          setSelectedBookingForExtend(null);
        }}
        onSuccess={() => {
          fetchDashboardData();
        }}
        userRole="receptionist"
      />

    </div>
  );
}