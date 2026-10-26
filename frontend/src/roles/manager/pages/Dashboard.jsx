import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag, ActionGroup } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { 
  TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, ArrowRight,
  Calendar, ShieldAlert, Activity, Users, ShieldCheck, CheckCircle2, 
  Bed, RefreshCw, Clock, CheckCircle, Star, Wrench, MessageSquare,
  Building, Receipt, CreditCard
} from "lucide-react";

import { subscribeRealtimeSync } from "@/services/socket";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { isToday, formatDisplayDate, parseDateSafe } from "@/utils/dateUtils";
import { extractRoomNumber, calculateRoomKPIs, normalizeRoomList } from "@/utils/roomUtils";

// Premium stat card component
function PremiumStatCard({ label, value, delta = 4, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  const isPositive = delta >= 0;
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="min-h-5 sm:h-8 flex items-start">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          </div>
          <h3 className="mt-1.5 font-sans text-lg font-bold text-slate-800 leading-none tracking-tight tabular-nums whitespace-nowrap">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-3">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] h-4">
        <span className={`inline-flex items-center gap-0.5 font-bold shrink-0 ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? "+" : ""}{delta}%
        </span>
        {hint && <span className="text-[10px] text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

function ManagerDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [property, setProperty] = useState(() => {
    const u = authService.getCurrentUser();
    return u?.propertyId ? { name: "Hour Stay Luxury Hotel", id: u.propertyId } : { name: "Hour Stay Luxury Hotel" };
  });
  
  // Data sets
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [pendingApprovalsList, setPendingApprovalsList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState(null);

  const loadDashboardData = async (isInitial = false) => {
    if (isInitial && bookings.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      let user = authService.getCurrentUser();
      
      try {
        const freshProfile = await authService.getProfile();
        if (freshProfile.success && freshProfile.data) {
          user = freshProfile.data;
        }
      } catch (e) {
        console.warn("Failed to retrieve fresh manager profile:", e);
      }
      
      setCurrentUser(user);

      if (!user || user.role !== "manager") {
        return; // Denied state handled below
      }

      const propertyId = user.propertyId;
      if (!propertyId) {
        if (isInitial) setLoading(false);
        return;
      }

      // Fetch all required resources
      const [propRes, bookingsRes, roomsRes, staffRes, approvalsRes, feedbackRes, paymentsRes] = await Promise.all([
        managerService.getProperty().catch(() => ({ success: true, data: null })),
        managerService.getReservations().catch(() => ({ success: true, data: [] })),
        managerService.getRooms().catch(() => ({ success: true, data: [] })),
        managerService.getStaff().catch(() => ({ success: true, data: [] })),
        managerService.getApprovals().catch(() => ({ success: true, data: [] })),
        managerService.getFeedback().catch(() => ({ success: true, data: [] })),
        managerService.getPayments().catch(() => ({ success: true, data: [] }))
      ]);

      if (propRes && propRes.success && propRes.data) {
        setProperty(propRes.data);
      } else {
        setProperty({ name: "Hour Stay Luxury Hotel", rooms: 12, city: "Hyderabad" });
      }

      if (bookingsRes && bookingsRes.success && Array.isArray(bookingsRes.data)) {
        setBookings(bookingsRes.data);
      }
      if (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) {
        const normalized = normalizeRoomList(roomsRes.data, (bookingsRes && bookingsRes.data) || []);
        setRooms(normalized);
      }
      if (staffRes && staffRes.success && Array.isArray(staffRes.data)) {
        setStaff(staffRes.data);
      }
      if (approvalsRes && approvalsRes.success && Array.isArray(approvalsRes.data)) {
        setPendingApprovalsList(approvalsRes.data);
      }
      if (feedbackRes && feedbackRes.success && Array.isArray(feedbackRes.data)) {
        setFeedbackList(feedbackRes.data);
      }
      const rawPayments = (paymentsRes && paymentsRes.data && Array.isArray(paymentsRes.data))
        ? paymentsRes.data
        : (Array.isArray(paymentsRes) ? paymentsRes : []);
      setPayments(rawPayments);
    } catch (err) {
      if (isInitial) setError(err.message || "Failed to load dashboard data.");
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboardData(true);

    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 30000);

    const handleFocus = () => loadDashboardData(false);
    window.addEventListener("focus", handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadDashboardData(false);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (currentUser && currentUser.role !== "manager") {
    return (
      <div className="p-6">
        <Notice tone="error" title="Access Denied">
          This dashboard is reserved for Managers. Please switch to your authorized role to view metrics.
        </Notice>
      </div>
    );
  }

  if (loading && bookings.length === 0) {
    return (
      <div className="space-y-6">
        <LoadingRows rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Notice tone="error" title="Data Synchronization Error">
          {error}
        </Notice>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6">
        <Notice tone="warning" title="No Assigned Property">
          You are currently not assigned to administer any active hotel property. Please contact the administrator to scope your profile.
        </Notice>
      </div>
    );
  }

  const activeBookings = bookings.filter(b => b.status !== "Cancelled");
  
  const arrivalsToday = activeBookings.filter(b => isToday(b.checkIn) && (b.status === "Confirmed" || b.status === "Pending" || b.status === "Pre-checked" || b.status === "Paid" || b.status === "Checked-in" || b.status === "Checked In"));
  const departuresToday = activeBookings.filter(b => isToday(b.checkOut) && (b.status === "Checked-in" || b.status === "Checked In" || b.status === "Staying" || b.status === "Checked-out" || b.status === "Checked Out"));
  
  const currentStays = activeBookings.filter(b => b.status === "Checked-in" || b.status === "Checked In" || b.status === "Staying");
  const pendingCheckins = activeBookings.filter(b => isToday(b.checkIn) && (b.status === "Confirmed" || b.status === "Pending" || b.status === "Pre-checked"));
  const pendingCheckouts = activeBookings.filter(b => isToday(b.checkOut) && (b.status === "Checked-in" || b.status === "Checked In" || b.status === "Staying"));

  // Dynamic Occupancy computations using shared KPI helper
  const roomKPIs = calculateRoomKPIs(rooms, bookings);
  const totalRooms = roomKPIs.totalRooms;
  const occupancyPercent = roomKPIs.occupancyRate;
  
  // Calculate Today's Revenue strictly for today's transactions / arrivals / bookings
  const todayRevenue = activeBookings.filter(r => {
    const isNotCancelled = String(r.status || '').toLowerCase() !== 'cancelled';
    return isNotCancelled && (isToday(r.checkIn) || isToday(r.createdAt));
  }).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  // Dynamic Room Counts from MongoDB
  const housekeepingClean = rooms.filter(r => r.status === 'Available' || r.housekeeping === 'Clean').length;
  const housekeepingDirty = rooms.filter(r => r.status === 'Dirty' || r.housekeeping === 'Dirty').length;
  const housekeepingInspect = rooms.filter(r => r.housekeeping === 'Inspected').length;
  const oooCount = rooms.filter(r => r.status === 'Maintenance' || r.status === 'Out of Order' || r.status === 'Blocked').length;
  const cleaningCount = rooms.filter(r => r.housekeeping === 'Cleaning').length;

  const pendingApprovals = pendingApprovalsList.filter(a => a.status === "Pending");
  const recentFeedback = feedbackList.slice(0, 5);

  // Settled Payments & Total Revenue strictly matching payment ledger
  const settledPayments = payments.filter(p => {
    const s = String(p.status || '').toLowerCase();
    return s === 'settled' || s === 'paid' || s === 'success' || s === 'completed';
  });
  const totalSettledPayments = settledPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalReservationsRevenue = activeBookings.reduce((sum, b) => sum + (Number(b.amount) || Number(b.totalAmount) || 0), 0);
  const totalRevenueAllTime = totalSettledPayments > 0 ? totalSettledPayments : totalReservationsRevenue;

  // Dynamic monthly payments breakdown & cumulative trajectory matching live settled payments ledger
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
    <div className="space-y-6 text-left">

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 dashboard-stats-grid">
        <div>
          <PremiumStatCard label="Arrivals" value={arrivalsToday.length.toString()} hint="Today's bookings" icon={Calendar} accentColor="#FF7A59" />
        </div>
        <div>
          <PremiumStatCard label="Departures" value={departuresToday.length.toString()} hint="Today's check-outs" icon={Calendar} accentColor="#5B21B6" />
        </div>
        <div>
          <PremiumStatCard label="Occupied Rooms" value={occupiedCount.toString()} hint="In-stay guests" icon={Users} accentColor="#2E7D32" />
        </div>
        <div>
          <PremiumStatCard label="Today's Revenue" value={`₹${todayRevenue.toLocaleString("en-IN")}`} hint="Today's confirmed stays revenue" icon={DollarSign} accentColor="#F5C06A" />
        </div>
        <div>
          <PremiumStatCard label="Occupancy Rate" value={`${occupancyPercent}%`} hint={`Stays: ${occupiedCount}/${totalRooms} rms`} icon={Percent} accentColor="#FF6B8B" />
        </div>
      </div>

      {/* Main Row: Operations Overview & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Total Revenue Performance Section */}
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
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={localRevenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="managerMonthlyRevGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#managerMonthlyRevGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Side: Quick Manager Actions stack */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-muted shadow-soft overflow-hidden h-full flex flex-col justify-between">
            <div className="p-4 border-b border-muted/60 bg-gradient-to-r from-navy/5 via-transparent to-purple/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Quick Manager Actions</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy/5 text-navy-deep border border-navy/10">Fast Access</span>
            </div>

            <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
              {/* Action 1: Operations */}
              <Link
                to="/manager/operations"
                className="group relative flex items-center justify-between p-3 rounded-xl border border-muted/80 bg-white hover:border-indigo/40 hover:bg-gradient-to-r hover:from-indigo/5 hover:to-transparent hover:shadow-soft transition-all duration-200 cursor-pointer hover:no-underline"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-indigo/10 text-indigo flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-indigo group-hover:text-white transition-all duration-200 shadow-sm">
                    <Building className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-navy group-hover:text-indigo transition-colors leading-snug">Operations Grid</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Check-ins & Movements</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo/10 text-indigo">Live</span>
                  <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-indigo group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>

              {/* Action 2: Approvals */}
              <Link
                to="/manager/approvals"
                className="group relative flex items-center justify-between p-3 rounded-xl border border-muted/80 bg-white hover:border-warning/40 hover:bg-gradient-to-r hover:from-warning/5 hover:to-transparent hover:shadow-soft transition-all duration-200 cursor-pointer hover:no-underline"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-warning group-hover:text-white transition-all duration-200 shadow-sm">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-navy group-hover:text-warning transition-colors leading-snug">Review Approvals</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Discounts & Overrides</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning">{pendingApprovals.length} Pending</span>
                  <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-warning group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>

              {/* Action 3: Shifts */}
              <Link
                to="/manager/shifts"
                className="group relative flex items-center justify-between p-3 rounded-xl border border-muted/80 bg-white hover:border-emerald-500/40 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:to-transparent hover:shadow-soft transition-all duration-200 cursor-pointer hover:no-underline"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 shadow-sm">
                    <Users className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-navy group-hover:text-emerald-600 transition-colors leading-snug">Manage Shifts</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Rosters & Duty Logs</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Active</span>
                  <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>

              {/* Action 4: Payments */}
              <Link
                to="/manager/payments"
                className="group relative flex items-center justify-between p-3 rounded-xl border border-muted/80 bg-white hover:border-purple/40 hover:bg-gradient-to-r hover:from-purple/5 hover:to-transparent hover:shadow-soft transition-all duration-200 cursor-pointer hover:no-underline"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-purple/10 text-purple flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-purple group-hover:text-white transition-all duration-200 shadow-sm">
                    <CreditCard className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-navy group-hover:text-purple transition-colors leading-snug">Payments Ledger</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Transactions & Settlements</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple/10 text-purple">Finance</span>
                  <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-purple group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            </div>
          </div>
        </div>

      </div>



      {/* Guest Feedback Ledger */}
      <Panel
        title="Recent Guest Feedback"
        description="Live ratings, sentiments, and comments submitted by verified guests."
        actions={
          <Link
            to="/manager/feedback"
            className="text-xs font-bold text-purple hover:underline inline-flex items-center gap-1"
          >
            View All Feedback ({feedbackList.length}) <ArrowRight className="size-3" />
          </Link>
        }
      >
        <div className="p-4 bg-white rounded-b-xl">
          {feedbackList.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-semibold select-none">
              No guest feedback records submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {feedbackList.slice(0, 3).map((f) => (
                <div key={f._id || f.id} className="p-4 rounded-xl border border-muted bg-[#fcfcfc] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-navy">{f.guestName || "Valued Guest"}</p>
                      <p className="text-[10px] text-muted-foreground">Room #{f.room || "101"} · {f.bookingId || "BK-1001"}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[11px]">
                      <Star className="size-3 fill-amber-400 text-amber-400" /> {f.rating || 5}.0
                    </div>
                  </div>
                  <p className="text-muted-foreground italic text-[11px] line-clamp-2">
                    "{f.comment || f.comments || "Pleasant stay, good cleanliness and hospitality."}"
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-muted/60 text-[10px]">
                    <span className="font-semibold text-muted-foreground">
                      {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : "Recently"}
                    </span>
                    <span className={`font-bold ${f.response ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {f.response ? "✓ Responded" : "Pending Reply"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Extend Stay Modal */}
      <ExtendStayModal
        isOpen={extendModalOpen}
        booking={selectedBookingForExtend}
        onClose={() => {
          setExtendModalOpen(false);
          setSelectedBookingForExtend(null);
        }}
        onSuccess={() => {
          loadDashboardData();
        }}
        userRole="manager"
      />
    </div>
  );
}

const ManagerDashboardRoute = {
  head: () => ({
    meta: [
      { title: "Manager Dashboard — Hour Stay" },
      { name: "description", content: "Front office shift overview for today." },
      { property: "og:title", content: "Manager Dashboard — Hour Stay" },
      { property: "og:description", content: "Front office shift overview for today." }
    ]
  }),
  component: ManagerDashboard
};

export { ManagerDashboardRoute as Route };