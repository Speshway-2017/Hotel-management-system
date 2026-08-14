import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";
import {
  Download,
  Building,
  ChevronDown,
  Coins,
  IndianRupee,
  Receipt,
  Percent,
  TrendingDown,
  TrendingUp,
  Search,
  Eye,
  X
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

// Mock Revenue Ledger Data
const initialRevenueData = [
  { id: "REV-JAI-01", propertyId: "HS-JAI", propertyName: "Rambagh Residency", city: "Jaipur", period: "August 2026", roomRevenue: 2850000, otherRevenue: 650000, tax: 630000, discounts: 180000, refunds: 45000 },
  { id: "REV-JAI-02", propertyId: "HS-JAI", propertyName: "Rambagh Residency", city: "Jaipur", period: "July 2026", roomRevenue: 2600000, otherRevenue: 580000, tax: 572400, discounts: 150000, refunds: 30000 },
  { id: "REV-UDA-01", propertyId: "HS-UDA", propertyName: "Lake Palace View", city: "Udaipur", period: "August 2026", roomRevenue: 3420000, otherRevenue: 850000, tax: 768600, discounts: 220000, refunds: 60000 },
  { id: "REV-UDA-02", propertyId: "HS-UDA", propertyName: "Lake Palace View", city: "Udaipur", period: "July 2026", roomRevenue: 3100000, otherRevenue: 790000, tax: 700200, discounts: 190000, refunds: 50000 },
  { id: "REV-GOA-01", propertyId: "HS-GOA", propertyName: "Candolim Beach Resort", city: "Goa", period: "August 2026", roomRevenue: 1950000, otherRevenue: 420000, tax: 426600, discounts: 110000, refunds: 25000 },
  { id: "REV-GOA-02", propertyId: "HS-GOA", propertyName: "Candolim Beach Resort", city: "Goa", period: "July 2026", roomRevenue: 1800000, otherRevenue: 380000, tax: 392400, discounts: 95000, refunds: 15000 },
  { id: "REV-KER-01", propertyId: "HS-KER", propertyName: "Backwater Retreat", city: "Alleppey", period: "August 2026", roomRevenue: 980000, otherRevenue: 210000, tax: 214200, discounts: 65000, refunds: 12000 },
  { id: "REV-KER-02", propertyId: "HS-KER", propertyName: "Backwater Retreat", city: "Alleppey", period: "July 2026", roomRevenue: 920000, otherRevenue: 180000, tax: 198000, discounts: 50000, refunds: 8000 }
];

// Recharts Axis Style Helper
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

const pieColors = ["#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#eab308", "#10b981"];

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

function SuperAdminReports() {
  const [revenueData, setRevenueData] = useState(initialRevenueData);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [revTypeFilter, setRevTypeFilter] = useState("All");

  // View Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminService.getProperties();
      if (res.success) {
        setProperties(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to sync finance console");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleExportCSV = () => {
    setExporting(true);
    setTimeout(() => {
      alert("CSV spreadsheet compile completed successfully! Initiating download...");
      setExporting(false);
    }, 1200);
  };

  // Filtered dataset
  const filteredData = revenueData.filter((r) => {
    const matchesProperty = propertyFilter === "All" || r.propertyId === propertyFilter;
    const matchesDate = dateFilter === "All" || r.period === dateFilter;
    return matchesProperty && matchesDate;
  });

  // KPI Calculations
  const calculations = filteredData.reduce(
    (acc, curr) => {
      const isRoom = revTypeFilter === "All" || revTypeFilter === "Room";
      const isPos = revTypeFilter === "All" || revTypeFilter === "POS";
      const isTax = revTypeFilter === "All" || revTypeFilter === "Tax";

      const roomVal = isRoom ? curr.roomRevenue : 0;
      const posVal = isPos ? curr.otherRevenue : 0;
      const taxVal = isTax ? curr.tax : 0;

      acc.room += curr.roomRevenue;
      acc.pos += curr.otherRevenue;
      acc.tax += curr.tax;
      acc.discounts += curr.discounts;
      acc.refunds += curr.refunds;

      acc.total += roomVal + posVal + taxVal;
      return acc;
    },
    { total: 0, room: 0, pos: 0, tax: 0, discounts: 0, refunds: 0 }
  );

  const netRevenue = calculations.total - calculations.discounts - calculations.refunds;

  // Chart Data: Trend (May, June, July, August)
  const trendChartData = [
    { name: "May", Room: 6500000, POS: 1500000, Tax: 1400000, Net: 7800000 },
    { name: "June", Room: 7200000, POS: 1700000, Tax: 1600000, Net: 8700000 },
    { name: "July", Room: 8420000, POS: 1930000, Tax: 1860000, Net: 10100000 },
    { name: "August", Room: 9200000, POS: 2130000, Tax: 2030000, Net: 11025000 }
  ].map(d => {
    // Dynamically adjust trends based on active filters
    let value = d.Net;
    if (revTypeFilter === "Room") value = d.Room;
    else if (revTypeFilter === "POS") value = d.POS;
    else if (revTypeFilter === "Tax") value = d.Tax;
    return { name: d.name, value };
  });

  // Chart Data: Property Contribution
  const propertyChartData = Object.values(
    filteredData.reduce((acc, curr) => {
      const isRoom = revTypeFilter === "All" || revTypeFilter === "Room";
      const isPos = revTypeFilter === "All" || revTypeFilter === "POS";
      const isTax = revTypeFilter === "All" || revTypeFilter === "Tax";

      const val = (isRoom ? curr.roomRevenue : 0) + (isPos ? curr.otherRevenue : 0) + (isTax ? curr.tax : 0);
      const net = val - curr.discounts - curr.refunds;

      if (!acc[curr.propertyName]) {
        acc[curr.propertyName] = { name: curr.propertyName, value: 0 };
      }
      acc[curr.propertyName].value += net;
      return acc;
    }, {})
  );

  // Chart Data: Booking Source distribution
  const sourceChartData = [
    { name: "Direct Booking", value: 35 },
    { name: "MakeMyTrip", value: 25 },
    { name: "Booking.com", value: 20 },
    { name: "Goibibo", value: 10 },
    { name: "Agoda", value: 6 },
    { name: "Walk-in Desk", value: 4 }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Analytics"
        subtitle="Review consolidated revenue reports, room folios, dynamic taxes, POS distributions, and net profitability indices."
        actions={
          <Button onClick={handleExportCSV} disabled={exporting} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 gap-2 cursor-pointer">
            <Download className="size-4" /> {exporting ? "Compiling..." : "Export Excel Ledger"}
          </Button>
        }
      />

      {error && <Notice tone="error" title="Sync Failure" className="text-left">{error}</Notice>}

      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Property Filter */}
          <div className="relative">
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[160px] cursor-pointer appearance-none"
            >
              <option value="All">All Properties</option>
              {properties.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[140px] cursor-pointer appearance-none"
            >
              <option value="All">All Periods</option>
              <option value="August 2026">August 2026</option>
              <option value="July 2026">July 2026</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Revenue Type Filter */}
          <div className="relative">
            <select
              value={revTypeFilter}
              onChange={(e) => setRevTypeFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[170px] cursor-pointer appearance-none"
            >
              <option value="All">All Revenue Streams</option>
              <option value="Room">Room Revenue Only</option>
              <option value="POS">POS/Service Revenue Only</option>
              <option value="Tax">Tax Stream Only</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* /kpi stats grid */}
      {/* KPI Stats Grid - 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FinanceStatCard
          label="Total Revenue"
          value={`₹${calculations.total.toLocaleString("en-IN")}`}
          hint="Gross operations value"
          icon={IndianRupee}
          accentColor="#6366f1"
        />
        <FinanceStatCard
          label="Room Revenue"
          value={`₹${calculations.room.toLocaleString("en-IN")}`}
          hint="Net keys tariff"
          icon={Building}
          accentColor="#a855f7"
        />
        <FinanceStatCard
          label="POS/Services"
          value={`₹${calculations.pos.toLocaleString("en-IN")}`}
          hint="Food, beverages, spas"
          icon={Coins}
          accentColor="#ec4899"
        />
        <FinanceStatCard
          label="Net Revenue"
          value={`₹${netRevenue.toLocaleString("en-IN")}`}
          hint="Operating gross yield"
          icon={TrendingUp}
          accentColor="#0f172a"
        />
      </div>

      {/* Charts Layout: Trend, Properties, Source Mix */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Area Chart */}
        <Panel title="Consolidated Revenue Trend" description="Month-over-month operating revenue trend graph (Lakhs).">
          <div className="h-[250px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" {...chartAxisStyle} />
                <YAxis {...chartAxisStyle} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`₹${(v / 100000).toFixed(2)} Lakhs`, "Value"]} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#trendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Property Contribution Bar Chart */}
        <Panel title="Revenue by Property" description="Operating contribution breakdown per property destination.">
          <div className="h-[250px] w-full pt-4">
            {propertyChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No records available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={propertyChartData} margin={{ top: 8, right: 18, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" {...chartAxisStyle} tickFormatter={(t) => t.split(" ")[0]} />
                  <YAxis {...chartAxisStyle} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Net Contribution"]} />
                  <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2.5} fill="url(#propGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        {/* Source Mix Pie Chart */}
        <Panel title="Revenue Share by Booking Source" description="Portfolio distribution share by channels.">
          <div className="flex flex-col items-center gap-4 p-2">
            <div className="w-full h-[160px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="88%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {sourceChartData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Booking Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-2 text-xs flex flex-col justify-center">
              {sourceChartData.map((s, i) => (
                <li key={s.name} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: pieColors[i % pieColors.length] }}
                    />
                    <span className="truncate text-navy font-semibold text-[11px]">{s.name}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums font-mono text-[11px]">{s.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      {/* Main Ledger Table */}
      <Panel title="Consolidated Revenue Ledger" description={`Displaying ${filteredData.length} monthly financial logs`}>
        {loading ? (
          <LoadingRows rows={4} />
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No financial logs found matching filters.</div>
        ) : (
          <div className="w-full overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px] table-fixed">
              <thead>
                <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                  <th className="p-4 w-[18%] text-left">Property</th>
                  <th className="p-4 w-[8%] text-left">Period</th>
                  <th className="p-4 w-[11%] text-left">Room Revenue</th>
                  <th className="p-4 w-[11%] text-left">Other Revenue</th>
                  <th className="p-4 w-[9%] text-left">Tax</th>
                  <th className="p-4 w-[9%] text-left">Discounts</th>
                  <th className="p-4 w-[9%] text-left">Refunds</th>
                  <th className="p-4 w-[11%] text-left">Net Revenue</th>
                  <th className="p-4 w-[14%] text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-sans">
                {filteredData.map((r) => {
                  const net = r.roomRevenue + r.otherRevenue + r.tax - r.discounts - r.refunds;
                  return (
                    <tr key={r.id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4 w-[18%] text-left font-semibold text-navy truncate" title={r.propertyName}>
                        <div className="flex items-center gap-1.5 truncate">
                          <Building className="size-3.5 text-purple shrink-0" />
                          <span className="truncate">{r.propertyName}</span>
                        </div>
                      </td>
                      <td className="p-4 w-[8%] text-left text-muted-foreground whitespace-nowrap">{r.period}</td>
                      <td className="p-4 w-[11%] text-left font-semibold text-navy font-mono">₹{r.roomRevenue.toLocaleString("en-IN")}</td>
                      <td className="p-4 w-[11%] text-left font-medium text-navy font-mono">₹{r.otherRevenue.toLocaleString("en-IN")}</td>
                      <td className="p-4 w-[9%] text-left text-muted-foreground font-mono">₹{r.tax.toLocaleString("en-IN")}</td>
                      <td className="p-4 w-[9%] text-left text-warning font-mono">₹{r.discounts.toLocaleString("en-IN")}</td>
                      <td className="p-4 w-[9%] text-left text-warning font-mono">₹{r.refunds.toLocaleString("en-IN")}</td>
                      <td className="p-4 w-[11%] text-left font-bold text-purple font-mono">₹{net.toLocaleString("en-IN")}</td>
                      <td className="p-4 w-[14%] text-left">
                        <div className="flex justify-start items-center">
                          <button
                            onClick={() => { setSelectedRecord(r); setModalOpen(true); }}
                            className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer flex items-center justify-center h-7 w-7"
                            title="View statement details"
                          >
                            <Eye className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Panel>

      {/* Details Overview Modal */}
      {modalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/5 backdrop-blur-sm flex justify-center items-start py-8 sm:py-16 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.15)] relative border border-muted my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy flex items-center gap-2">
                <Receipt className="size-5 text-purple" />
                <span>Financial Statement Details</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-left text-xs leading-relaxed">
              <div className="bg-muted/20 p-3 rounded-xl border border-muted/30">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Statement reference ID</span>
                <p className="text-sm font-bold text-navy mt-0.5">{selectedRecord.id}</p>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">Property: {selectedRecord.propertyName} ({selectedRecord.city})</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Period: {selectedRecord.period}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground font-medium">Room Revenue:</span>
                  <strong className="text-navy font-mono">₹{selectedRecord.roomRevenue.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground font-medium">Other Revenue (POS/Services):</span>
                  <strong className="text-navy font-mono">₹{selectedRecord.otherRevenue.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dashed pb-2">
                  <span className="text-muted-foreground font-medium">Tax Collected (GST):</span>
                  <strong className="text-navy font-mono">₹{selectedRecord.tax.toLocaleString("en-IN")}</strong>
                </div>

                <div className="flex justify-between items-center py-1 pt-2 font-bold text-navy">
                  <span>Gross Billings Total:</span>
                  <span className="font-mono">₹{(selectedRecord.roomRevenue + selectedRecord.otherRevenue + selectedRecord.tax).toLocaleString("en-IN")}</span>
                </div>

                <div className="border-t border-muted my-3" />

                <div className="flex justify-between items-center py-1 text-warning">
                  <span>Discounts Applied:</span>
                  <span className="font-mono">- ₹{selectedRecord.discounts.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center py-1 text-warning border-b border-dashed pb-2">
                  <span>Refunds Disbursed:</span>
                  <span className="font-mono">- ₹{selectedRecord.refunds.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between items-center py-2 pt-3 text-sm font-black text-purple">
                  <span>NET OPERATING REVENUE:</span>
                  <span className="font-mono text-base">
                    ₹{(selectedRecord.roomRevenue + selectedRecord.otherRevenue + selectedRecord.tax - selectedRecord.discounts - selectedRecord.refunds).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-muted mt-4">
              <Button onClick={() => setModalOpen(false)} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs cursor-pointer">Close Panel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/reports")({
  head: () => ({
    meta: [
      { title: "Revenue Reports — Hour Stay" },
      { name: "description", content: "Consolidated revenue ledger statements, taxes, and net profitability breakdowns." }
    ]
  }),
  component: SuperAdminReports
});