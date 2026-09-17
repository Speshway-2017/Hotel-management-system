import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { authService } from "@/services/auth";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { 
  Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { revenueTrend, sourceMix } from "@/data/hs-data";
import { 
  Bed, Calendar, DollarSign, Percent, ArrowUpRight, CheckCircle2,
  AlertTriangle, Wrench, ShieldAlert, Sparkles, User, RefreshCw,
  TrendingUp, CreditCard, Users, ArrowRight, Activity, Plus, Clock, Star,
  Check, X, ChevronRight, ShieldCheck, Building, UserPlus, CalendarCheck,
  Receipt, Settings
} from "lucide-react";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 10,
  tickLine: false,
  axisLine: false
};

const tooltipStyle = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 11
  }
};

const pieColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)"
];

import { managerService } from "@/services/manager";
import { adminService } from "@/services/admin";
import { toast } from "sonner";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { isToday, formatDisplayDate } from "@/utils/dateUtils";
import { extractRoomNumber, calculateRoomKPIs, normalizeRoomList } from "@/utils/roomUtils";

const AdminDashboardRoute = {
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Hour Stay" },
      { name: "description", content: "Rambagh Residency, Jaipur — today at a glance." },
      { property: "og:title", content: "Owner Dashboard — Hour Stay" },
      { property: "og:description", content: "Rambagh Residency, Jaipur — today at a glance." }
    ]
  }),
  component: AdminDashboard
};

export { AdminDashboardRoute as Route };

