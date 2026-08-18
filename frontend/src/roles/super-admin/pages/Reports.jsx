import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
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
  X,
  Activity,
  CheckCircle,
  Clock
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";

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
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // View Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadCommissionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminService.getCommissionReports();
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load platform commission records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommissionData();
  }, []);

  const handleExportCSV = () => {
    setExporting(true);
    setTimeout(() => {
      alert("Platform commission ledger CSV compiled successfully! Initiating download...");
      setExporting(false);
    }, 1200);
  };

  // Safe dataset extractors
  const propertyReportsList = reportData ? reportData.propertyReports : [];
  const trendChartData = reportData ? reportData.trendChartData : [];
  const sourceChartData = reportData ? reportData.sourceChartData : [];
  const aggregates = reportData ? reportData.aggregates : {
    totalCommission: 0,
    commissionThisMonth: 0,
    commissionThisYear: 0,
    pendingCommission: 0,
    settledCommission: 0
  };

  // Filtered dataset
  const filteredData = propertyReportsList.filter((r) => {
    const matchesProperty = propertyFilter === "All" || r.propertyId === propertyFilter;
    const matchesStatus = statusFilter === "All" || r.settlementStatus === statusFilter;
    const matchesSearch = searchQuery === "" || 
      r.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.propertyId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProperty && matchesStatus && matchesSearch;
  });

  // Dynamic Chart Data: Property Contribution
  const propertyChartData = filteredData.map(p => ({
    name: p.propertyName,
    value: p.commissionAmount
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Analytics"
        subtitle="Review platform commission earnings, property-wise allocations, pending settlements, and OTA booking channel distributions."
      />

      {error && <Notice tone="error" title="Sync Failure" className="text-left">{error}</Notice>}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FinanceStatCard
          label="Total Platform Commission"
          value={`₹${aggregates.totalCommission.toLocaleString("en-IN")}`}
          hint="Gross platform commission"
          icon={IndianRupee}
          accentColor="#6366f1"
        />
        <FinanceStatCard
          label="Commission This Month"
          value={`₹${aggregates.commissionThisMonth.toLocaleString("en-IN")}`}
          hint="Earnings in active period"
          icon={Coins}
          accentColor="#a855f7"
        />
        <FinanceStatCard
          label="Settled Commission"
          value={`₹${aggregates.settledCommission.toLocaleString("en-IN")}`}
          hint="Successfully settled payouts"
          icon={CheckCircle}
          accentColor="#10b981"
        />
        <FinanceStatCard
          label="Pending Commission"
          value={`₹${aggregates.pendingCommission.toLocaleString("en-IN")}`}
          hint="Awaiting payout processing"
          icon={Clock}
          accentColor="#f43f5e"
        />
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search properties by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-full border-muted text-xs bg-cream/5"
            />
          </div>

          {/* Property Filter */}
          <div className="relative">
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[160px] cursor-pointer appearance-none"
            >
              <option value="All">All Properties</option>
              {propertyReportsList.map((p) => (
                <option key={p.propertyId} value={p.propertyId}>{p.propertyName}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[140px] cursor-pointer appearance-none"
            >
              <option value="All">All Statuses</option>
              <option value="Settled">Settled Only</option>
              <option value="Pending">Pending Only</option>
              <option value="No Activity">No Activity</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Charts Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Area Chart */}
        <Panel title="Commission Earnings Trend" description="Month-over-month platform commissions trend (INR).">
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
                <YAxis {...chartAxisStyle} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Commission"]} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#trendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Property Contribution Bar Chart */}
        <Panel title="Commission by Property" description="Operating contribution breakdown per property node.">
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
                  <XAxis dataKey="name" {...chartAxisStyle} tickFormatter={(t) => t.split(" ")[2] || t.split(" ")[0]} />
                  <YAxis {...chartAxisStyle} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Net Commission"]} />
                  <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2.5} fill="url(#propGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        {/* Source Mix Pie Chart */}
        <Panel title="Booking Share by Channel Source" description="Portfolio bookings distribution mix by source.">
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
      <Panel title="Property Commissions Ledger" description={`Displaying ${filteredData.length} property commission statements`}>
        {loading ? (
          <LoadingRows rows={4} />
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No property commission statement records found matching filters.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[1100px] table-fixed">
              <thead>
                <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                  <th className="p-4 text-left w-[18%]">Property</th>
                  <th className="p-4 text-left w-[10%]">Bookings Count</th>
                  <th className="p-4 text-left w-[10%]">Commission Rate</th>
                  <th className="p-4 text-left w-[12%]">Total Commission</th>
                  <th className="p-4 text-left w-[12%]">Pending Amount</th>
                  <th className="p-4 text-left w-[12%]">Settled Amount</th>
                  <th className="p-4 text-left w-[12%]">Status</th>
                  <th className="p-4 text-left w-[10%]">Settlement Date</th>
                  <th className="p-4 text-left w-[6%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-sans">
                {filteredData.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 text-left font-semibold text-navy truncate" title={r.propertyName}>
                      <div className="flex items-center gap-1.5 truncate">
                        <Building className="size-3.5 text-purple shrink-0" />
                        <span className="truncate">{r.propertyName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-left text-muted-foreground font-semibold font-mono">{r.bookingCount} Stays</td>
                    <td className="p-4 text-left font-medium text-navy font-mono">{r.commissionRate}%</td>
                    <td className="p-4 text-left font-bold text-purple font-mono">₹{r.commissionAmount.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-left text-warning font-mono">₹{r.pendingAmount.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-left text-success font-mono">₹{r.settledAmount.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-left">
                      <Tag tone={r.settlementStatus === "Settled" ? "success" : r.settlementStatus === "Pending" ? "warning" : "neutral"}>
                        {r.settlementStatus}
                      </Tag>
                    </td>
                    <td className="p-4 text-left text-muted-foreground font-mono">{r.settlementDate}</td>
                    <td className="p-4 text-left">
                      <div className="flex justify-start items-center">
                        <button
                          onClick={() => { setSelectedRecord(r); setModalOpen(true); }}
                          className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer flex items-center justify-center h-7 w-7"
                          title="View commission statement details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <span>Commission Statement</span>
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
                <p className="text-[10px] text-muted-foreground font-semibold">Total Transactions: {selectedRecord.bookingCount} Stays</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground font-medium">Commission Rate:</span>
                  <strong className="text-navy font-mono">{selectedRecord.commissionRate}%</strong>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground font-medium">Pending Commission:</span>
                  <strong className="text-warning font-mono">₹{selectedRecord.pendingAmount.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dashed pb-2">
                  <span className="text-muted-foreground font-medium">Settled Commission:</span>
                  <strong className="text-success font-mono">₹{selectedRecord.settledAmount.toLocaleString("en-IN")}</strong>
                </div>

                <div className="flex justify-between items-center py-1 pt-2 font-bold text-navy">
                  <span>Gross Commission Amount:</span>
                  <span className="font-mono text-purple">₹{selectedRecord.commissionAmount.toLocaleString("en-IN")}</span>
                </div>

                <div className="border-t border-muted my-3" />

                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground font-medium">Settlement Status:</span>
                  <Tag tone={selectedRecord.settlementStatus === "Settled" ? "success" : selectedRecord.settlementStatus === "Pending" ? "warning" : "neutral"}>
                    {selectedRecord.settlementStatus}
                  </Tag>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground font-medium">Latest Settlement Date:</span>
                  <strong className="text-navy font-mono">{selectedRecord.settlementDate}</strong>
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
      { name: "description", content: "Platform commission statements, property settlement reports, and channel aggregates." }
    ]
  }),
  component: SuperAdminReports
});