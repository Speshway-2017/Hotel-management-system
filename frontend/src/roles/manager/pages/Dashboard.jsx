import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { 
  TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, 
  Calendar, ShieldAlert, Activity, Users, ShieldCheck, CheckCircle2, 
  Bed, RefreshCw, Clock, CheckCircle, Star, Wrench, MessageSquare,
  Building
} from "lucide-react";

// Premium stat card component
function PremiumStatCard({ label, value, delta = 4, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  const isPositive = delta >= 0;
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full"
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

function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [property, setProperty] = useState(null);
  
  // Data sets
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  
  // Operational tabs
  const [opTab, setOpTab] = useState("arrivals");
  const [chartTab, setChartTab] = useState("revenue");

  const todayStr = "2026-08-21";

  const loadDashboardData = async () => {
    setLoading(true);
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
        setLoading(false);
        return;
      }

      // Fetch all required resources
      const [propRes, bookingsRes, staffRes] = await Promise.all([
        superAdminService.getProperties(),
        superAdminService.getReservations(),
        superAdminService.getUsers()
      ]);

      if (propRes.success) {
        const found = propRes.data.find(p => p._id === propertyId || p.id === propertyId);
        setProperty(found || null);
      }
      if (bookingsRes.success) {
        const scoped = bookingsRes.data.filter(b => b.propertyId === propertyId);
        setBookings(scoped);
      }
      if (staffRes.success) {
        const scoped = staffRes.data.filter(s => s.propertyId === propertyId);
        setStaff(scoped);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Manager Console" subtitle="Synchronizing stay logs and shift diagnostics..." />
        <LoadingRows rows={5} />
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

  // Calculate live scoped KPI metrics
  const activeBookings = bookings.filter(b => b.status !== "Cancelled");
  
  const arrivalsToday = activeBookings.filter(b => b.checkIn === todayStr);
  const departuresToday = activeBookings.filter(b => b.checkOut === todayStr);
  
  const currentStays = activeBookings.filter(b => b.status === "Checked-in");
  const pendingCheckins = activeBookings.filter(b => b.checkIn === todayStr && b.status === "Confirmed");
  const pendingCheckouts = activeBookings.filter(b => b.checkOut === todayStr && b.status === "Checked-in");

  // Occupancy, ADR, RevPAR computations
  const totalRooms = property.rooms || 50;
  const rawOccupancy = totalRooms > 0 ? (currentStays.length / totalRooms) * 100 : 0;
  const occupancyPercent = rawOccupancy > 0 ? Math.round(rawOccupancy) : property.occupancy || 75;
  
  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const adrValue = activeBookings.length > 0 ? Math.round(totalRevenue / activeBookings.reduce((sum, b) => sum + (b.nights || 1), 0)) : property.adr || 8500;
  const revparValue = Math.round(adrValue * (occupancyPercent / 100)) || property.revpar || 6375;

  // Mocked stats for visual completeness of Manager view
  const housekeepingClean = Math.round(totalRooms * 0.6);
  const housekeepingDirty = Math.round(totalRooms * 0.3);
  const housekeepingInspect = totalRooms - housekeepingClean - housekeepingDirty;

  const activeMaintenance = [
    { id: "MNT-01", room: "302", issue: "AC fan noise override", priority: "Medium", status: "In Progress" },
    { id: "MNT-02", room: "104", issue: "Geyser thermostat replacement", priority: "High", status: "Assigned" }
  ];

  const pendingApprovals = [
    { id: "APP-01", type: "Discount Request", detail: "10% void for Corporate stay", guest: "Rohan Deshmukh" },
    { id: "APP-02", type: "Rate Overrule", detail: "Early check-in fee waiver", guest: "Devendra Shastri" }
  ];

  const recentFeedback = [
    { id: "FDB-01", guest: "Karan Malhotra", score: 5, comment: "Fabulous service, clean rooms and friendly receptionist" },
    { id: "FDB-02", guest: "Aisha Sharma", score: 4, comment: "Spacious luxury room, but dining order took longer than usual" }
  ];

  const serviceRequests = [
    { room: "302", item: "Extra towel set", time: "10 mins ago" },
    { room: "104", item: "UPI invoice dispatch", time: "25 mins ago" }
  ];

  const complaints = [
    { room: "205", text: "Wifi speed slow", status: "Pending" }
  ];

  // Simulated Trends for charts
  const baseRevenue = totalRevenue > 0 ? totalRevenue : (totalRooms * 1.5 * adrValue) || 450000;
  const revenueTrendData = [
    { date: "15 Aug", revenue: Math.round(baseRevenue * 0.12) || 45000, occupancy: Math.max(10, occupancyPercent - 5), adr: adrValue - 100, revpar: revparValue - 80 },
    { date: "16 Aug", revenue: Math.round(baseRevenue * 0.15) || 56000, occupancy: Math.max(10, occupancyPercent - 2), adr: adrValue - 50, revpar: revparValue - 40 },
    { date: "17 Aug", revenue: Math.round(baseRevenue * 0.14) || 52000, occupancy: Math.max(10, occupancyPercent + 3), adr: adrValue + 200, revpar: revparValue + 150 },
    { date: "18 Aug", revenue: Math.round(baseRevenue * 0.18) || 68000, occupancy: Math.max(10, occupancyPercent + 5), adr: adrValue + 100, revpar: revparValue + 90 },
    { date: "19 Aug", revenue: Math.round(baseRevenue * 0.20) || 75000, occupancy: Math.max(10, occupancyPercent + 8), adr: adrValue + 300, revpar: revparValue + 250 },
    { date: "20 Aug", revenue: Math.round(baseRevenue * 0.21) || 82000, occupancy: occupancyPercent || 75, adr: adrValue, revpar: revparValue }
  ];

  // Booking sources breakdown
  const sourcePerformanceData = [
    { name: "Direct", value: activeBookings.filter(b => b.source === "Direct" || b.source === "Walk-in").length || 4, color: "#8b5cf6" },
    { name: "MakeMyTrip", value: activeBookings.filter(b => b.source === "MakeMyTrip").length || 3, color: "#f5c06a" },
    { name: "Booking.com", value: activeBookings.filter(b => b.source === "Booking.com").length || 2, color: "#3b82f6" },
    { name: "Agoda", value: activeBookings.filter(b => b.source === "Agoda").length || 1, color: "#ef4444" }
  ];

  const cleaningCount = 2;
  const dirtyCount = 3;
  const oooCount = activeMaintenance.length;
  const occupiedCount = currentStays.length;
  const vacantCleanCount = Math.max(0, totalRooms - occupiedCount - dirtyCount - cleaningCount - oooCount);

  const vacantPct = (vacantCleanCount / totalRooms) * 100;
  const occupiedPct = (occupiedCount / totalRooms) * 100;
  const dirtyPct = (dirtyCount / totalRooms) * 100;
  const cleaningPct = (cleaningCount / totalRooms) * 100;
  const oooPct = (oooCount / totalRooms) * 100;

  return (
    <div className="space-y-6 text-left">

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <PremiumStatCard label="Arrivals" value={arrivalsToday.length.toString()} hint="Today's bookings" icon={Calendar} accentColor="#FF7A59" />
        </div>
        <div>
          <PremiumStatCard label="Departures" value={departuresToday.length.toString()} hint="Today's check-outs" icon={Calendar} accentColor="#5B21B6" />
        </div>
        <div>
          <PremiumStatCard label="In-House" value={currentStays.length.toString()} hint="Checked-in guests" icon={Users} accentColor="#2E7D32" />
        </div>
        <div>
          <PremiumStatCard label="Today's Revenue" value={`₹${totalRevenue.toLocaleString()}`} hint="All-time active stay tariff" icon={DollarSign} accentColor="#F5C06A" />
        </div>
        <div>
          <PremiumStatCard label="Occupancy Rate" value={`${occupancyPercent}%`} hint={`Stays: ${currentStays.length}/${totalRooms} rms`} icon={Percent} accentColor="#FF6B8B" />
        </div>
      </div>

      {/* Main Row: Operations Overview & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Charts Control */}
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
            {chartTab === "revenue" && (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="managerRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#managerRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartTab === "occupancy" && (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
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
                  <LineChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
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
                  <LineChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
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
                      <span>{s.value} stay(s)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>

        {/* Right Side: Operations stack */}
        <div className="lg:col-span-1">
          <Panel title="Today's Operations" description="Check-in flows and expected stays">
            <div className="space-y-3.5 text-xs font-semibold text-navy">
              <div className="flex items-center justify-between py-1.5 border-b border-muted">
                <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-4 text-indigo shrink-0" /> Total Arrivals</span>
                <span className="font-bold text-navy">{arrivalsToday.length} booking(s)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-muted">
                <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-4 text-purple shrink-0" /> Total Departures</span>
                <span className="font-bold text-navy">{departuresToday.length} booking(s)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-muted">
                <span className="flex items-center gap-2 text-muted-foreground"><Users className="size-4 text-success shrink-0" /> Current Stays</span>
                <span className="font-bold text-navy">{currentStays.length} guest(s)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-muted">
                <span className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4 text-warning shrink-0" /> Pending Check-ins</span>
                <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-warning font-bold text-[10px]">{pendingCheckins.length} remaining</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4 text-pink shrink-0" /> Pending Check-outs</span>
                <span className="rounded-full bg-pink/15 px-2.5 py-0.5 text-pink font-bold text-[10px]">{pendingCheckouts.length} remaining</span>
              </div>
            </div>
          </Panel>
        </div>

      </div>

      {/* Quick Manager Actions Panel */}
      <Panel title="Quick Manager Actions" description="Fast track controls for property modules">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white rounded-b-xl">
          <Link to="/manager/operations" className="flex flex-col items-center justify-center p-4 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 transition-all text-center group cursor-pointer hover:no-underline">
            <Building className="size-6 text-indigo group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-navy mt-2">Operations Grid</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">Live check-in flows</span>
          </Link>

          <Link to="/manager/approvals" className="flex flex-col items-center justify-center p-4 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 transition-all text-center group cursor-pointer hover:no-underline">
            <ShieldCheck className="size-6 text-warning group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-navy mt-2">Review Approvals</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">{pendingApprovals.length} pending requests</span>
          </Link>

          <Link to="/manager/shifts" className="flex flex-col items-center justify-center p-4 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 transition-all text-center group cursor-pointer hover:no-underline">
            <Users className="size-6 text-success group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-navy mt-2">Manage Shifts</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">Rosters and staff lists</span>
          </Link>

          <Link to="/manager/reports" className="flex flex-col items-center justify-center p-4 rounded-xl border border-muted bg-[#fcfcfc] hover:bg-muted/15 transition-all text-center group cursor-pointer hover:no-underline">
            <TrendingUp className="size-6 text-purple group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-navy mt-2">Yield Reports</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">Revenue & ADR analysis</span>
          </Link>
        </div>
      </Panel>

      {/* Quick Operational Sub-sections Panel */}
      <Panel
        title="Quick Operational Workspace"
        description="Immediate actions for arrivals, departures, stays, approvals, feedback, and maintenance lists."
        actions={
          <div className="flex flex-wrap gap-1 bg-[#fcfcfc] border border-muted p-1 rounded-lg">
            {[
              { id: "arrivals", label: "Arrivals" },
              { id: "departures", label: "Departures" },
              { id: "stays", label: "Current Stays" },
              { id: "approvals", label: "Pending Approvals" },
              { id: "feedback", label: "Recent Feedback" },
              { id: "maintenance", label: "Maintenance Issues" }
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={opTab === tab.id ? "secondary" : "ghost"}
                className="h-8 text-xs font-bold px-3.5"
                onClick={() => setOpTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        }
      >
        <div className="p-4">
          {opTab === "arrivals" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-muted text-[10px] uppercase font-bold text-muted-foreground">
                    <th className="pb-3 px-3">Guest</th>
                    <th className="pb-3 px-3">Room</th>
                    <th className="pb-3 px-3">Stay Dates</th>
                    <th className="pb-3 px-3">Source</th>
                    <th className="pb-3 px-3 text-right">Payment</th>
                    <th className="pb-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {arrivalsToday.length === 0 ? (
                    <tr><td colSpan="6" className="py-6 text-center text-muted-foreground">No arrivals today.</td></tr>
                  ) : (
                    arrivalsToday.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#fcfcfc]">
                        <td className="py-3 px-3 font-semibold text-navy">{item.guest}</td>
                        <td className="py-3 px-3 font-mono">{item.room || "—"}</td>
                        <td className="py-3 px-3">{item.checkIn} → {item.checkOut}</td>
                        <td className="py-3 px-3"><Tag tone="brand">{item.source || "Direct"}</Tag></td>
                        <td className="py-3 px-3 text-right font-bold">₹{item.amount?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <Tag tone={item.status === "Confirmed" ? "success" : "warning"}>{item.status}</Tag>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {opTab === "departures" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-muted text-[10px] uppercase font-bold text-muted-foreground">
                    <th className="pb-3 px-3">Guest</th>
                    <th className="pb-3 px-3">Room</th>
                    <th className="pb-3 px-3">Stay Dates</th>
                    <th className="pb-3 px-3">Source</th>
                    <th className="pb-3 px-3 text-right">Payment</th>
                    <th className="pb-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {departuresToday.length === 0 ? (
                    <tr><td colSpan="6" className="py-6 text-center text-muted-foreground">No departures today.</td></tr>
                  ) : (
                    departuresToday.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#fcfcfc]">
                        <td className="py-3 px-3 font-semibold text-navy">{item.guest}</td>
                        <td className="py-3 px-3 font-mono">{item.room || "—"}</td>
                        <td className="py-3 px-3">{item.checkIn} → {item.checkOut}</td>
                        <td className="py-3 px-3"><Tag tone="brand">{item.source || "Direct"}</Tag></td>
                        <td className="py-3 px-3 text-right font-bold">₹{item.amount?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <Tag tone={item.status === "Checked-out" ? "info" : "warning"}>{item.status}</Tag>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {opTab === "stays" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-muted text-[10px] uppercase font-bold text-muted-foreground">
                    <th className="pb-3 px-3">Guest</th>
                    <th className="pb-3 px-3">Room</th>
                    <th className="pb-3 px-3">Stay Dates</th>
                    <th className="pb-3 px-3">Pax</th>
                    <th className="pb-3 px-3 text-right">Invoice Amount</th>
                    <th className="pb-3 px-3 text-center">Ledger Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {currentStays.length === 0 ? (
                    <tr><td colSpan="6" className="py-6 text-center text-muted-foreground">No checked-in guests currently.</td></tr>
                  ) : (
                    currentStays.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#fcfcfc]">
                        <td className="py-3 px-3 font-semibold text-navy">{item.guest}</td>
                        <td className="py-3 px-3 font-mono">{item.room || "—"}</td>
                        <td className="py-3 px-3">{item.checkIn} → {item.checkOut}</td>
                        <td className="py-3 px-3">{item.pax || "2 Adults"}</td>
                        <td className="py-3 px-3 text-right font-bold">₹{item.amount?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center font-bold text-destructive">
                          ₹{(item.balance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {opTab === "approvals" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-muted hover:bg-muted/15 flex items-center justify-between">
                  <div>
                    <span className="rounded bg-accent/15 px-2 py-0.5 text-[9px] font-bold text-navy uppercase">{item.type}</span>
                    <h4 className="font-semibold text-navy mt-1.5 text-xs">{item.detail}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Guest: {item.guest}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="xs" className="bg-navy hover:bg-navy-deep text-white text-[10px] font-bold px-2.5 h-7">Approve</Button>
                    <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive/5 text-[10px] px-2 h-7">Deny</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {opTab === "feedback" && (
            <div className="space-y-4">
              {recentFeedback.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-muted hover:bg-muted/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy text-xs">{item.guest}</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-brand"><Star className="size-3.5 fill-brand text-brand" /> {item.score} / 5</span>
                  </div>
                  <p className="text-xs italic text-muted-foreground">"{item.comment}"</p>
                </div>
              ))}
            </div>
          )}

          {opTab === "maintenance" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMaintenance.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-muted hover:bg-muted/15 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-navy text-xs">Room {item.room}</span>
                      <span className="rounded bg-warning/15 px-2 py-0.5 text-[9px] font-bold text-warning">{item.priority} Priority</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.issue}</p>
                    <p className="text-[9px] font-mono text-muted-foreground mt-1">ID: {item.id} · Status: {item.status}</p>
                  </div>
                  <Button size="xs" variant="outline" className="text-indigo border-indigo/40 hover:bg-indigo/5 text-[10px] h-7 px-2.5 font-semibold">Mark Resolved</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/manager/")({
  head: () => ({
    meta: [
      { title: "Manager Dashboard — Hour Stay" },
      { name: "description", content: "Front office shift overview for today." },
      { property: "og:title", content: "Manager Dashboard — Hour Stay" },
      { property: "og:description", content: "Front office shift overview for today." }
    ]
  }),
  component: ManagerDashboard
});