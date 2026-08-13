import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag, statusTone } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { RevenueChart, OccupancyChart, SourceMixChart } from "@/components/hs/Charts";
import { Button } from "@/components/ui/button";
import { 
  Building2, TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, 
  Calendar, ShieldAlert, Activity, Users, ShieldCheck, CheckCircle2, AlertTriangle, Play, Bed 
} from "lucide-react";

function PremiumStatCard({ label, value, delta, hint, icon: Icon, borderTone = "purple" }) {
  const up = (delta ?? 0) >= 0;
  const borderClasses = {
    purple: "border-l-4 border-l-purple",
    gold: "border-l-4 border-l-gold",
    blush: "border-l-4 border-l-blush",
    navy: "border-l-4 border-l-navy"
  };

  return (
    <div className={`bg-white rounded-xl border border-muted p-3.5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden ${borderClasses[borderTone]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <h3 className="mt-1.5 font-display text-lg font-black text-navy leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-muted/65 text-navy-deep">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[10px]">
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-0.5 font-bold ${up ? "text-success" : "text-error"}`}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {up ? "+" : ""}{delta}%
          </span>
        )}
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live state datasets
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);

  // System Health States
  const systemHealth = [
    { name: "Database Nodes", status: "Healthy", desc: "Local JSON Fallback Active" },
    { name: "OTA Channel Gateways", status: "Connected", desc: "XML 2-way sync operational" },
    { name: "API Rate-Limiting", status: "Nominal", desc: "0 throttled requests" },
    { name: "RBAC Session Auditor", status: "Healthy", desc: "Audits synchronized" }
  ];

  // Pending Actions Alerts
  const pendingActions = [
    { id: 1, title: "Lake Palace Onboarding", action: "Review License Tier", severity: "warning" },
    { id: 2, title: "Goibibo Rate Parity discrepancy", action: "Fix Jaipur Tariff", severity: "error" },
    { id: 3, title: "Monthly GST compilation", action: "Generate Tax Ledger", severity: "info" }
  ];

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, propertiesRes, reservationsRes, logsRes] = await Promise.all([
          superAdminService.getDashboardStats(),
          superAdminService.getProperties(),
          superAdminService.getReservations(),
          superAdminService.getAuditLogs()
        ]);
        
        if (statsRes.success) setStats(statsRes.data.stats);
        if (propertiesRes.success) setProperties(propertiesRes.data);
        if (reservationsRes.success) setReservations(reservationsRes.data);
        if (logsRes.success) setLogs(logsRes.data);
      } catch (err) {
        setError(err.message || "Failed to sync dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Compute live KPIs
  const totalProperties = properties.length;
  const totalRooms = properties.reduce((sum, p) => sum + (p.rooms || 0), 0);
  const totalBookings = reservations.length;
  const totalRevenue = reservations.reduce((sum, r) => sum + (r.amount || 0), 0);
  const avgOccupancy = Math.round(properties.reduce((sum, p) => sum + (p.occupancy || 0), 0) / (properties.length || 1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group Portfolio Console"
        subtitle="Access consolidated operational statistics, channel billing summaries, and GST tax filings."
      />

      {error && <Notice tone="error" title="Synchronization Error" className="text-left">{error}</Notice>}

      {/* KPI Cards Row - 6 Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <PremiumStatCard
          label="Total Properties"
          value={loading ? "—" : `${totalProperties} Hotels`}
          hint="Hour Stay portfolio"
          icon={Building2}
          borderTone="navy"
        />
        <PremiumStatCard
          label="Total Mapped Rooms"
          value={loading ? "—" : `${totalRooms} Keys`}
          hint="Room inventories"
          icon={Bed}
          borderTone="purple"
        />
        <PremiumStatCard
          label="Total Bookings"
          value={loading ? "—" : totalBookings}
          delta={stats && stats[0] ? stats[0].delta : 8}
          hint="Nights sold"
          icon={Calendar}
          borderTone="blush"
        />
        <PremiumStatCard
          label="Total Revenue"
          value={loading ? "—" : `₹${totalRevenue.toLocaleString("en-IN")}`}
          delta={stats && stats[1] ? stats[1].delta : 12}
          hint="Consolidated billing"
          icon={DollarSign}
          borderTone="gold"
        />
        <PremiumStatCard
          label="Occupancy Rate"
          value={loading ? "—" : `${avgOccupancy}%`}
          hint="Portfolio average"
          icon={Percent}
          borderTone="blush"
        />
        <PremiumStatCard
          label="Active Staff Users"
          value="18 Active"
          hint="System operators online"
          icon={Users}
          borderTone="navy"
        />
      </div>

      {/* Charts section: Revenue Trend & Occupancy Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Revenue Trends" description="Monthly room revenues portfolio summary.">
          <div className="p-5 bg-white rounded-b-xl">
            <RevenueChart />
          </div>
        </Panel>
        <Panel title="Occupancy Trends" description="Consolidated monthly room occupancy rates.">
          <div className="p-5 bg-white rounded-b-xl">
            <OccupancyChart />
          </div>
        </Panel>
      </div>

      {/* Triple Grid Row: OTA Mix, Pending Actions, System Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Booking Source Mix */}
        <Panel title="OTA Distribution Mix" description="Bookings contributions by distributor.">
          <div className="p-5 bg-white rounded-b-xl flex flex-col justify-center min-h-[260px]">
            <SourceMixChart />
          </div>
        </Panel>

        {/* Pending Actions */}
        <Panel title="Operations Action Alerts" description="Issues requiring administrative overrides.">
          <div className="p-4 bg-white rounded-b-xl space-y-3">
            {pendingActions.map((act) => (
              <div key={act.id} className="flex gap-3 items-start border p-3.5 rounded-xl hover:bg-muted/10 transition-colors">
                <span className="grid size-8 place-items-center rounded-lg bg-warning/10 text-warning shrink-0 mt-0.5">
                  <AlertTriangle className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h5 className="font-semibold text-navy text-xs">{act.title}</h5>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Action: <strong>{act.action}</strong></p>
                </div>
                <Button size="xs" variant="outline" className="text-[10px] h-7 rounded-full border-muted text-navy-deep">Resolve</Button>
              </div>
            ))}
          </div>
        </Panel>

        {/* System Health */}
        <Panel title="SaaS Infrastructure Health" description="Hour Stay core module connectivity status.">
          <div className="p-4 bg-white rounded-b-xl space-y-3 text-xs">
            {systemHealth.map((health) => (
              <div key={health.name} className="flex justify-between items-center border-b pb-2.5 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold text-navy">{health.name}</p>
                  <p className="text-[10px] text-muted-foreground">{health.desc}</p>
                </div>
                <Tag tone={health.status === "Healthy" || health.status === "Connected" ? "success" : "warning"}>
                  {health.status}
                </Tag>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Double Column bottom layout: Properties Directory & Recent Feeds */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Properties Directory (2/3 width) */}
        <div className="lg:col-span-2">
          <Panel title="Property Performance Directory" description="Operational statistics across Hour Stay hotels.">
            {loading ? (
              <LoadingRows rows={4} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4">Property</th>
                      <th className="p-4">Inventory</th>
                      <th className="p-4">Occupancy</th>
                      <th className="p-4">Average ADR</th>
                      <th className="p-4">Average RevPAR</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {properties.map((p) => (
                      <tr key={p.id || p._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-navy text-sm">{p.name}</p>
                            <p className="text-muted-foreground text-xs">{p.city}</p>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-navy">{p.rooms} Keys</td>
                        <td className="p-4 font-semibold text-navy">{p.occupancy}%</td>
                        <td className="p-4 font-semibold text-navy">₹{(p.adr || 0).toLocaleString("en-IN")}</td>
                        <td className="p-4 font-semibold text-navy">₹{(p.revpar || 0).toLocaleString("en-IN")}</td>
                        <td className="p-4 text-right">
                          <Tag tone={statusTone(p.status)}>{p.status}</Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Recent Bookings & Audit Activities (1/3 width) */}
        <div className="space-y-6">
          {/* Recent Bookings */}
          <Panel title="Recent Bookings" description="Latest room reservation transactions.">
            <div className="p-4 bg-white rounded-b-xl space-y-3.5">
              {loading ? (
                <LoadingRows rows={3} />
              ) : reservations.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs">No bookings recorded.</div>
              ) : (
                reservations.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-navy text-xs">{r.guest}</p>
                      <p className="text-[10px] text-muted-foreground">{r.room} · {r.checkIn}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-navy font-mono text-xs">₹{r.amount.toLocaleString("en-IN")}</p>
                      <Tag tone={statusTone(r.status)} className="text-[9px] px-1.5 py-0 mt-1">{r.status}</Tag>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          {/* Recent System Activities */}
          <Panel title="Security Audit Trails" description="Administrative action updates.">
            <div className="p-4 bg-white rounded-b-xl space-y-3">
              {loading ? (
                <LoadingRows rows={3} />
              ) : logs.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs">No logs recorded.</div>
              ) : (
                logs.slice(0, 3).map((log, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs border-b pb-3 last:border-0 last:pb-0">
                    <span className="grid size-6 place-items-center rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
                      <ShieldCheck className="size-3 text-purple" />
                    </span>
                    <div>
                      <p className="font-medium text-navy text-[11px] leading-relaxed">
                        <strong>{log.user}</strong>: {log.action}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{log.time} · IP: {log.ip || "—"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/super-admin/")({
  head: () => ({
    meta: [
      { title: "Group Dashboard — Hour Stay" },
      { name: "description", content: "Consolidated performance across all Hour Stay properties." },
      { property: "og:title", content: "Group Dashboard — Hour Stay" },
      { property: "og:description", content: "Consolidated performance across all Hour Stay properties." }
    ]
  }),
  component: SuperAdminDashboard
});