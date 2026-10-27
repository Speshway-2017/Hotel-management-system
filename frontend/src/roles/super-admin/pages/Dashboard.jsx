import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { RevenueChart, OccupancyChart } from "@/components/hs/Charts";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import { adminService } from "@/services/admin";
import { 
  Building2, TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, 
  Calendar, ShieldAlert, Activity, Users, ShieldCheck, CheckCircle2, AlertTriangle, 
  Play, Bed, RefreshCw, Eye,
  Plus, X, Ticket, Star, MessageSquareHeart
} from "lucide-react";

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
        {delta !== null && delta !== undefined && (
          <span className={`inline-flex items-center gap-0.5 font-bold shrink-0 ${isPositive ? "text-success" : "text-destructive"}`}>
            {isPositive ? "+" : ""}{delta}%
          </span>
        )}
        {hint && <span className="text-[10px] text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Live state datasets
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);

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
      const [statsRes, propertiesRes, reservationsRes, fbRes] = await Promise.all([
        superAdminService.getDashboardStats().catch(() => ({})),
        superAdminService.getProperties().catch(() => ({})),
        superAdminService.getReservations().catch(() => ({})),
        adminService.getFeedback().catch(() => ({}))
      ]);
      
      if (statsRes.success) setStats(statsRes.data.stats);
      if (propertiesRes.success) setProperties(propertiesRes.data);
      if (reservationsRes.success) setReservations(reservationsRes.data);
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

  const getPropertyRevenue = (p, resList = reservations) => {
    if (!p) return 0;
    const backendRev = Number(p.revenue ?? p.totalRevenue ?? 0);
    if (!isNaN(backendRev) && backendRev > 0) {
      return backendRev;
    }

    const candidates = [p.id, p._id, p.propertyId].filter(Boolean).map(x => String(x).toLowerCase().trim());
    if (Array.isArray(resList) && resList.length > 0) {
      const pReservations = resList.filter(r => {
        const rPropId = typeof r.propertyId === 'object' ? (r.propertyId?._id || r.propertyId?.id) : r.propertyId;
        const rHotelId = typeof r.hotelId === 'object' ? (r.hotelId?._id || r.hotelId?.id) : r.hotelId;
        const rCandidates = [rPropId, rHotelId].filter(Boolean).map(x => String(x).toLowerCase().trim());
        return rCandidates.some(c => candidates.includes(c));
      });
      const valid = pReservations.filter(r => {
        const s = String(r.status || '').toLowerCase().trim();
        return s !== 'cancelled' && s !== 'canceled' && s !== 'void' && s !== 'rejected';
      });
      if (valid.length > 0) {
        const sum = valid.reduce((acc, r) => {
          const val = Number(r.amount ?? r.totalAmount ?? r.paidAmount ?? 0);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
        if (sum > 0) return sum;
      }
    }
    return 0;
  };

  // Compute live KPIs
  const totalProperties = properties.length;
  const totalRooms = properties.reduce((sum, p) => sum + (p.rooms || 0), 0) || 12;
  const totalBookings = reservations.length;
  const validLiveReservations = reservations.filter(r => {
    const s = String(r.status || '').toLowerCase().trim();
    return s !== 'cancelled' && s !== 'canceled' && s !== 'void' && s !== 'rejected';
  });
  const totalRevenue = properties.reduce((sum, p) => sum + getPropertyRevenue(p), 0);
  const occupiedCount = reservations.filter(r => r.status === 'Checked-in' || r.status === 'Occupied').length;
  const avgOccupancy = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const activeAdmins = properties.length;



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
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 dashboard-stats-grid">
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



      {/* Dual Grid Row: Channel Performance, Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                <h4 className="font-bold text-[11px] text-slate-800 group-hover:text-purple transition-colors truncate">Onboard Property</h4>
                <p className="text-[9px] text-muted-foreground truncate">Register hotel profile & rooms</p>
              </div>
            </Link>

            {/* Action 2: Financial Reports */}
            <Link
              to="/super-admin/reports"
              className="flex items-center gap-3 p-3 rounded-lg border border-[#0d1b2a]/15 bg-[#FFF7E6]/5 hover:bg-[#FFF7E6]/15 hover:border-[#0d1b2a]/35 hover:-translate-y-0.5 hover:shadow-soft transition-all duration-300 group cursor-pointer"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-[#5B21B6] text-[#FFF7E6] shrink-0 group-hover:scale-105 transition-transform duration-300">
                <DollarSign className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-[11px] text-slate-800 group-hover:text-purple transition-colors truncate">Financial Reports</h4>
                <p className="text-[9px] text-muted-foreground truncate">Commissions & revenue logs</p>
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
                <h4 className="font-bold text-[11px] text-slate-800 group-hover:text-purple transition-colors truncate">Promo Coupons</h4>
                <p className="text-[9px] text-muted-foreground truncate">Coupon codes & discounts</p>
              </div>
            </Link>
          </div>
        </Panel>
      </div>



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
                      <p className="text-[10px] text-muted-foreground">{f.propertyId || "HS-9HQ8P"} · Room #{f.room || "101"}</p>
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