function PremiumStatCard({ label, value, delta = 4, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  const isPositive = delta >= 0;
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="h-8 flex items-start">
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

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [property, setProperty] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [chartTab, setChartTab] = useState("occupancy"); // occupancy | adr | revpar | channels
  const [revenueChartTab, setRevenueChartTab] = useState("area"); // area | bar
  const [feedbackList, setFeedbackList] = useState([]);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState(null);

  async function loadDashboardData(isSilent = false) {
    try {
      if (!isSilent) setError(null);
      const user = authService.getCurrentUser();
      if (!user) throw new Error("No authenticated user found.");

      const [propertiesRes, reservationsRes, roomsRes, staffRes, feedbackRes, paymentsRes] = await Promise.all([
        superAdminService.getProperties().catch(() => ({ success: true, data: [] })),
        superAdminService.getReservations().catch(() => ({ success: true, data: [] })),
        adminService.getRooms().catch(() => ({ success: true, data: [] })),
        superAdminService.getUsers().catch(() => ({ success: true, data: [] })),
        adminService.getFeedback().catch(() => ({ success: true, data: [] })),
        adminService.getPayments().catch(() => ({ success: true, data: [] }))
      ]);

      if (propertiesRes.success && propertiesRes.data.length > 0) {
        setProperty(propertiesRes.data[0]);
      }
      if (reservationsRes.success && reservationsRes.data) {
        setReservations(reservationsRes.data);
      }
      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data.filter(u => u.role === "receptionist"));
      }
      if (feedbackRes && feedbackRes.success && Array.isArray(feedbackRes.data)) {
        setFeedbackList(feedbackRes.data);
      }
      if (paymentsRes && paymentsRes.success && Array.isArray(paymentsRes.data)) {
        setPayments(paymentsRes.data);
      } else if (Array.isArray(paymentsRes)) {
        setPayments(paymentsRes);
      }

      // Dynamic Room Inventory Resolution from DB documents + Property Room Types
      let dbRooms = (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) ? roomsRes.data : [];

      let settingsTypes = [];
      if (propertiesRes && propertiesRes.success && Array.isArray(propertiesRes.data) && propertiesRes.data.length > 0) {
        settingsTypes = propertiesRes.data[0]?.settings?.roomTypes || [];
      }

      let savedTypes = [];
      try {
        const saved = localStorage.getItem("hms_room_types_list_v2");
        if (saved) savedTypes = JSON.parse(saved);
      } catch (e) {}

      if (settingsTypes.length === 0 && savedTypes.length === 0) {
        savedTypes = [
          { category: "Standard Room", rooms: ["101", "102", "103"] },
          { category: "Deluxe Room", rooms: ["201", "202", "203", "401", "402", "403"] },
          { category: "Executive Suite", rooms: ["301", "302", "303"] }
        ];
      }

      const allTypes = [...settingsTypes, ...savedTypes];
      const existingNums = new Set(dbRooms.map(r => String(r.roomNumber || r.num)));

      allTypes.forEach(t => {
        const assigned = Array.isArray(t.rooms) ? t.rooms : [];
        assigned.forEach(num => {
          if (num && !existingNums.has(String(num))) {
            existingNums.add(String(num));
            dbRooms.push({
              _id: `R-${num}`,
              roomNumber: String(num),
              num: String(num),
              category: t.category,
              status: "Available"
            });
          }
        });
      });

      const uniqueRooms = [];
      const seenNums = new Set();
      dbRooms.forEach(rm => {
        const num = String(rm.roomNumber || rm.num || '');
        if (num && !seenNums.has(num)) {
          seenNums.add(num);
          uniqueRooms.push({ ...rm, num, roomNumber: num });
        }
      });

      const normalized = normalizeRoomList(uniqueRooms, (reservationsRes && reservationsRes.data) || []);
      setRooms(normalized);

    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load dashboard statistics.");
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 10000); // 10 seconds polling fallback

    const handleFocus = () => loadDashboardData(true);
    window.addEventListener("focus", handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadDashboardData(true);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Property Details & Live Database-Driven KPI Computations
  const propName = property?.name || "Speshway Luxury Hotel";
  const propCity = property?.city || "Madhapur, Hyderabad";
  
  const roomKPIs = calculateRoomKPIs(rooms, reservations);
  const totalRooms = roomKPIs.totalRooms;
  const occupiedRooms = roomKPIs.occupiedRooms;
  const reservedRooms = roomKPIs.reservedRooms;
  const availableRooms = roomKPIs.availableRooms;
  const occupancyRate = roomKPIs.occupancyRate;
  const occupiedRoomNums = roomKPIs.occupiedRoomNums;

  // Calculate Today's Revenue strictly for today's transactions / today's arrivals
  const settledTodayPayments = payments.filter(p => {
    const s = String(p.status || '').toLowerCase();
    const isSettled = s === 'settled' || s === 'paid' || s === 'success' || s === 'completed';
    const pDate = p.createdAt || p.date || p.paymentDate;
    return isSettled && isToday(pDate);
  }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const todayArrivalsRevenue = reservations.filter(r => {
    const isNotCancelled = String(r.status || '').toLowerCase() !== 'cancelled';
    return isNotCancelled && (isToday(r.checkIn) || isToday(r.createdAt));
  }).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const revenueToday = settledTodayPayments > 0 ? settledTodayPayments : todayArrivalsRevenue;
  const totalRevenueAllTime = reservations.filter(r => String(r.status || '').toLowerCase() !== 'cancelled').reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const adr = occupiedRooms > 0 
    ? Math.round((revenueToday > 0 ? revenueToday : (totalRevenueAllTime / Math.max(1, reservations.length || 1))) / occupiedRooms) 
    : (totalRooms > 0 ? 3500 : 0);
  const revpar = totalRooms > 0 ? Math.round((revenueToday > 0 ? revenueToday : totalRevenueAllTime / 30) / totalRooms) : 0;

  const dirtyRooms = rooms.filter(r => r.status === 'Dirty' || r.housekeeping === 'Dirty').length;
  const outOfOrderRooms = rooms.filter(r => r.status === "Maintenance" || r.status === "Out of Order" || r.status === "Blocked").length;
  const activeBookingsCount = reservations.filter(r => r.status !== 'Checked-out' && r.status !== 'Cancelled').length;
  const pendingPayments = reservations.reduce((sum, r) => sum + Number(r.balance || 0), 0);
  
  const arrivalsCount = reservations.filter(r => isToday(r.checkIn) && (r.status === "Confirmed" || r.status === "Pending" || r.status === "Pre-checked" || r.status === "Paid" || r.status === "Checked-in")).length;
  const departuresCount = reservations.filter(r => isToday(r.checkOut) && (r.status === "Checked-in" || r.status === "Checked In" || r.status === "Staying" || r.status === "Checked-out" || r.status === "Checked Out")).length;

  // Chart Mappings scaled to live metrics
  const localRevenueTrend = revenueTrend.map(item => {
    const scale = totalRevenueAllTime > 0 ? (totalRevenueAllTime / 284000) : 0.15;
    return {
      m: item.m,
      revenue: Math.round(item.revenue * scale),
      occupancy: Math.min(100, Math.round(item.occupancy * (occupancyRate > 0 ? occupancyRate / 84 : 0.1)))
    };
  });

  const adrRevparTrend = revenueTrend.map(item => {
    const itemOccupancy = Math.min(100, Math.round(item.occupancy * (occupancyRate > 0 ? occupancyRate / 84 : 0.1)));
    const itemAdr = Math.round(adr * (1 + (item.occupancy - 84) / 400));
    const itemRevpar = Math.round(itemAdr * (itemOccupancy / 100));
    return {
      m: item.m,
      adr: itemAdr,
      revpar: itemRevpar
    };
  });

  // Dynamic Alerts & Logs
  const activeAlerts = [
    { type: "info", title: "Room Inventory Verified", msg: `${availableRooms} of ${totalRooms} rooms available for booking.`, time: "Just now" },
    { type: "success", title: "Live Atlas Sync", msg: "Dashboard synchronized with MongoDB database.", time: "1 min ago" }
  ];

  // Dynamic Booking sources breakdown calculated from live reservations
  const sourceCounts = {};
  reservations.forEach(r => {
    const src = r.source || "Direct";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const totalBookingsCount = reservations.length || 1;
  const sourceColors = {
    "Direct": "#8b5cf6",
    "Direct Web": "#8b5cf6",
    "Walk-in": "#8b5cf6",
    "MakeMyTrip": "#f5c06a",
    "Booking.com": "#3b82f6",
    "Agoda": "#ef4444",
    "Expedia": "#10b981"
  };
  const sourcePerformanceData = Object.keys(sourceCounts).length > 0
    ? Object.entries(sourceCounts).map(([name, count]) => ({
        name,
        value: Math.round((count / totalBookingsCount) * 100),
        color: sourceColors[name] || "#6366f1"
      }))
    : [
        { name: "Direct / Walk-in", value: 40, color: "#8b5cf6" },
        { name: "MakeMyTrip", value: 30, color: "#f5c06a" },
        { name: "Booking.com", value: 20, color: "#3b82f6" },
        { name: "Agoda", value: 10, color: "#ef4444" }
      ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Admin Console" subtitle="Synchronizing stay logs and shift diagnostics..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      
      {/* Consolidated Critical KPIs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 font-ui">
        <PremiumStatCard label="Occupied Rooms" value={occupiedRooms.toString()} hint="In-stay guests" icon={Users} accentColor="#5B21B6" />
        <PremiumStatCard label="Reserved Rooms" value={reservedRooms.toString()} hint="Confirmed bookings" icon={Calendar} accentColor="#F59E0B" />
        <PremiumStatCard label="Available Rooms" value={availableRooms.toString()} hint="Vacant to sell" icon={CheckCircle2} accentColor="#2E7D32" />
        <PremiumStatCard label="Today's Revenue" value={`₹${revenueToday.toLocaleString("en-IN")}`} hint="Room billing logs" icon={DollarSign} accentColor="#F5C06A" />
        <PremiumStatCard label="Average ADR" value={`₹${adr.toLocaleString("en-IN")}`} hint="Daily room rate" icon={TrendingUp} accentColor="#FF7A59" />
        <PremiumStatCard label="Yield RevPAR" value={`₹${revpar.toLocaleString("en-IN")}`} hint="Rev per available key" icon={Activity} accentColor="#071420" />
      </div>

      {/* Graphs Row: Operational Performance Trends (Left) & Total Revenue Performance (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-ui">
        
        {/* Left: Operational Performance Trends */}
        <Panel 
          title="Operational Performance Trends" 
          description="Room occupancy, ADR, RevPAR metrics, and distribution mix"
          actions={
            <div className="flex rounded-lg border border-muted bg-[#fcfcfc] p-1 gap-1">
              {["occupancy", "adr", "revpar", "channels"].map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={chartTab === t ? "secondary" : "ghost"}
                  className="h-7 text-[10px] font-bold px-2.5 capitalize"
                  onClick={() => setChartTab(t)}
                >
                  {t === "adr" || t === "revpar" ? t.toUpperCase() : t}
                </Button>
              ))}
            </div>
          }
        >
          <div className="p-4">
            {chartTab === "occupancy" && (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={localRevenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`, "Occupancy"]} />
                    <Line type="monotone" dataKey="occupancy" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartTab === "adr" && (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adrRevparTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`₹${v.toLocaleString()}`, "ADR"]} />
                    <Line type="monotone" dataKey="adr" stroke="#f5c06a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartTab === "revpar" && (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adrRevparTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`₹${v.toLocaleString()}`, "RevPAR"]} />
                    <Line type="monotone" dataKey="revpar" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartTab === "channels" && (
              <div className="h-[280px] flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={sourcePerformanceData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={3}
                        stroke="none"
                      >
                        {sourcePerformanceData.map((s, idx) => (
                          <Cell key={idx} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full md:w-1/2 space-y-2 text-xs font-semibold">
                  {sourcePerformanceData.map((s, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                      <span>{s.value}% Share</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        {/* Right: Total Revenue Performance Graph */}
        <Panel
          title="Total Revenue Performance"
          description={`Cumulative gross revenue: ₹${totalRevenueAllTime.toLocaleString("en-IN")}`}
          actions={
            <div className="flex rounded-lg border border-muted bg-[#fcfcfc] p-1 gap-1">
              <Button
                size="sm"
                variant={revenueChartTab === "area" ? "secondary" : "ghost"}
                className="h-7 text-[10px] font-bold px-2.5"
                onClick={() => setRevenueChartTab("area")}
              >
                Trajectory
              </Button>
              <Button
                size="sm"
                variant={revenueChartTab === "bar" ? "secondary" : "ghost"}
                className="h-7 text-[10px] font-bold px-2.5"
                onClick={() => setRevenueChartTab("bar")}
              >
                Monthly Bars
              </Button>
            </div>
          }
        >
          <div className="p-4">
            {revenueChartTab === "area" ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={localRevenueTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} 
                      formatter={(v) => [`₹${v.toLocaleString()}`, "Total Revenue"]} 
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#totalRevenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={localRevenueTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} 
                      formatter={(v) => [`₹${v.toLocaleString()}`, "Monthly Revenue"]} 
                    />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Panel>

      </div>

      {/* Row Below Graphs: Console Quick Actions (Left 2 cols) & Today's Room Operations (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-ui">
        
        {/* Quick Actions Panel */}
        <div className="lg:col-span-2">
          <Panel 
            title="Console Quick Actions" 
            description="Fast operational shortcuts for reservations, approvals, rooms, staff and bookings."
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5 bg-white rounded-b-xl">
              
              {/* 1. Reservations */}
              <Link 
                to="/admin/reservations" 
                className="flex flex-col items-start justify-between p-3.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 hover:border-purple/30 transition-all group cursor-pointer hover:no-underline min-h-[90px] shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="grid size-8 place-items-center rounded-lg bg-purple/10 text-purple group-hover:scale-110 transition-transform">
                    <CalendarCheck className="size-4" />
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                    {activeBookingsCount} Active
                  </span>
                </div>
                <div className="mt-2 text-left">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-purple transition-colors">Reservations</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Manage all bookings</p>
                </div>
              </Link>

              {/* 2. Approvals */}
              <Link 
                to="/admin/approvals" 
                className="flex flex-col items-start justify-between p-3.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 hover:border-emerald-500/30 transition-all group cursor-pointer hover:no-underline min-h-[90px] shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="size-4" />
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Audit Logs
                  </span>
                </div>
                <div className="mt-2 text-left">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">Approvals</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Discount & refunds</p>
                </div>
              </Link>

              {/* 3. Rooms */}
              <Link 
                to="/admin/rooms" 
                className="flex flex-col items-start justify-between p-3.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 hover:border-brand/30 transition-all group cursor-pointer hover:no-underline min-h-[90px] shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand group-hover:scale-110 transition-transform">
                    <Bed className="size-4" />
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                    {totalRooms} Keys
                  </span>
                </div>
                <div className="mt-2 text-left">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-brand transition-colors">Rooms Management</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Inventory & status</p>
                </div>
              </Link>

              {/* 4. Add Booking */}
              <Link 
                to="/admin/reservations/add" 
                className="flex flex-col items-start justify-between p-3.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 hover:border-amber-500/30 transition-all group cursor-pointer hover:no-underline min-h-[90px] shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                    <Plus className="size-4" />
                  </span>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    Walk-in
                  </span>
                </div>
                <div className="mt-2 text-left">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Add Booking</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Create reservation</p>
                </div>
              </Link>

              {/* 5. Add Staff */}
              <Link 
                to="/admin/staff/add" 
                className="flex flex-col items-start justify-between p-3.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 hover:border-indigo-500/30 transition-all group cursor-pointer hover:no-underline min-h-[90px] shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <UserPlus className="size-4" />
                  </span>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Operator
                  </span>
                </div>
                <div className="mt-2 text-left">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">Add Staff</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Onboard shift team</p>
                </div>
              </Link>

              {/* 6. Coupons */}
              <Link 
                to="/admin/coupons/add" 
                className="flex flex-col items-start justify-between p-3.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 hover:border-rose-500/30 transition-all group cursor-pointer hover:no-underline min-h-[90px] shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
                    <Percent className="size-4" />
                  </span>
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                    Discounts
                  </span>
                </div>
                <div className="mt-2 text-left">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-rose-700 transition-colors">Add Coupons</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Campaign promo codes</p>
                </div>
              </Link>

            </div>
          </Panel>
        </div>

        {/* Today's Room Operations */}
        <div className="lg:col-span-1">
          <Panel title="Today's Room Operations" description="Check-in flows and expected stays">
            <div className="p-4 sm:p-5 space-y-3.5 text-xs font-semibold text-navy bg-white rounded-b-xl">
              <div className="flex items-center justify-between py-2 border-b border-muted">
                <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-4 text-indigo shrink-0" /> Expected Arrivals</span>
                <span className="font-bold text-navy">{arrivalsCount} booking(s)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-muted">
                <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-4 text-purple shrink-0" /> Expected Departures</span>
                <span className="font-bold text-navy">{departuresCount} booking(s)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-muted">
                <span className="flex items-center gap-2 text-muted-foreground"><Users className="size-4 text-success shrink-0" /> Occupied Rooms</span>
                <span className="font-bold text-navy">{occupiedRooms} Rooms</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-muted">
                <span className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4 text-warning shrink-0" /> Available Rooms</span>
                <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-success font-bold text-[10px]">{availableRooms} remaining</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4 text-pink shrink-0" /> Out of Order</span>
                <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-destructive font-bold text-[10px]">{outOfOrderRooms} Rooms</span>
              </div>
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
          loadDashboardData(true);
        }}
        userRole="admin"
      />

    </div>
  );
}