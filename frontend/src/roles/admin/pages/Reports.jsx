import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import {
  Download,
  Building,
  Coins,
  IndianRupee,
  Receipt,
  Percent,
  TrendingUp,
  Search,
  Calendar,
  Users,
  MessageSquare,
  AlertTriangle
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Property Reports — Speshway Luxury Hotel" },
      { name: "description", content: "Property-level ADR, RevPAR, GST logs, and booking metrics." }
    ]
  }),
  component: AdminReportsPage
});

const pieColors = ["#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#eab308", "#10b981"];

const chartAxisStyle = {
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
    fontSize: 11,
    color: "#0f172a"
  }
};

function FinanceStatCard({ label, value, hint, icon: Icon, accentColor = "#0f172a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight truncate" title={label}>{label}</p>
          <h4 className="mt-2.5 font-display text-sm font-black text-navy leading-none whitespace-nowrap">{value}</h4>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-3.5 text-[9px] text-muted-foreground truncate">{hint}</p>
      )}
    </div>
  );
}

function AdminReportsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState("30"); // 'Today' | '7' | '30' | 'Month' | 'Custom'
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const res = await superAdminService.getReservations();
      setReservations(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to sync reporting database");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = (format) => {
    setExporting(true);
    setTimeout(() => {
      alert(`${format.toUpperCase()} report compiled and generated successfully! Initiating download...`);
      setExporting(false);
    }, 1200);
  };

  // Date filtering logic on reservations
  const filteredReservations = reservations.filter((r) => {
    if (!r.checkIn) return false;
    
    // Parse checkIn date
    const checkInDate = new Date(r.checkIn);
    const today = new Date("2026-08-17"); // Anchor to system seeded timeline date

    if (dateFilter === "Today") {
      return r.checkIn === "2026-08-17" || r.checkIn === "2026-08-18";
    }

    if (dateFilter === "7") {
      const diffTime = Math.abs(today - checkInDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }

    if (dateFilter === "30") {
      const diffTime = Math.abs(today - checkInDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }

    if (dateFilter === "Month") {
      return checkInDate.getMonth() === today.getMonth() && checkInDate.getFullYear() === today.getFullYear();
    }

    if (dateFilter === "Custom" && customStart && customEnd) {
      return r.checkIn >= customStart && r.checkIn <= customEnd;
    }

    return true;
  });

  // Dynamic PMS Metrics Aggregation
  const totalBookings = filteredReservations.length;
  const roomRevenue = filteredReservations.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalBalance = filteredReservations.reduce((acc, curr) => acc + (curr.balance || 0), 0);
  const gstCollected = Math.round(roomRevenue * 0.18);
  const cancellations = filteredReservations.filter(r => r.status === "Cancelled").length;
  const inHouse = filteredReservations.filter(r => r.status === "Checked-in").length;

  // ADR & RevPAR Calculations
  const occupiedRooms = Math.max(1, inHouse);
  const totalAvailableRooms = 120; // Simulated capacity
  const adr = Math.round(roomRevenue / Math.max(1, filteredReservations.filter(r => r.status !== "Cancelled").length));
  const revpar = Math.round(roomRevenue / totalAvailableRooms);
  const occupancyPercentage = Math.round((occupiedRooms / totalAvailableRooms) * 100);

  // Group by Booking Source splits for Pie Chart
  const sourceGroup = {};
  filteredReservations.forEach((r) => {
    const src = r.source || "Direct";
    sourceGroup[src] = (sourceGroup[src] || 0) + 1;
  });
  const sourceChartData = Object.entries(sourceGroup).map(([name, value]) => ({
    name,
    value
  }));

  // Room Category Performance
  const categoryGroup = {};
  filteredReservations.forEach((r) => {
    let cat = "Superior Deluxe";
    if (r.room?.startsWith("3")) cat = "Maharaja Suite";
    else if (r.room?.startsWith("2")) cat = "Garden Pool Villa";
    else if (r.room?.startsWith("1")) cat = "Heritage Luxury";
    
    if (!categoryGroup[cat]) {
      categoryGroup[cat] = { revenue: 0, count: 0 };
    }
    categoryGroup[cat].revenue += r.amount || 0;
    categoryGroup[cat].count += 1;
  });
  const categoryChartData = Object.entries(categoryGroup).map(([name, info]) => ({
    name,
    revenue: info.revenue,
    bookings: info.count
  }));

  // Guest unique statistics
  const uniqueGuests = new Set(filteredReservations.map(r => r.guest)).size;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {error && <Notice tone="error" title="Report Sync Failure">{error}</Notice>}

      {/* Date Filter Panel Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 select-none">
          <div className="flex gap-1 bg-muted/30 p-1 rounded-full border border-muted/50">
            {[
              { label: "Today", key: "Today" },
              { label: "Last 7 Days", key: "7" },
              { label: "Last 30 Days", key: "30" },
              { label: "This Month", key: "Month" },
              { label: "Custom Range", key: "Custom" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDateFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  dateFilter === tab.key
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:text-navy hover:bg-white/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleExport("pdf")}
              disabled={exporting}
              className="bg-navy hover:bg-navy-deep text-white rounded-full px-4 gap-1 text-[10px] font-semibold h-8"
            >
              <Download className="size-3.5" /> PDF
            </Button>
            <Button
              onClick={() => handleExport("csv")}
              disabled={exporting}
              className="bg-navy hover:bg-navy-deep text-white rounded-full px-4 gap-1 text-[10px] font-semibold h-8"
            >
              <Download className="size-3.5" /> CSV
            </Button>
          </div>
        </div>

        {dateFilter === "Custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Start</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 border border-muted rounded text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">End</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 border border-muted rounded text-xs"
              />
            </div>
            <Button onClick={loadData} className="bg-brand hover:bg-brand/90 text-white text-xs h-7 px-3">Apply Range</Button>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        <>
          {/* Metrics stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FinanceStatCard
              label="Room Revenue"
              value={`₹${roomRevenue.toLocaleString()}`}
              hint="Sum of all checks in active window"
              icon={IndianRupee}
              accentColor="#6366f1"
            />
            <FinanceStatCard
              label="RevPAR"
              value={`₹${revpar.toLocaleString()}`}
              hint="Revenue per available room"
              icon={Coins}
              accentColor="#a855f7"
            />
            <FinanceStatCard
              label="Average Daily Rate (ADR)"
              value={`₹${adr.toLocaleString()}`}
              hint="Average rate per check-in"
              icon={Percent}
              accentColor="#ec4899"
            />
            <FinanceStatCard
              label="GST Tax Liability"
              value={`₹${gstCollected.toLocaleString()}`}
              hint="CGST & SGST @ 18% slab"
              icon={Receipt}
              accentColor="#10b981"
            />
          </div>

          {/* Graphics Split Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Room Type performance */}
            <Panel title="Room Category Performance" description="Bookings and revenue share breakdown by category" className="lg:col-span-2">
              <div className="p-4 bg-white rounded-b-xl min-h-[300px]">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" {...chartAxisStyle} />
                    <YAxis {...chartAxisStyle} />
                    <Tooltip {...tooltipStyle} formatter={(val) => `₹${val.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Booking source split */}
            <Panel title="Distribution Channels" description="Reservations count grouping by direct vs OTA sources">
              <div className="p-4 bg-white rounded-b-xl min-h-[300px] flex flex-col justify-between">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceChartData.length > 0 ? sourceChartData : [{ name: "Direct", value: 1 }]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sourceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-1.5 pt-2 border-t border-muted">
                  {sourceChartData.map((d, i) => (
                    <div key={d.name} className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 text-navy font-semibold">
                        <span className="size-2 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                        {d.name}
                      </span>
                      <span className="font-bold text-navy-deep">{d.value} Bookings</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

          </div>

          {/* Details Table Log */}
          <Panel title="Audit Performance Details" description={`Displaying operational logs for ${totalBookings} check-in entries.`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                    <th className="py-3 px-4">Period / Date</th>
                    <th className="py-3 px-4">Room Type Class</th>
                    <th className="py-3 px-4 text-center">Bookings Count</th>
                    <th className="py-3 px-4 text-right">Base Revenue</th>
                    <th className="py-3 px-4 text-right">Tax Log</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted text-xs text-[#2a2a2a]">
                  {categoryChartData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#fcfcfc]/60">
                      <td className="py-3.5 px-4 font-semibold text-navy">August 2026</td>
                      <td className="py-3.5 px-4 font-medium">{item.name}</td>
                      <td className="py-3.5 px-4 text-center font-bold">{item.bookings}</td>
                      <td className="py-3.5 px-4 text-right font-bold">₹{item.revenue.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right">₹{Math.round(item.revenue * 0.18).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="rounded-full bg-success/10 text-success border border-success/20 px-2 py-0.5 font-bold uppercase tracking-wider text-[8px]">
                          Audited
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}