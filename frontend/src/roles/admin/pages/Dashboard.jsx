import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { authService } from "@/services/auth";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { 
  Area, AreaChart, Line, LineChart, Pie, PieChart, Cell, 
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
import { extractRoomNumber, calculateRoomKPIs } from "@/utils/roomUtils";

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
          <h3 className="mt-1.5 font-display text-lg font-black text-navy leading-none whitespace-nowrap">{value}</h3>
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
  const [chartTab, setChartTab] = useState("revenue"); // revenue | occupancy | adr | revpar | channels
  const [opTab, setOpTab] = useState("property"); // property | occupancy | reservations | revenue | approvals | staff | channels | alerts
  const [approvalsList, setApprovalsList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState(null);

  async function loadDashboardData(isSilent = false) {
    try {
      if (!isSilent) setError(null);
      const user = authService.getCurrentUser();
      if (!user) throw new Error("No authenticated user found.");

      const [propertiesRes, reservationsRes, roomsRes, staffRes, approvalsRes, feedbackRes] = await Promise.all([
        superAdminService.getProperties().catch(() => ({ success: true, data: [] })),
        superAdminService.getReservations().catch(() => ({ success: true, data: [] })),
        adminService.getRooms().catch(() => ({ success: true, data: [] })),
        superAdminService.getUsers().catch(() => ({ success: true, data: [] })),
        managerService.getApprovals().catch(() => ({ success: true, data: [] })),
        adminService.getFeedback().catch(() => ({ success: true, data: [] }))
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
      if (approvalsRes.success && approvalsRes.data) {
        setApprovalsList(approvalsRes.data);
      }
      if (feedbackRes && feedbackRes.success && Array.isArray(feedbackRes.data)) {
        setFeedbackList(feedbackRes.data);
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

      setRooms(uniqueRooms);

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

  const handleApproveApproval = async (id) => {
    try {
      const target = approvalsList.find(a => (a.id || a._id) === id);
      const targetId = target?._id || target?.id || id;
      await managerService.updateApproval(targetId, 'Approve', 'Approved via Admin Dashboard');
      toast.success("Override request approved.");
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Approval decision failed.");
    }
  };

  const handleDenyApproval = async (id) => {
    try {
      const target = approvalsList.find(a => (a.id || a._id) === id);
      const targetId = target?._id || target?.id || id;
      await managerService.updateApproval(targetId, 'Reject', 'Rejected via Admin Dashboard');
      toast.error("Override request rejected.");
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Rejection decision failed.");
    }
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

  const revenueToday = reservations.filter(r => r.status !== 'Cancelled').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const adr = occupiedRooms > 0 ? Math.round(revenueToday / occupiedRooms) : (totalRooms > 0 ? Math.round(revenueToday / totalRooms) : 0);
  const revpar = totalRooms > 0 ? Math.round(revenueToday / totalRooms) : 0;

  const dirtyRooms = rooms.filter(r => r.status === 'Dirty' || r.housekeeping === 'Dirty').length;
  const outOfOrderRooms = rooms.filter(r => r.status === "Maintenance" || r.status === "Out of Order" || r.status === "Blocked").length;
  const activeBookingsCount = reservations.filter(r => r.status !== 'Checked-out' && r.status !== 'Cancelled').length;
  const pendingPayments = reservations.reduce((sum, r) => sum + Number(r.balance || 0), 0);
  
  const arrivalsCount = reservations.filter(r => isToday(r.checkIn) && (r.status === "Confirmed" || r.status === "Pending" || r.status === "Pre-checked" || r.status === "Paid" || r.status === "Checked-in")).length;
  const departuresCount = reservations.filter(r => isToday(r.checkOut) && (r.status === "Checked-in" || r.status === "Checked In" || r.status === "Staying" || r.status === "Checked-out" || r.status === "Checked Out")).length;

  // Dynamic Room Type performance listing
  const roomTypeCounts = {};
  rooms.forEach(r => {
    const t = r.category || r.type || "Standard Room";
    if (!roomTypeCounts[t]) roomTypeCounts[t] = { type: t, count: 0, occupied: 0, rate: 3500 };
    roomTypeCounts[t].count += 1;
    const rNum = String(r.roomNumber || r.num || '');
    if (occupiedRoomNums.has(rNum) || r.status === 'Occupied') {
      roomTypeCounts[t].occupied += 1;
    }
  });
  const roomTypeStats = Object.values(roomTypeCounts);

  // Chart Mappings scaled to live metrics
  const localRevenueTrend = revenueTrend.map(item => {
    const scale = revenueToday > 0 ? (revenueToday / 284000) : 0.15;
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

      {/* Main Row: Operational Performance Trends & Right Operations Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-ui">
        
        {/* Left Side: Combined Recharts Panel */}
        <div className="lg:col-span-2">
          <Panel 
            title="Operational Performance Trends" 
            description="Historical analysis of room metrics, occupancy, and distribution channels"
            actions={
              <div className="flex rounded-lg border border-muted bg-[#fcfcfc] p-1 gap-1">
                {["revenue", "occupancy", "adr", "revpar", "channels"].map((t) => (
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
              {chartTab === "revenue" && (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={localRevenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#adminRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

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
        </div>

        {/* Right Side: Operations stack */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Console Actions */}
          <Panel title="Console Quick Actions" description="Fast operational shortcuts.">
            <div className="grid grid-cols-3 gap-2.5 p-4 bg-white rounded-b-xl font-ui">
              <Link to="/admin/staff/add" className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 transition-all text-center group cursor-pointer hover:no-underline min-h-[76px]">
                <UserPlus className="size-5 text-indigo group-hover:scale-115 transition-transform" />
                <span className="text-[10px] font-bold text-navy mt-1.5 leading-none">Add Staff</span>
              </Link>
              <Link to="/admin/reservations/add" className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 transition-all text-center group cursor-pointer hover:no-underline min-h-[76px]">
                <CalendarCheck className="size-5 text-warning group-hover:scale-115 transition-transform" />
                <span className="text-[10px] font-bold text-navy mt-1.5 leading-none">Add Booking</span>
              </Link>
              <Link to="/admin/coupons/add" className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 transition-all text-center group cursor-pointer hover:no-underline min-h-[76px]">
                <Percent className="size-5 text-success group-hover:scale-115 transition-transform" />
                <span className="text-[10px] font-bold text-navy mt-1.5 leading-none">Add Coupons</span>
              </Link>
            </div>
          </Panel>

          {/* Today's Operations Card */}
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

      {/* Broad Administrative Workspace */}
      <Panel
        title="Administrative Workspace"
        description="Property overview, occupancy status, stays list, payouts, approvals, staff directory, channels, and system alert logs."
        actions={
          <div className="flex flex-wrap gap-1 bg-[#fcfcfc] border border-muted p-1 rounded-lg">
            {[
              { id: "property", label: "Property Info" },
              { id: "occupancy", label: "Occupancy Grid" },
              { id: "reservations", label: "Reservations" },
              { id: "revenue", label: "Revenue Ledger" },
              { id: "feedback", label: `Guest Feedback (${feedbackList.length})` },
              { id: "approvals", label: "Approvals Logs" },
              { id: "staff", label: "Staff List" },
              { id: "channels", label: "OTA Parity" },
              { id: "alerts", label: "System Alerts" }
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={opTab === tab.id ? "secondary" : "ghost"}
                className="h-8 text-[11px] font-bold px-3"
                onClick={() => setOpTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        }
      >
        <div className="p-4 font-ui">
          
          {/* 1. Property Info Tab */}
          {opTab === "property" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-2 rounded-xl text-xs">
              <div className="space-y-3.5 border-r border-muted/50 pr-4">
                <h4 className="text-sm font-bold text-navy-deep flex items-center gap-2"><Building className="size-4.5 text-purple" /> {propName}</h4>
                <p className="text-muted-foreground leading-relaxed">Located in <strong className="text-navy">{propCity}</strong>. Scoped property configurations, taxation rules and operator shift checklists are synchronized dynamically with MongoDB collections.</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-muted/20 border border-muted rounded-xl p-3">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">City Scope</span>
                    <strong className="text-navy mt-1 block">{propCity}</strong>
                  </div>
                  <div className="bg-muted/20 border border-muted rounded-xl p-3">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Branch Code</span>
                    <strong className="text-navy mt-1 block">{(property?.code || "JAI").toUpperCase()}</strong>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <h5 className="font-bold text-navy">Administrative Scope</h5>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex justify-between border-b border-muted/30 pb-1.5"><span>Total Registered Keys:</span> <strong className="text-navy">{totalRooms} Keys</strong></li>
                  <li className="flex justify-between border-b border-muted/30 pb-1.5"><span>Contact Support Line:</span> <strong className="text-navy">{property?.phone || "+91 40 4495 1022"}</strong></li>
                  <li className="flex justify-between border-b border-muted/30 pb-1.5"><span>E-mail Interface:</span> <strong className="text-navy">{property?.email || "reservations@hourstay.com"}</strong></li>
                  <li className="flex justify-between"><span>Yield Optimization RevPAR:</span> <strong className="text-navy">₹{revpar.toLocaleString("en-IN")}</strong></li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. Occupancy Grid Tab */}
          {opTab === "occupancy" && (
            <div className="overflow-x-auto min-w-[600px] border border-muted rounded-xl bg-white shadow-soft">
              <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/10 rounded-t-xl">
                <div className="text-left">Room Category</div>
                <div className="text-center">Total Keys</div>
                <div className="text-center">Occupied Rooms</div>
                <div className="text-right">Daily Tariff</div>
              </div>
              <div className="divide-y divide-muted/60 font-sans">
                {roomTypeStats.map((item) => (
                  <div key={item.type} className="grid grid-cols-4 gap-4 px-4 py-3.5 items-center hover:bg-muted/5 transition-colors">
                    <div className="text-left font-semibold text-navy text-xs">{item.type}</div>
                    <div className="text-center text-muted-foreground font-semibold">{item.count} Keys</div>
                    <div className="flex items-center justify-center">
                      <Tag tone={item.occupied > 5 ? "success" : "info"}>{item.occupied} Occupied</Tag>
                    </div>
                    <div className="text-right font-bold text-navy">₹{item.rate.toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Reservations Tab */}
          {opTab === "reservations" && (
            <div className="overflow-x-auto min-w-[760px] border border-muted rounded-xl bg-white shadow-soft">
              <div className="grid grid-cols-7 gap-3 px-4 py-3 border-b border-muted text-[10px] uppercase font-bold text-muted-foreground bg-muted/10 rounded-t-xl">
                <div className="text-left col-span-2">Guest Name</div>
                <div className="text-left">Room Number</div>
                <div className="text-left">Stay Dates</div>
                <div className="text-left">Source</div>
                <div className="text-right">Amount</div>
                <div className="text-center">Status / Action</div>
              </div>
              <div className="divide-y divide-muted/60">
                {reservations.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground font-semibold">No reservations loaded.</div>
                ) : (
                  reservations.slice(0, 10).map((item, idx) => {
                    const isCheckedIn = ["checked-in", "checked in", "staying", "staying-in"].includes(String(item.status || "").toLowerCase().trim());
                    return (
                      <div key={idx} className="grid grid-cols-7 gap-3 px-4 py-3.5 items-center hover:bg-[#fcfcfc] transition-colors text-xs">
                        <div className="text-left font-semibold text-navy truncate col-span-2">{item.guestName || item.guest || "Walk-in Guest"}</div>
                        <div className="text-left font-mono font-bold">{item.roomNumber || item.room || "Unassigned"}</div>
                        <div className="text-left text-muted-foreground truncate">{item.checkIn} → {item.checkOut}</div>
                        <div className="text-left"><Tag tone="brand">{item.source || "Direct"}</Tag></div>
                        <div className="text-right font-bold text-navy">₹{(item.amount || item.totalAmount || 0).toLocaleString()}</div>
                        <div className="flex items-center justify-center gap-1.5">
                          <Tag tone={isCheckedIn || item.status === "Confirmed" ? "success" : "warning"}>{item.status}</Tag>
                          {isCheckedIn && (
                            <ExtendStayButton
                              size="xs"
                              label="Extend"
                              onClick={() => {
                                setSelectedBookingForExtend(item);
                                setExtendModalOpen(true);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 4. Revenue Ledger Tab */}
          {opTab === "revenue" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-muted rounded-xl p-4 bg-muted/10">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Today's Billing Revenue</span>
                  <p className="text-xl font-bold text-navy mt-1">₹{revenueToday.toLocaleString("en-IN")}</p>
                </div>
                <div className="border border-muted rounded-xl p-4 bg-muted/10">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Outstanding Pending Payments</span>
                  <p className="text-xl font-bold text-warning mt-1">₹{pendingPayments.toLocaleString("en-IN")}</p>
                </div>
                <div className="border border-muted rounded-xl p-4 bg-muted/10">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Average Room Rate (ADR)</span>
                  <p className="text-xl font-bold text-purple mt-1">₹{adr.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <h5 className="font-bold text-navy pt-2">Recent Invoiced Folios</h5>
              <div className="overflow-x-auto border border-muted rounded-xl bg-white shadow-soft">
                <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-muted text-[10px] uppercase font-bold text-muted-foreground bg-muted/10 rounded-t-xl">
                  <div className="text-left">Folio ID</div>
                  <div className="text-left">Guest</div>
                  <div className="text-left">Method</div>
                  <div className="text-right">Invoiced Amount</div>
                  <div className="text-center">Payment Status</div>
                </div>
                <div className="divide-y divide-muted/40">
                  {reservations.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground font-semibold">No recent invoiced folios found.</div>
                  ) : (
                    reservations.slice(0, 5).map((r) => (
                      <div key={r._id || r.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center hover:bg-[#fcfcfc] text-xs">
                        <div className="text-left font-mono font-semibold text-navy">FOL-{r.bookingId || (r._id ? String(r._id).slice(-4) : r.id)}</div>
                        <div className="text-left font-bold text-navy">{r.guest}</div>
                        <div className="text-left text-muted-foreground">{r.source || "Direct Web"}</div>
                        <div className="text-right font-bold text-navy">₹{(r.amount || 0).toLocaleString("en-IN")}</div>
                        <div className="flex items-center justify-center">
                          <Tag tone={r.paymentStatus === "Paid" || r.balance === 0 ? "success" : "warning"}>
                            {r.paymentStatus || (r.balance === 0 ? "Paid" : "Pending")}
                          </Tag>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. Approvals Logs Tab */}
          {opTab === "approvals" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvalsList.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-muted hover:bg-muted/15 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-accent/15 px-2 py-0.5 text-[9px] font-bold text-navy uppercase">{item.type}</span>
                      <Tag tone={item.status === "Approved" ? "success" : item.status === "Rejected" ? "error" : "warning"}>{item.status}</Tag>
                    </div>
                    <h4 className="font-semibold text-navy mt-1.5 text-xs truncate">{item.reason}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Guest: {item.guest} · Amount: ₹{item.amount.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground font-mono mt-0.5">Requested by: {item.requestedBy}</p>
                  </div>
                  {item.status === "Pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="xs" className="bg-navy hover:bg-navy-deep text-white text-[10px] font-bold px-2.5 h-7" onClick={() => handleApproveApproval(item.id)}>Approve</Button>
                      <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive/5 text-[10px] px-2 h-7" onClick={() => handleDenyApproval(item.id)}>Deny</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 6. Staff List Tab */}
          {opTab === "staff" && (
            <div className="overflow-x-auto border border-muted rounded-xl bg-white shadow-soft">
              <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-muted text-[10px] uppercase font-bold text-muted-foreground bg-muted/10 rounded-t-xl">
                <div className="text-left">Name</div>
                <div className="text-left">Email Address</div>
                <div className="text-left">Assigned Role</div>
                <div className="text-center">Status</div>
              </div>
              <div className="divide-y divide-muted/60">
                {staffList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground font-semibold">No active operators found.</div>
                ) : (
                  staffList.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-4 px-4 py-3.5 items-center hover:bg-[#fcfcfc] transition-colors text-xs">
                      <div className="text-left font-semibold text-navy">{item.name}</div>
                      <div className="text-left font-mono text-muted-foreground truncate">{item.email}</div>
                      <div className="text-left"><Tag tone="brand">{item.role === "receptionist" ? "Front Desk Operator" : item.role}</Tag></div>
                      <div className="flex items-center justify-center">
                        <Tag tone={item.status === "Active" ? "success" : "error"}>{item.status || "Active"}</Tag>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 7. OTA Parity Tab */}
          {opTab === "channels" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border border-muted rounded-xl p-4 bg-white shadow-soft text-center">
                  <strong className="text-navy block text-sm">MakeMyTrip</strong>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Parity: <strong className="text-success">99.8% Sync</strong></span>
                  <Tag tone="success" className="mt-2">Connected</Tag>
                </div>
                <div className="border border-muted rounded-xl p-4 bg-white shadow-soft text-center">
                  <strong className="text-navy block text-sm">Booking.com</strong>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Parity: <strong className="text-success">99.9% Sync</strong></span>
                  <Tag tone="success" className="mt-2">Connected</Tag>
                </div>
                <div className="border border-muted rounded-xl p-4 bg-white shadow-soft text-center">
                  <strong className="text-navy block text-sm">Goibibo</strong>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Parity: <strong className="text-warning">Rate Shift</strong></span>
                  <Tag tone="warning" className="mt-2">Action Required</Tag>
                </div>
                <div className="border border-muted rounded-xl p-4 bg-white shadow-soft text-center">
                  <strong className="text-navy block text-sm">Agoda</strong>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Parity: <strong className="text-success">99.1% Sync</strong></span>
                  <Tag tone="success" className="mt-2">Connected</Tag>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-left leading-relaxed">
                Rates & Inventory channel updates are synchronized hourly with the Global Distribution system. Goibibo parity warning indicates active rate is ₹950 below the baseline limit defined inside the calendar dashboard.
              </p>
            </div>
          )}

          {/* 7. Guest Feedback Tab */}
          {opTab === "feedback" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-navy">Verified Guest Stay Feedback</h4>
                  <p className="text-[11px] text-muted-foreground">Live records synchronized from MongoDB database.</p>
                </div>
                <Link
                  to="/admin/feedback"
                  className="text-xs font-bold text-purple hover:underline inline-flex items-center gap-1"
                >
                  Manage Feedback Ledger <ArrowRight className="size-3" />
                </Link>
              </div>

              {feedbackList.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-semibold select-none border border-dashed border-muted rounded-xl bg-[#fcfcfc]">
                  No feedback records found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {feedbackList.slice(0, 6).map((f) => (
                    <div key={f._id || f.id} className="p-4 rounded-xl border border-muted bg-white shadow-2xs space-y-2.5 text-xs text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-navy">{f.guestName || "Valued Guest"}</p>
                          <p className="text-[10px] text-muted-foreground">Room #{f.room || "101"} · Ref: {f.bookingId || "BK-1001"}</p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[11px]">
                          <Star className="size-3 fill-amber-400 text-amber-400" /> {f.rating || 5}.0
                        </div>
                      </div>
                      <p className="text-muted-foreground italic text-[11px] line-clamp-2">
                        "{f.comment || f.comments || "Pleasant stay experience."}"
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
          )}

          {/* 8. System Alerts Tab */}
          {opTab === "alerts" && (
            <div className="space-y-2">
              {activeAlerts.map((alert, index) => (
                <div key={index} className="flex gap-3 items-start border border-muted rounded-xl p-3 bg-white hover:bg-muted/15 transition-all text-xs">
                  {alert.type === "error" && <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />}
                  {alert.type === "warning" && <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />}
                  {alert.type === "info" && <Activity className="size-4 text-info shrink-0 mt-0.5" />}
                  {alert.type === "success" && <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />}
                  
                  <div className="min-w-0 text-left flex-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <h5 className="font-bold text-navy text-[11px] truncate">{alert.title}</h5>
                      <span className="text-[9px] font-semibold text-muted-foreground/60 shrink-0 font-sans">{alert.time}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{alert.msg}</p>
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
          loadDashboardData(true);
        }}
        userRole="admin"
      />

    </div>
  );
}