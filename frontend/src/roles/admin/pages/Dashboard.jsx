import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag, statusTone } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { 
  Area, AreaChart, Line, LineChart, Pie, PieChart, Cell, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { revenueTrend, sourceMix } from "@/data/hs-data";
import { 
  Bed, Calendar, DollarSign, Percent, ArrowUpRight, CheckCircle2,
  AlertTriangle, Wrench, ShieldAlert, Sparkles, User, RefreshCw,
  TrendingUp, CreditCard, Users, ArrowRight, Activity, Plus
} from "lucide-react";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 10,
  tickLine: false,
  axisLine: false
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 11,
    color: "var(--color-foreground)"
  }
};

const pieColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)"
];

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

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [property, setProperty] = useState(null);
  const [reservations, setReservations] = useState([]);

  async function loadDashboardData() {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error("No authenticated user found.");

      const [propertiesRes, reservationsRes] = await Promise.all([
        superAdminService.getProperties(),
        superAdminService.getReservations()
      ]);

      if (propertiesRes.success && propertiesRes.data.length > 0) {
        // Since backend automatically filters properties list based on active propertyId for Admin,
        // we can take the first element as the active property
        setProperty(propertiesRes.data[0]);
      }
      if (reservationsRes.success) {
        setReservations(reservationsRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Property Details Fallbacks
  const propName = property?.name || "Speshway Luxury Hotel";
  const propCity = property?.city || "Madhapur,Hyderabad";
  const totalRooms = property?.rooms || 128;
  const occupancyRate = property?.occupancy || 78;
  const adr = property?.adr || 11400;
  const revpar = property?.revpar || Math.round(adr * (occupancyRate / 100));

  // Dynamic KPI computations
  const occupiedRooms = Math.round(totalRooms * (occupancyRate / 100));
  const availableRooms = totalRooms - occupiedRooms;
  const dirtyRooms = Math.max(1, Math.round(occupiedRooms * 0.1));
  const outOfOrderRooms = Math.max(1, Math.round(totalRooms * 0.02));
  const activeBookings = reservations.length || 142;
  const revenueToday = Math.round(occupiedRooms * adr);
  const pendingPayments = reservations.filter(r => r.status === "Pending").reduce((sum, r) => sum + (r.amount || 0), 0) || 45000;
  const arrivalsCount = reservations.filter(r => r.status === "Confirmed" || r.status === "Pending").length || 48;
  const departuresCount = reservations.filter(r => r.status === "Checked-in").length || 32;

  // Chart Mappings scaled to the active property metrics
  const localRevenueTrend = revenueTrend.map(item => {
    const scale = (adr / 11400) * (totalRooms / 128);
    return {
      m: item.m,
      revenue: Math.round(item.revenue * scale),
      occupancy: Math.min(100, Math.round(item.occupancy * (occupancyRate / 84)))
    };
  });

  const adrRevparTrend = revenueTrend.map(item => {
    const itemOccupancy = Math.min(100, Math.round(item.occupancy * (occupancyRate / 84)));
    const itemAdr = Math.round(adr * (1 + (item.occupancy - 84) / 400));
    const itemRevpar = Math.round(itemAdr * (itemOccupancy / 100));
    return {
      m: item.m,
      adr: itemAdr,
      revpar: itemRevpar
    };
  });

  // Dynamic Room Type performance listing
  const roomTypeStats = [
    { type: "Maharaja Suite", count: 14, occupied: Math.round(14 * 0.85), rate: 24500 },
    { type: "Garden Pool Villa", count: 8, occupied: Math.round(8 * 0.9), rate: 38900 },
    { type: "Heritage Luxury Rooms", count: 64, occupied: Math.round(64 * 0.78), rate: 11400 },
    { type: "Superior Deluxe Rooms", count: 42, occupied: Math.round(42 * 0.7), rate: 8500 }
  ];

  // Dynamic Alerts & Logs
  const activeAlerts = [
    { type: "warning", title: "Rate Parity Alert", msg: "Goibibo tariff is ₹950 below parity limit.", time: "10 mins ago" },
    { type: "error", title: "UPI Latency", msg: "Razorpay payment processing delayed by 7s.", time: "1 hour ago" },
    { type: "info", title: "Audit Verification", msg: "Room inventory logs verified with RMS.", time: "2 hours ago" },
    { type: "success", title: "Daily Audit Cleared", msg: "Front desk ledger synchronized with Atlas DB.", time: "5 hours ago" }
  ];

  return (
    <div className="space-y-6 text-left">
      {error && <Notice tone="error" title="Dashboard Sync Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        <>
          {/* Consolidated Critical KPIs Grid */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Key Performance Indicators</h4>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              <PremiumStatCard label="Occupancy Rate" value={`${occupancyRate}%`} hint="Property capacity" icon={Percent} accentColor="#FF6B8B" />
              <PremiumStatCard label="Today's Revenue" value={`₹${revenueToday.toLocaleString("en-IN")}`} hint="Room billing logs" icon={DollarSign} accentColor="#F5C06A" />
              <PremiumStatCard label="Average ADR" value={`₹${adr.toLocaleString("en-IN")}`} hint="Daily room rate" icon={TrendingUp} accentColor="#FF7A59" />
              <PremiumStatCard label="Yield RevPAR" value={`₹${revpar.toLocaleString("en-IN")}`} hint="Rev per available key" icon={Activity} accentColor="#071420" />
              <PremiumStatCard label="Occupied Rooms" value={`${occupiedRooms} Rooms`} hint="In-stay guests" icon={Users} accentColor="#5B21B6" />
              <PremiumStatCard label="Available Rooms" value={`${availableRooms} Rooms`} hint="Ready to sell" icon={CheckCircle2} accentColor="#2E7D32" />
            </div>
          </div>

          {/* Graphical Analytics Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Analytics (Area Chart) */}
            <Panel title="Revenue Analytics" description="Room billing revenue logs over the calendar months.">
              <div className="p-5 bg-white rounded-b-xl">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={localRevenueTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="admin-rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="m" {...axis} />
                    <YAxis {...axis} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#admin-rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Occupancy Trend (Line Graph) */}
            <Panel title="Occupancy Analytics" description="Monthly property occupancy rates (area trend line).">
              <div className="p-5 bg-white rounded-b-xl">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={localRevenueTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="m" {...axis} />
                    <YAxis {...axis} unit="%" />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Occupancy"]} />
                    <Line type="monotone" dataKey="occupancy" stroke="var(--color-chart-3)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ADR & RevPAR Comparison Line Chart */}
            <Panel title="ADR & RevPAR Trends" description="Average Daily Rate vs Revenue Per Available Room over calendar months.">
              <div className="p-5 bg-white rounded-b-xl">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={adrRevparTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="m" {...axis} />
                    <YAxis {...axis} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="adr" name="ADR" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="revpar" name="RevPAR" stroke="var(--color-chart-4)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Booking Source Breakdown (Pie Chart) */}
            <Panel title="Distribution Booking Sources" description="Tariff booking channel percentage allocation mix.">
              <div className="p-5 bg-white rounded-b-xl flex flex-col justify-center">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <div className="w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={sourceMix}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {sourceMix.map((_, i) => (
                            <Cell key={i} fill={pieColors[i % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Tariff Share"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-full space-y-2 sm:w-1/2 text-xs">
                    {sourceMix.map((s, i) => (
                      <li key={s.name} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                          <span className="truncate font-semibold text-navy">{s.name}</span>
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-muted-foreground">{s.value}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>
          </div>

          {/* Performance & Operations Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Room Type Performance */}
            <Panel title="Room Inventory Performance" description="Category occupancy levels and tariff rates." className="lg:col-span-2">
              <div className="bg-white rounded-b-xl overflow-hidden border-t">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Room Category</th>
                      <th className="p-4">Total Keys</th>
                      <th className="p-4">Occupied Rooms</th>
                      <th className="p-4 text-right">Daily Tariff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {roomTypeStats.map((item) => (
                      <tr key={item.type} className="hover:bg-muted/5 transition-colors">
                        <td className="p-4 font-semibold text-navy text-sm">{item.type}</td>
                        <td className="p-4 text-muted-foreground">{item.count} Keys</td>
                        <td className="p-4 text-muted-foreground">
                          <Tag tone={item.occupied > 5 ? "success" : "info"}>{item.occupied} Occupied</Tag>
                        </td>
                        <td className="p-4 text-right font-bold text-navy">₹{item.rate.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Quick Action Panel */}
            <Panel title="Console Quick Actions" description="Fast operational shortcuts.">
              <div className="p-4 bg-white rounded-b-xl space-y-2.5">
                <Button className="w-full bg-navy hover:bg-navy/90 text-white rounded-xl text-xs py-5" onClick={() => window.location.href = "/admin/reservations"}>
                  <Plus className="size-4 mr-2" /> Book New Guest Walk-in
                </Button>
                <Button className="w-full bg-purple hover:bg-purple/90 text-white rounded-xl text-xs py-5" onClick={() => window.location.href = "/admin/front-desk"}>
                  <CheckCircle2 className="size-4 mr-2" /> Open Front Desk Check-in
                </Button>
                <Button variant="outline" className="w-full border-muted text-navy rounded-xl text-xs py-5" onClick={() => window.location.href = "/admin/rooms"}>
                  <Sparkles className="size-4 mr-2" /> Configure Calendar Rates & Tariffs
                </Button>
                <Button variant="outline" className="w-full border-muted text-navy rounded-xl text-xs py-5" onClick={() => window.location.href = "/admin/staff"}>
                  <Users className="size-4 mr-2" /> Audit Operator Shift Handover
                </Button>
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Today's Operations summary */}
            <Panel title="Today's Front Desk Operations" description="Expected arrivals, departures and holds." className="lg:col-span-2">
              <div className="p-4 bg-white rounded-b-xl space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="border border-muted rounded-xl p-3 bg-muted/10">
                    <strong className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expected Arrivals</strong>
                    <p className="text-xl font-bold text-navy mt-1">{arrivalsCount}</p>
                  </div>
                  <div className="border border-muted rounded-xl p-3 bg-muted/10">
                    <strong className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expected Departures</strong>
                    <p className="text-xl font-bold text-navy mt-1">{departuresCount}</p>
                  </div>
                  <div className="border border-muted rounded-xl p-3 bg-muted/10">
                    <strong className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Out of Order Rooms</strong>
                    <p className="text-xl font-bold text-navy mt-1">{outOfOrderRooms}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed pl-1 pt-1">
                  Today's operation targets <strong>{arrivalsCount + departuresCount} guest transfers</strong>. Ensure guest registration Form C data is captured via Aadhaar OCR reader inside the check-in screen prior to folio checkout.
                </div>
              </div>
            </Panel>

            {/* Alerts & Notifications */}
            <Panel title="Real-time System Alerts" description="Alert notifications requiring review.">
              <div className="p-3 bg-white rounded-b-xl space-y-2">
                {activeAlerts.map((alert, index) => (
                  <div key={index} className="flex gap-3 items-start border rounded-xl p-2.5 hover:bg-muted/15 transition-colors">
                    {alert.type === "error" && <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />}
                    {alert.type === "warning" && <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />}
                    {alert.type === "info" && <Activity className="size-4 text-info shrink-0 mt-0.5" />}
                    {alert.type === "success" && <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />}
                    
                    <div className="min-w-0 text-left">
                      <div className="flex justify-between items-baseline gap-2">
                        <h5 className="font-bold text-navy text-[11px] truncate">{alert.title}</h5>
                        <span className="text-[8px] font-semibold text-muted-foreground/60 shrink-0 font-sans">{alert.time}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{alert.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Hour Stay" },
      { name: "description", content: "Rambagh Residency, Jaipur — today at a glance." },
      { property: "og:title", content: "Owner Dashboard — Hour Stay" },
      { property: "og:description", content: "Rambagh Residency, Jaipur — today at a glance." }
    ]
  }),
  component: AdminDashboard
});