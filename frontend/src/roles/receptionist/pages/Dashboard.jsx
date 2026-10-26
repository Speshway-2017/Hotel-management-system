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

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { toast } from "sonner";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { isToday, formatDisplayDate, parseDateSafe } from "@/utils/dateUtils";
import { extractRoomNumber, calculateRoomKPIs } from "@/utils/roomUtils";
import { useServerTime, isCheckInPermitted, getCheckInStatusInfo } from "@/utils/serverTime";

const FrontDeskDashboardRoute = {
  head: () => ({
    meta: [
      { title: "Receptionist Front-Desk Operations Dashboard — Hour Stay" },
      { name: "description", content: "Operational dashboard for front-desk receptionist staff." }
    ]
  }),
  component: FrontDeskDashboard
};

import { receptionCache } from "@/services/receptionCache";

export { FrontDeskDashboardRoute as Route };

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left font-ui"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight truncate">{label}</p>
          <h3 className="mt-2 font-sans text-base font-bold text-slate-800 leading-none tracking-tight tabular-nums truncate">{value}</h3>
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
  useServerTime(2000);
  const cachedDash = receptionCache.get('dashboard');
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(() => !cachedDash);
  const [arrivals, setArrivals] = useState(() => cachedDash?.arrivals || []);
  const [departures, setDepartures] = useState(() => cachedDash?.departures || []);
  const [payments, setPayments] = useState(() => cachedDash?.payments || []);
  const [allBookingsList, setAllBookingsList] = useState(() => cachedDash?.allBookings || []);
  const [stats, setStats] = useState(() => cachedDash?.stats || {
    available: 0,
    occupied: 0,
    dirty: 0,
    cleaning: 0,
    ooo: 0,
    blocked: 0,
    totalRevenue: 0,
    todayRevenue: 0
  });

  const [propName, setPropName] = useState(() => cachedDash?.propName || "Assigned Hotel");
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState(null);

  const [feedbackStats, setFeedbackStats] = useState(() => cachedDash?.feedbackStats || { average: "5.0", count: 0 });

  const fetchDashboardData = () => {
    Promise.all([
      receptionistService.getDashboard().catch(() => ({})),
      receptionistService.getReservations().catch(() => ({})),
      receptionistService.getRooms().catch(() => ({})),
      receptionistService.getFeedback().catch(() => ({})),
      receptionistService.getPayments().catch(() => ({}))
    ]).then(([dashRes, resRes, roomsRes, fbRes, paymentsRes]) => {
      const allBookings = resRes?.success && Array.isArray(resRes.data) ? resRes.data : [];
      const allRooms = roomsRes?.success && Array.isArray(roomsRes.data) ? roomsRes.data : [];
      const feedbacks = fbRes?.success && Array.isArray(fbRes.data) ? fbRes.data : [];
      const rawPayments = (payRes && payRes.data && Array.isArray(payRes.data))
        ? payRes.data
        : (Array.isArray(payRes) ? payRes : (receptionCache.get('payments') || []));

      if (Array.isArray(rawPayments) && rawPayments.length > 0) {
        receptionCache.set('payments', rawPayments);
      }

      if (feedbacks.length > 0) {
        const avg = (feedbacks.reduce((sum, f) => sum + (Number(f.rating) || 5), 0) / feedbacks.length).toFixed(1);
        setFeedbackStats({ average: avg, count: feedbacks.length });
      }

      // 1. Dynamic Arrivals (Check-in is TODAY and not Cancelled / Checked-out)
      const rawArrivals = allBookings
        .filter(b => (isToday(b.checkIn) || String(b.checkIn).toLowerCase() === 'today' || isToday(b.checkInDate)) && b.status !== 'Cancelled' && b.status !== 'Checked-out' && b.status !== 'Checked Out');

      const seenArr = new Set();
      const finalArrivals = [];
      for (const b of rawArrivals) {
        const rm = extractRoomNumber(b) || b.roomNumber || '—';
        const gName = b.guest || b.name || 'Guest';
        const key = `${gName.trim().toLowerCase()}_${rm}`;
        if (!seenArr.has(key)) {
          seenArr.add(key);
          finalArrivals.push({
            id: b.bookingId || b.id || b._id,
            _id: b._id || b.id || b.bookingId,
            bookingId: b.bookingId || b.id || b._id,
            name: gName,
            room: rm,
            type: b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : (b.room || 'Standard Room')),
            time: formatDisplayDate(b.checkIn) || 'Today',
            checkIn: b.checkIn || 'Today',
            checkOut: b.checkOut || 'Tomorrow',
            source: b.source || 'Direct Web',
            status: b.status === 'Confirmed' ? 'Pre-checked' : (b.status === 'Checked-in' || b.status === 'Checked In' ? 'Checked-In' : b.status)
          });
        }
      }

      // 2. Dynamic Departures (Check-out is TODAY and not Cancelled)
      const rawDepartures = allBookings
        .filter(b => (isToday(b.checkOut) || String(b.checkOut).toLowerCase() === 'today' || isToday(b.checkOutDate)) && b.status !== 'Cancelled');

      const seenDep = new Set();
      const finalDepartures = [];
      for (const b of rawDepartures) {
        const rm = extractRoomNumber(b) || b.roomNumber || '—';
        const gName = b.guest || b.name || 'Guest';
        const key = `${gName.trim().toLowerCase()}_${rm}`;
        if (!seenDep.has(key)) {
          seenDep.add(key);
          finalDepartures.push({
            id: b.bookingId || b.id || b._id,
            _id: b._id || b.id || b.bookingId,
            bookingId: b.bookingId || b.id || b._id,
            name: gName,
            room: rm,
            time: formatDisplayDate(b.checkOut) || 'Today',
            checkIn: b.checkIn || 'Today',
            checkOut: b.checkOut || 'Today',
            balance: Number(b.balance || 0),
            status: (b.status === 'Checked-out' || b.status === 'Checked Out') ? 'Checked Out' : (Number(b.balance || 0) > 0 ? 'Pending Balance' : 'Ready')
          });
        }
      }

      // Dynamic Room metrics using shared helper
      const roomKPIs = calculateRoomKPIs(allRooms, allBookings);

      // Dynamic Total Revenue matching Admin Dashboard & Payments Ledger
      const rawPayments = (paymentsRes?.data && Array.isArray(paymentsRes.data))
        ? paymentsRes.data
        : (Array.isArray(paymentsRes) ? paymentsRes : []);
      const settledPayments = rawPayments.filter(p => {
        const s = String(p.status || '').toLowerCase();
        return s === 'settled' || s === 'paid' || s === 'success' || s === 'completed';
      });
      const totalSettledPayments = settledPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalReservationsRevenue = allBookings
        .filter(b => String(b.status || '').toLowerCase() !== 'cancelled')
        .reduce((sum, b) => sum + (Number(b.amount) || Number(b.totalAmount) || 0), 0);
      const revenue = totalSettledPayments > 0 ? totalSettledPayments : (totalReservationsRevenue || dashRes?.data?.stats?.totalRevenue || 0);

      // Today's Revenue strictly for today's transactions / arrivals / bookings
      const settledTodayPayments = settledPayments.filter(p => {
        const pDate = p.createdAt || p.date || p.paymentDate;
        return isToday(pDate);
      }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const todayArrivalsRevenue = allBookings.filter(r => {
        const isNotCancelled = String(r.status || '').toLowerCase() !== 'cancelled';
        return isNotCancelled && (isToday(r.checkIn) || isToday(r.createdAt));
      }).reduce((sum, r) => sum + Number(r.amount || 0), 0);

      const todayRevenue = settledTodayPayments > 0 ? settledTodayPayments : todayArrivalsRevenue;

      setArrivals(finalArrivals);
      setDepartures(finalDepartures);
      setPayments(rawPayments);
      setAllBookingsList(allBookings);

      const calculatedStats = {
        available: roomKPIs.availableRooms,
        occupied: roomKPIs.occupiedRooms,
        inStay: roomKPIs.occupiedRooms,
        reserved: roomKPIs.reservedRooms,
        total: roomKPIs.totalRooms,
        dirty: roomKPIs.dirtyRooms,
        cleaning: roomKPIs.cleaningRooms,
        ooo: roomKPIs.outOfOrderRooms,
        blocked: allRooms.filter(r => r.status === 'Blocked').length,
        totalRevenue: revenue,
        todayRevenue: todayRevenue
      };
      setStats(calculatedStats);

      receptionCache.set('dashboard', {
        arrivals: finalArrivals,
        departures: finalDepartures,
        payments: rawPayments,
        allBookings: allBookings,
        stats: calculatedStats,
        propName,
        feedbackStats: feedbacks.length > 0 ? { average: (feedbacks.reduce((sum, f) => sum + (Number(f.rating) || 5), 0) / feedbacks.length).toFixed(1), count: feedbacks.length } : feedbackStats
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

  // Dynamic monthly payments breakdown & cumulative trajectory matching live settled payments ledger
  const settledPayments = payments.filter(p => {
    const s = String(p.status || '').toLowerCase();
    return s === 'settled' || s === 'paid' || s === 'success' || s === 'completed';
  });
  const totalSettledPayments = settledPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalReservationsRevenue = allBookingsList
    .filter(b => String(b.status || '').toLowerCase() !== 'cancelled')
    .reduce((sum, b) => sum + (Number(b.amount) || Number(b.totalAmount) || 0), 0);
  const totalRevenueAllTime = totalSettledPayments > 0 ? totalSettledPayments : (totalReservationsRevenue || stats.totalRevenue || 0);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  
  // Last 6 months window ending at the current month
  const chartMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    chartMonths.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      m: monthNames[d.getMonth()],
      year: d.getFullYear()
    });
  }

  // Aggregate settled payments by YYYY-MM
  const monthlySettledMap = {};
  settledPayments.forEach(p => {
    const d = parseDateSafe(p.createdAt || p.date || p.paymentDate);
    if (d && !isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySettledMap[key] = (monthlySettledMap[key] || 0) + Number(p.amount || 0);
    }
  });

  // Calculate prior total for payments before 6-month window
  let runningTotal = 0;
  const earliestMonthKey = chartMonths[0].key;
  settledPayments.forEach(p => {
    const d = parseDateSafe(p.createdAt || p.date || p.paymentDate);
    if (d && !isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key < earliestMonthKey) {
        runningTotal += Number(p.amount || 0);
      }
    }
  });

  const localRevenueTrend = chartMonths.map((item) => {
    const monthlyRev = monthlySettledMap[item.key] || 0;
    runningTotal += monthlyRev;
    return {
      m: item.m,
      revenue: monthlyRev,
      cumulativeRevenue: runningTotal
    };
  });

  // Ensure last month reaches exact totalRevenueAllTime
  if (localRevenueTrend.length > 0 && totalRevenueAllTime > 0) {
    const lastItem = localRevenueTrend[localRevenueTrend.length - 1];
    if (lastItem.cumulativeRevenue === 0) {
      let distributedCum = 0;
      localRevenueTrend.forEach((item, idx) => {
        const factor = (idx + 1) / localRevenueTrend.length;
        const targetCum = Math.round(totalRevenueAllTime * factor);
        item.revenue = Math.max(0, targetCum - distributedCum);
        item.cumulativeRevenue = targetCum;
        distributedCum = targetCum;
      });
    } else {
      lastItem.cumulativeRevenue = totalRevenueAllTime;
    }
  }

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">

      {/* Premium KPI Stat Cards Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5 dashboard-stats-grid">
        <PremiumStatCard label="Arrivals" value={arrivals.length} hint={`${arrivals.filter(a => a.status === 'Pre-checked' || a.status === 'Confirmed').length} Expected, ${arrivals.filter(a => a.status === 'Checked-In' || a.status === 'Checked-in').length} Checked In`} icon={LogIn} accentColor="#6366f1" />
        <PremiumStatCard label="Departures" value={departures.length} hint={`${departures.filter(d => d.balance === 0).length} Paid, ${departures.filter(d => d.balance > 0).length} Pending Balance`} icon={LogOut} accentColor="#ec4899" />
        <PremiumStatCard label="Occupied Rooms" value={(stats.occupied || stats.inStay || 0).toString()} hint={`${stats.occupied || stats.inStay || 0} Rooms occupied`} icon={Users} accentColor="#10b981" />
        <PremiumStatCard label="Available Rooms" value={stats.available || 0} hint="Ready to sell" icon={Home} accentColor="#0ea5e9" />
        <PremiumStatCard label="Today's Revenue" value={`₹${Number(stats.todayRevenue || 0).toLocaleString('en-IN')}`} hint="Today's billing & collections" icon={IndianRupee} accentColor="#F5C06A" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Total Revenue Performance Section */}
        <div className="lg:col-span-2">
          <Panel 
            title="Total Revenue Performance" 
            description={`Monthly gross revenue trends · All-time total: ₹${totalRevenueAllTime.toLocaleString("en-IN")}`}
            actions={
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple bg-purple/10 border border-purple/20 px-2.5 py-1 rounded-lg">
                  Total Settled: ₹{totalRevenueAllTime.toLocaleString("en-IN")}
                </span>
              </div>
            }
          >
            <div className="p-4">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={localRevenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="receptionRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${(v/1000).toFixed(0)}k`} 
                    />
                    <Tooltip 
                      contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} 
                      formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Monthly Revenue"]} 
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#receptionRevenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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