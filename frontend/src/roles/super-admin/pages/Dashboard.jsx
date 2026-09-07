import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag, statusTone } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { RevenueChart, OccupancyChart } from "@/components/hs/Charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import { adminService } from "@/services/admin";
import { 
  Building2, TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, 
  Calendar, ShieldAlert, Activity, Users, ShieldCheck, CheckCircle2, AlertTriangle, 
  Play, Bed, RefreshCw, Eye, ExternalLink, ChevronUp, ChevronDown, Search, ArrowRight,
  Plus, X, Ticket, Star, MessageSquareHeart
} from "lucide-react";

function PremiumStatCard({ label, value, delta = 6, hint, icon: Icon, accentColor = "#0d1b2a" }) {
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
        <span className="inline-flex items-center gap-0.5 font-bold shrink-0 text-success">
          <ArrowUpRight className="size-3.5" />
          +{delta}%
        </span>
        {hint && <span className="text-[10px] text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Live state datasets
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [subscriptionRequests, setSubscriptionRequests] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [decidingId, setDecidingId] = useState(null);
  const [rejectionModalId, setRejectionModalId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Scope & Date states
  const [propertyScope, setPropertyScope] = useState("All");
  const [dateRange, setDateRange] = useState("Last 30 Days");

  // Table controls states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Revenue Period state
  const [revPeriod, setRevPeriod] = useState("Monthly");

  // System Health States
  const systemHealth = [
    { name: "Database Nodes", status: "Healthy", desc: "Local JSON Fallback Active" },
    { name: "OTA Channel Gateways", status: "Connected", desc: "XML 2-way sync operational" },
    { name: "API Rate-Limiting", status: "Nominal", desc: "0 throttled requests" },
    { name: "RBAC Session Auditor", status: "Healthy", desc: "Audits synchronized" }
  ];

  async function loadDashboardData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      const [statsRes, propertiesRes, reservationsRes, logsRes, requestsRes, fbRes] = await Promise.all([
        superAdminService.getDashboardStats().catch(() => ({})),
        superAdminService.getProperties().catch(() => ({})),
        superAdminService.getReservations().catch(() => ({})),
        superAdminService.getAuditLogs().catch(() => ({})),
        superAdminService.getSubscriptionRequests().catch(() => ({})),
        adminService.getFeedback().catch(() => ({}))
      ]);
      
      if (statsRes.success) setStats(statsRes.data.stats);
      if (propertiesRes.success) setProperties(propertiesRes.data);
      if (reservationsRes.success) setReservations(reservationsRes.data);
      if (logsRes.success) setLogs(logsRes.data);
      if (requestsRes.success) setSubscriptionRequests(requestsRes.data);
      if (fbRes?.success && Array.isArray(fbRes.data)) setFeedbackList(fbRes.data);
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to sync dashboard data.");
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData(false);

    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 10000); // 10s poll fallback

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
    loadDashboardData(false);
  };

  const handleDecide = async (id, action, reason = "") => {
    setDecidingId(id);
    try {
      const res = await superAdminService.decideSubscriptionRequest(id, action, reason);
      if (res.success) {
        toast.success(`Subscription request ${action === 'Approve' ? 'approved' : 'rejected'} successfully.`);
        setRejectionModalId(null);
        setRejectionReason("");
        await loadDashboardData();
      } else {
        toast.error(res.message || "Failed to process decision.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to process decision.");
    } finally {
      setDecidingId(null);
    }
  };

  // Compute live KPIs
  const totalProperties = properties.length;
  const totalRooms = properties.reduce((sum, p) => sum + (p.rooms || 0), 0) || 12;
  const totalBookings = reservations.length;
  const totalRevenue = reservations.reduce((sum, r) => sum + (r.amount || 0), 0);
  const occupiedCount = reservations.filter(r => r.status === 'Checked-in' || r.status === 'Occupied').length;
  const avgOccupancy = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const activeAdmins = properties.length;

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Table filtering and sorting calculations
  const filteredAndSortedProperties = properties
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase());
      const matchesScope = propertyScope === "All" || p.id === propertyScope || p._id === propertyScope;
      return matchesSearch && matchesScope;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle calculated values
      if (sortField === "revenue" || sortField === "reservations") {
        const aRes = reservations.filter(r => r.propertyId === a.id || r.propertyId === a._id);
        const bRes = reservations.filter(r => r.propertyId === b.id || r.propertyId === b._id);
        aVal = sortField === "revenue" ? aRes.reduce((sum, r) => sum + (r.amount || 0), 0) : aRes.length;
        bVal = sortField === "revenue" ? bRes.reduce((sum, r) => sum + (r.amount || 0), 0) : bRes.length;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredAndSortedProperties.length / itemsPerPage);
  const paginatedProperties = filteredAndSortedProperties.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Dynamic Channel Performance Aggregations
  const channelPerformanceData = (() => {
    const sources = ["Direct", "MakeMyTrip", "Goibibo", "Booking.com", "Agoda", "Other"];
    const totalBookingsSum = reservations.length || 1;
    const totalRevSum = reservations.reduce((sum, r) => sum + (r.amount || 0), 0) || 1;

    return sources.map(src => {
      const pReservations = reservations.filter(r => {
        if (src === "Other") {
          return !["Direct", "MakeMyTrip", "Goibibo", "Booking.com", "Agoda"].includes(r.source);
        }
        return r.source === src;
      });
      const count = pReservations.length;
      const rev = pReservations.reduce((sum, r) => sum + (r.amount || 0), 0);
      const pct = ((rev / totalRevSum) * 100).toFixed(1);
      return { source: src, count, rev, pct };
    });
  })();

  return (
    <div className="space-y-6">


      {error && <Notice tone="error" title="Synchronization Error" className="text-left">{error}</Notice>}



      {/* KPI Cards Row - 6 Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <PremiumStatCard
          label="Total Properties"
          value={loading ? "—" : `${totalProperties} Hotels`}
          hint="Hour Stay portfolio"
          icon={Building2}
          accentColor="#0D1B2A"
        />
        <PremiumStatCard
          label="Total Rooms"
          value={loading ? "—" : `${totalRooms} Keys`}
          hint="Room inventories"
          icon={Bed}
          accentColor="#5B21B6"
        />
        <PremiumStatCard
          label="Occupancy"
          value={loading ? "—" : `${avgOccupancy}%`}
          hint="Portfolio average"
          icon={Percent}
          accentColor="#FF7A59"
        />
        <PremiumStatCard
          label="Total Reservations"
          value={loading ? "—" : totalBookings}
          delta={stats && stats[0] ? stats[0].delta : 8}
          hint="Nights sold"
          icon={Calendar}
          accentColor="#FF6B8B"
        />
        <PremiumStatCard
          label="Total Revenue"
          value={loading ? "—" : `₹${totalRevenue.toLocaleString("en-IN")}`}
          delta={stats && stats[1] ? stats[1].delta : 12}
          hint="Consolidated billing"
          icon={DollarSign}
          accentColor="#F5C06A"
        />
        <PremiumStatCard
          label="Active Admins"
          value={loading ? "—" : `${activeAdmins} Active`}
          hint="Property managers"
          icon={Users}
          accentColor="#071420"
        />
      </div>

      {/* Charts section: Revenue Analytics & Occupancy Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Revenue Analytics"
          description="Monthly room revenues portfolio summary."
          actions={
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-success mr-2 font-mono">₹{totalRevenue.toLocaleString("en-IN")} (+12% vs previous)</span>
              {["Daily", "Weekly", "Monthly"].map((p) => (
                <button
                  key={p}
                  onClick={() => setRevPeriod(p)}
                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border transition-all ${
                    revPeriod === p
                      ? "bg-purple/15 text-purple border-purple/35"
                      : "bg-transparent text-muted-foreground/60 border-muted hover:bg-muted/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-5 bg-white rounded-b-xl">
            <RevenueChart />
          </div>
        </Panel>
        <Panel 
          title="Occupancy Analytics" 
          description="Consolidated monthly room occupancy rates."
          actions={
            <span className="text-[10px] font-bold text-success font-mono">{avgOccupancy}% avg (+4% vs previous)</span>
          }
        >
          <div className="p-5 bg-white rounded-b-xl">
            <OccupancyChart />
          </div>
        </Panel>
      </div>

      {/* Property Performance Table Section with Search, Sort, Filter, Pagination */}
      <Panel title="Property Performance" description="Operational statistics across Hour Stay hotels.">
        <div className="p-4 bg-white rounded-b-xl space-y-4">
          {/* Controls row */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search property name or city..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-9 rounded-full border-muted text-xs bg-white w-full"
              />
            </div>

            {/* Filters removed */}
          </div>

          {/* Table wrapper */}
          {loading ? (
            <LoadingRows rows={4} />
          ) : paginatedProperties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">No matching property records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th onClick={() => handleSort("name")} className="p-4 w-[20%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        Property
                        {sortField === "name" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th onClick={() => handleSort("city")} className="p-4 w-[12%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        Location
                        {sortField === "city" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th onClick={() => handleSort("rooms")} className="p-4 w-[8%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        Rooms
                        {sortField === "rooms" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th onClick={() => handleSort("occupancy")} className="p-4 w-[10%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        Occupancy
                        {sortField === "occupancy" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th onClick={() => handleSort("adr")} className="p-4 w-[10%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        ADR
                        {sortField === "adr" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th onClick={() => handleSort("revpar")} className="p-4 w-[10%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        RevPAR
                        {sortField === "revpar" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th onClick={() => handleSort("revenue")} className="p-4 w-[12%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        Revenue
                        {sortField === "revenue" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th onClick={() => handleSort("reservations")} className="p-4 w-[10%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        Reservations
                        {sortField === "reservations" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th onClick={() => handleSort("status")} className="p-4 w-[8%] text-left cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === "status" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th className="p-4 w-[10%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {paginatedProperties.map((p) => {
                    const pReservations = reservations.filter(r => r.propertyId === p.id || r.propertyId === p._id);
                    const resCount = pReservations.length;
                    const revenueSum = pReservations.reduce((sum, r) => sum + (r.amount || 0), 0);

                    return (
                      <tr key={p.id || p._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 w-[20%] text-left">
                          <p className="font-semibold text-navy text-sm">{p.name}</p>
                        </td>
                        <td className="p-4 w-[12%] text-left text-muted-foreground text-xs">
                          {p.city}
                        </td>
                        <td className="p-4 w-[8%] text-left font-semibold text-navy">{p.rooms} Keys</td>
                        <td className="p-4 w-[10%] text-left font-semibold text-navy">{p.occupancy}%</td>
                        <td className="p-4 w-[10%] text-left font-semibold text-navy">₹{(p.adr || 0).toLocaleString("en-IN")}</td>
                        <td className="p-4 w-[10%] text-left font-semibold text-navy">₹{(p.revpar || 0).toLocaleString("en-IN")}</td>
                        <td className="p-4 w-[12%] text-left font-semibold text-navy">₹{revenueSum.toLocaleString("en-IN")}</td>
                        <td className="p-4 w-[10%] text-left font-semibold text-navy">{resCount} Bookings</td>
                        <td className="p-4 w-[8%] text-left">
                          <Tag tone={statusTone(p.status)}>{p.status}</Tag>
                        </td>
                        <td className="p-4 w-[10%] text-right">
                          <div className="flex gap-1.5 justify-end">
                            <button className="p-1 rounded hover:bg-muted text-navy-deep" title="View Details">
                              <Eye className="size-3.5" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted text-purple" title="Open Property">
                              <ExternalLink className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4 text-xs">
              <span className="text-muted-foreground">Showing page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-muted hover:bg-muted font-semibold"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-muted hover:bg-muted font-semibold"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Triple Grid Row: Recent Activity, Channel Performance, Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity Log */}
        <Panel title="Recent Activity" description="Platform audit logs of administrative actions.">
          <div className="bg-white rounded-b-xl p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[450px] table-fixed">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[9px] font-semibold">
                    <th className="p-3 w-[25%] text-left">User</th>
                    <th className="p-3 w-[35%] text-left">Action</th>
                    <th className="p-3 w-[20%] text-left">Entity</th>
                    <th className="p-3 w-[20%] text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {logs.slice(0, 5).map((log, idx) => (
                    <tr key={idx} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3 w-[25%] text-left font-semibold text-navy truncate" title={log.user || "system@hourstay.com"}>
                        {String(log.user || "system@hourstay.com").split('@')[0]}
                      </td>
                      <td className="p-3 w-[35%] text-left text-muted-foreground truncate" title={log.action}>{log.action}</td>
                      <td className="p-3 w-[20%] text-left text-purple font-medium truncate" title={log.entity}>{log.entity || "Global"}</td>
                      <td className="p-3 w-[20%] text-right font-mono text-[9px] text-muted-foreground truncate" title={log.time || log.createdAt || "Global Action"}>
                        {String(log.time || log.createdAt || "14 Aug 2026").split(',')[0]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        {/* Channel Performance (compact table) */}
        <Panel title="Channel Performance" description="OTA and direct bookings contributions.">
          <div className="bg-white rounded-b-xl p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[400px] table-fixed">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[9px] font-semibold">
                    <th className="p-3 w-[35%] text-left">Source</th>
                    <th className="p-3 w-[20%] text-left">Bookings</th>
                    <th className="p-3 w-[25%] text-left">Revenue</th>
                    <th className="p-3 w-[20%] text-right">Contrib %</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {channelPerformanceData.map((ch) => (
                    <tr key={ch.source} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3 w-[35%] text-left font-semibold text-navy truncate" title={ch.source}>{ch.source}</td>
                      <td className="p-3 w-[20%] text-left font-medium text-navy">{ch.count}</td>
                      <td className="p-3 w-[25%] text-left font-bold text-purple">₹{ch.rev.toLocaleString("en-IN")}</td>
                      <td className="p-3 w-[20%] text-right font-mono font-bold text-navy">{ch.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        {/* Quick Actions */}
        <Panel title="Quick Actions" description="Platform administrative shortcuts.">
          <div className="p-4 bg-white rounded-b-xl space-y-3 text-left">
            {/* Action 1: Add Property */}
            <Link
              to="/super-admin/properties/add"
              className="flex items-center gap-3 p-3 rounded-lg border border-[#0d1b2a]/15 bg-[#FFF7E6]/5 hover:bg-[#FFF7E6]/15 hover:border-[#0d1b2a]/35 hover:-translate-y-0.5 hover:shadow-soft transition-all duration-300 group cursor-pointer"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-[#0d1b2a] text-[#FFF7E6] shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Building2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-[11px] text-navy group-hover:text-purple transition-colors truncate">Onboard Property</h4>
                <p className="text-[9px] text-muted-foreground truncate">Register hotel profile & rooms</p>
              </div>
            </Link>

            {/* Action 2: Add Subscription */}
            <Link
              to="/super-admin/subscription"
              className="flex items-center gap-3 p-3 rounded-lg border border-[#0d1b2a]/15 bg-[#FFF7E6]/5 hover:bg-[#FFF7E6]/15 hover:border-[#0d1b2a]/35 hover:-translate-y-0.5 hover:shadow-soft transition-all duration-300 group cursor-pointer"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-[#5B21B6] text-[#FFF7E6] shrink-0 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-[11px] text-navy group-hover:text-purple transition-colors truncate">Manage Subscriptions</h4>
                <p className="text-[9px] text-muted-foreground truncate">Pricing plans & billing</p>
              </div>
            </Link>

            {/* Action 3: Add Coupons */}
            <Link
              to="/super-admin/coupons"
              className="flex items-center gap-3 p-3 rounded-lg border border-[#0d1b2a]/15 bg-[#FFF7E6]/5 hover:bg-[#FFF7E6]/15 hover:border-[#0d1b2a]/35 hover:-translate-y-0.5 hover:shadow-soft transition-all duration-300 group cursor-pointer"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-[#FF6B8B] text-[#FFF7E6] shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Percent className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-[11px] text-navy group-hover:text-purple transition-colors truncate">Promo Coupons</h4>
                <p className="text-[9px] text-muted-foreground truncate">Coupon codes & discounts</p>
              </div>
            </Link>
          </div>
        </Panel>
      </div>

      {/* Subscription Approvals Board Panel */}
      <Panel title="SaaS Subscription Approvals Board" description="Review property-level plan activation requests, approve upgrades, or reject with feedback.">
        <div className="bg-white rounded-b-xl p-4">
          {subscriptionRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground select-none">
              No subscription request records found on the system.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-bold select-none">
                    <th className="p-3">Property Branch</th>
                    <th className="p-3">Requested Plan</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3 text-right">Pricing</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Date Requested</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {subscriptionRequests.map((req) => (
                    <tr key={req._id || req.id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3 font-bold text-navy">{req.propertyName}</td>
                      <td className="p-3 font-semibold text-navy-deep">{req.planName}</td>
                      <td className="p-3 text-muted-foreground">{req.adminName}</td>
                      <td className="p-3 text-right font-bold text-navy">₹{req.price.toLocaleString("en-IN")}/mo</td>
                      <td className="p-3 text-center">
                        <Tag tone={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'error' : 'warning'}>
                          {req.status}
                        </Tag>
                      </td>
                      <td className="p-3 text-muted-foreground font-semibold">
                        {new Date(req.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3 text-right">
                        {req.status === 'Pending' ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              disabled={decidingId !== null}
                              onClick={() => handleDecide(req._id || req.id, 'Approve')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 px-3 text-[10px] rounded-lg shadow-soft cursor-pointer flex items-center justify-center gap-1"
                            >
                              Approve
                            </Button>
                            <Button
                              disabled={decidingId !== null}
                              onClick={() => {
                                setRejectionModalId(req._id || req.id);
                                setRejectionReason("");
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold h-7 px-3 text-[10px] rounded-lg shadow-soft cursor-pointer flex items-center justify-center gap-1"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="inline-block text-[10px] text-muted-foreground font-bold bg-muted/65 px-2.5 py-1 rounded-md">
                              {req.status === 'Approved' ? `Approved by ${req.decidedBy === "Nandini Rao" || req.decidedBy === "Super Admin" || !req.decidedBy ? "Nandini Rao Rao" : req.decidedBy}` : `Rejected: "${req.rejectionReason}"`}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      {/* Guest Feedback & Hospitality Sentiment Panel */}
      <Panel
        title="Portfolio Guest Feedback & Hospitality Rating"
        description="Unified feedback ledger submitted across all Hour Stay properties from MongoDB database."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-navy bg-muted/60 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Star className="size-3.5 fill-gold text-gold" />
              {feedbackList.length > 0 ? (feedbackList.reduce((sum, f) => sum + (Number(f.rating) || 5), 0) / feedbackList.length).toFixed(1) : "5.0"} Portfolio Avg
            </span>
          </div>
        }
      >
        <div className="p-4 bg-white rounded-b-xl">
          {feedbackList.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-semibold select-none border border-dashed border-muted rounded-xl bg-[#fcfcfc]">
              No guest feedback records submitted across properties yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {feedbackList.slice(0, 3).map((f) => (
                <div key={f._id || f.id} className="p-4 rounded-xl border border-muted bg-[#fcfcfc] space-y-2.5 text-xs text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-navy">{f.guestName || "Valued Guest"}</p>
                      <p className="text-[10px] text-muted-foreground">{f.propertyId || "HS-JAI"} · Room #{f.room || "101"}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[11px]">
                      <Star className="size-3 fill-amber-400 text-amber-400" /> {f.rating || 5}.0
                    </div>
                  </div>
                  <p className="text-muted-foreground italic text-[11px] line-clamp-2">
                    "{f.comment || f.comments || "Exceptional stay experience and hospitality."}"
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-muted/60 text-[10px]">
                    <span className="font-semibold text-muted-foreground">
                      {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : "Recently"}
                    </span>
                    <span className="font-bold text-purple uppercase text-[9px] tracking-wider">
                      {f.status || 'Published'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Rejection Modal */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            <div className="p-4 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-bold text-navy text-sm">Provide Rejection Reason</h3>
              <button
                className="text-muted-foreground hover:text-navy cursor-pointer"
                onClick={() => setRejectionModalId(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Feedback / Reason for rejection</label>
                <textarea
                  className="w-full border border-muted rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-navy resize-none min-h-[80px]"
                  placeholder="E.g., Requested tier does not match target property rooms count limit."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setRejectionModalId(null)}
                className="h-8 px-4 text-xs rounded-full cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                disabled={!rejectionReason.trim()}
                onClick={() => handleDecide(rejectionModalId, 'Reject', rejectionReason)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 px-4 text-xs rounded-full cursor-pointer"
              >
                Submit Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const SuperAdminDashboardRoute = {
  head: () => ({
    meta: [
      { title: "Super Admin Platform Console — Hour Stay" }
    ]
  }),
  component: SuperAdminDashboard
};

export { SuperAdminDashboardRoute as Route };