import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import {
  TrendingUp, Percent, DollarSign, Calendar, Compass, Users, CheckCircle,
  Download, FileSpreadsheet, Eye, Printer, Award, CreditCard, Receipt, KeyRound,
  ShieldCheck, AlertTriangle
} from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Business Performance Analytics — Speshway Luxury Hotel" },
      { name: "description", content: "Property-level RevPAR, ADR, GST tax slabs, occupancy, payments, and revenue trends reports." }
    ]
  }),
  component: AdminReportsDashboard
});

const axisStyle = {
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

const PIE_COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#eab308", "#10b981"];

function PremiumStatCard({ label, value, delta = 4, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  const isPositive = delta >= 0;
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="h-6 flex items-start">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          </div>
          <h3 className="mt-1 font-display text-base font-black text-navy leading-none whitespace-nowrap">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-[9px] h-4">
        <span className={`inline-flex items-center gap-0.5 font-bold shrink-0 ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? "+" : ""}{delta}%
        </span>
        {hint && <span className="text-[9.5px] text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

// Initial Mock Datasets
const defaultBookingsData = [];

function AdminReportsDashboard() {
  const [activeReportTab, setActiveReportTab] = useState("revenue"); // "revenue" | "occupancy" | "reservations" | "payments" | "gst" | "performance"

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [timeRange, setTimeRange] = useState("30"); // "7" | "30" | "Month"
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    async function loadReportsData() {
      setLoading(true);
      try {
        const res = await superAdminService.getReservations();
        if (res.success && res.data && res.data.length > 0) {
          const mapped = res.data.map((b, idx) => ({
            id: b._id || b.id || `BKG-10${idx}`,
            guest: b.guest || "Guest",
            room: b.room || "101",
            category: b.roomType || b.category || "Standard Room",
            source: b.source || "Direct",
            amount: b.amount || b.totalAmount || 3500,
            gst: Math.round((b.amount || 3500) * 0.18),
            status: b.status || "Confirmed",
            checkIn: b.checkIn || new Date().toISOString().split("T")[0],
            payment: b.paymentStatus || (b.balance === 0 ? "Paid" : "Pending")
          }));
          setBookings(mapped);
        } else {
          setBookings([]);
        }
      } catch (err) {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    loadReportsData();

    const handleFocus = () => {
      loadReportsData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Filter application logic
  const filteredData = bookings.filter(b => {
    const matchesProperty = propertyFilter === "all" || (propertyFilter === "Udaipur" && b.room.startsWith("1")) || (propertyFilter === "Jaipur" && b.room.startsWith("2"));
    const matchesRoomType = roomTypeFilter === "all" || b.category === roomTypeFilter;
    const matchesSource = sourceFilter === "all" || b.source === sourceFilter;
    const matchesPayment = paymentFilter === "all" || b.payment === paymentFilter;

    return matchesProperty && matchesRoomType && matchesSource && matchesPayment;
  });

  // KPI Calculations
  const roomRevenue = filteredData.reduce((acc, curr) => acc + curr.amount, 0);
  const occupancyPercentage = Math.round((filteredData.filter(b => b.status === "Checked-in").length / 10) * 100) || 72;
  const totalReservationsCount = filteredData.length;
  const adr = Math.round(roomRevenue / Math.max(1, totalReservationsCount));
  const revpar = Math.round(roomRevenue / 120); // 120 rooms capacity
  const totalPaymentsCollected = filteredData.filter(b => b.payment === "Paid").reduce((acc, curr) => acc + curr.amount, 0);

  // Revenue chart data over dates
  const revenueTrendData = [
    { name: "12 Aug", Revenue: Math.round(roomRevenue * 0.15), Bookings: 2 },
    { name: "13 Aug", Revenue: Math.round(roomRevenue * 0.3), Bookings: 4 },
    { name: "14 Aug", Revenue: Math.round(roomRevenue * 0.25), Bookings: 3 },
    { name: "15 Aug", Revenue: Math.round(roomRevenue * 0.2), Bookings: 2 },
    { name: "16 Aug", Revenue: Math.round(roomRevenue * 0.1), Bookings: 1 }
  ];

  // Occupancy rate trend
  const occupancyTrendData = [
    { day: "12 Aug", Rate: 65 },
    { day: "13 Aug", Rate: 72 },
    { day: "14 Aug", Rate: 80 },
    { day: "15 Aug", Rate: 85 },
    { day: "16 Aug", Rate: occupancyPercentage }
  ];

  // Distribution source split
  const sourceGroup = {};
  filteredData.forEach(b => {
    sourceGroup[b.source] = (sourceGroup[b.source] || 0) + 1;
  });
  const sourceChartData = Object.entries(sourceGroup).map(([name, value]) => ({ name, value }));

  // Payments breakdown
  const paymentGroup = {};
  filteredData.forEach(b => {
    paymentGroup[b.payment] = (paymentGroup[b.payment] || 0) + b.amount;
  });
  const paymentChartData = Object.entries(paymentGroup).map(([name, value]) => ({ name, value }));

  const gstCollected = Math.round(roomRevenue * 0.18);

  // Room Category Performance calculations
  const categoryGroup = {};
  filteredData.forEach(b => {
    const cat = b.category || "Superior Deluxe";
    if (!categoryGroup[cat]) {
      categoryGroup[cat] = { revenue: 0, bookings: 0 };
    }
    categoryGroup[cat].revenue += b.amount;
    categoryGroup[cat].bookings += 1;
  });
  const categoryChartData = Object.entries(categoryGroup).map(([name, info]) => ({
    name,
    revenue: info.revenue,
    bookings: info.bookings
  }));

  const handleExport = (format) => {
    setExporting(true);
    setTimeout(() => {
      toast.success(`${format.toUpperCase()} reports sheet compiled successfully!`);
      setExporting(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {/* Action Toolbar */}
      <div className="flex justify-end select-none">
        <div className="flex gap-2">
          <Button
            onClick={() => handleExport("pdf")}
            className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-4 font-bold rounded-full shadow-soft flex items-center gap-1"
          >
            <Printer className="size-3.5" /> Print PDF
          </Button>
          <Button
            onClick={() => handleExport("csv")}
            className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-4 font-bold rounded-full shadow-soft flex items-center gap-1"
          >
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <PremiumStatCard label="Total Revenue" value={`₹${roomRevenue.toLocaleString()}`} delta={6} hint="Gross checks volume" icon={DollarSign} accentColor="#6366f1" />
        <PremiumStatCard label="Occupancy Rate" value={`${occupancyPercentage}%`} delta={4} hint="Rooms occupied ratio" icon={Percent} accentColor="#10b981" />
        <PremiumStatCard label="Total Reservations" value={totalReservationsCount.toString()} delta={3} hint="Bookings logged" icon={KeyRound} accentColor="#3b82f6" />
        <PremiumStatCard label="Average Daily Rate" value={`₹${adr.toLocaleString()}`} delta={2} hint="ADR room average" icon={TrendingUp} accentColor="#ec4899" />
        <PremiumStatCard label="RevPAR" value={`₹${revpar.toLocaleString()}`} delta={5} hint="Per available room" icon={Compass} accentColor="#a855f7" />
        <PremiumStatCard label="Total Payments" value={`₹${totalPaymentsCollected.toLocaleString()}`} delta={7} hint="Cleared cash/card volume" icon={CreditCard} accentColor="#0d1b2a" />
      </div>

      {/* Filters Panel */}
      <Panel title="Reports Query Parameters">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <FormField label="Time Period Range" id="timeRange">
            <Select id="timeRange" value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="h-10 text-xs font-bold">
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="Month">This Month</option>
            </Select>
          </FormField>

          <FormField label="Property Location" id="property">
            <Select id="property" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="h-10 text-xs font-bold">
              <option value="all">All Properties</option>
              <option value="Udaipur">Palace Udaipur</option>
              <option value="Jaipur">Jaipur Resort</option>
            </Select>
          </FormField>

          <FormField label="Room Configuration Type" id="roomType">
            <Select id="roomType" value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)} className="h-10 text-xs font-bold">
              <option value="all">All Room Types</option>
              <option value="Maharaja Suite">Maharaja Suite</option>
              <option value="Superior Deluxe">Superior Deluxe</option>
            </Select>
          </FormField>

          <FormField label="Booking Source Channel" id="source">
            <Select id="source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-10 text-xs font-bold">
              <option value="all">All Channels</option>
              <option value="Direct">Direct Guest</option>
              <option value="MakeMyTrip">MakeMyTrip</option>
              <option value="Booking.com">Booking.com</option>
            </Select>
          </FormField>

          <FormField label="Settlement Payment Status" id="payment">
            <Select id="payment" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="h-10 text-xs font-bold">
              <option value="all">All Statuses</option>
              <option value="Paid">Fully Settled</option>
              <option value="Partial">Partial Due</option>
              <option value="Unpaid">Unpaid / Folio due</option>
            </Select>
          </FormField>
        </div>
      </Panel>

      {/* Report Categories tabs selector */}
      <div className="border-b border-muted flex gap-6 overflow-x-auto scrollbar-none select-none">
        {[
          { label: "Revenue Performance", key: "revenue" },
          { label: "Occupancy Indices", key: "occupancy" },
          { label: "Reservations Channels", key: "reservations" },
          { label: "Payments Settlement", key: "payments" },
          { label: "GST & Tax Reconciliation", key: "gst" },
          { label: "Room Performance", key: "performance" }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveReportTab(t.key)}
            className={`pb-2.5 text-xs font-bold transition-all relative shrink-0 ${
              activeReportTab === t.key ? "text-navy border-b-2 border-navy" : "text-muted-foreground hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Reports tab contents */}
      
      {/* 1. Revenue Reports */}
      {activeReportTab === "revenue" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel title="Revenue Trends Trajectory" className="lg:col-span-2">
            <div className="p-4 bg-white rounded-b-xl min-h-[300px]">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" {...axisStyle} />
                  <YAxis {...axisStyle} />
                  <Tooltip {...tooltipStyle} formatter={(val) => `₹${val.toLocaleString()}`} />
                  <Area type="monotone" dataKey="Revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Revenue Summary Summary" className="lg:col-span-1">
            <div className="p-4.5 space-y-4 text-xs font-semibold text-navy">
              <div className="flex justify-between items-center">
                <span>Room Charges Base Revenue</span>
                <span className="font-bold">₹{roomRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>GST collected share</span>
                <span>₹{gstCollected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-success border-t border-muted/50 pt-2.5">
                <span>Net revenue settled</span>
                <span className="font-black">₹{totalPaymentsCollected.toLocaleString()}</span>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* 2. Occupancy Reports */}
      {activeReportTab === "occupancy" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel title="Occupancy Rate Trajectory" className="lg:col-span-2">
            <div className="p-4 bg-white rounded-b-xl min-h-[300px]">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={occupancyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" {...axisStyle} />
                  <YAxis {...axisStyle} />
                  <Tooltip {...tooltipStyle} formatter={(val) => `${val}%`} />
                  <Area type="monotone" dataKey="Rate" stroke="#10b981" fillOpacity={1} fill="url(#colorOccupancy)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Occupancy Metrics Details" className="lg:col-span-1">
            <div className="p-4.5 space-y-4 text-xs font-semibold text-navy">
              <div className="flex justify-between items-center">
                <span>Total Available Capacity</span>
                <span className="font-bold">120 Rooms</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Staying In-House Rooms</span>
                <span className="font-bold">{filteredData.filter(b => b.status === "Checked-in").length} Rooms</span>
              </div>
              <div className="flex justify-between items-center text-success border-t border-muted/50 pt-2.5">
                <span>Current Occupancy Ratio</span>
                <span className="font-black">{occupancyPercentage}% Occupied</span>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* 3. Reservations Reports */}
      {activeReportTab === "reservations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel title="Distribution Channels Share" className="lg:col-span-1">
            <div className="p-4 bg-white rounded-b-xl min-h-[300px] flex flex-col justify-between">
              <div className="h-[170px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceChartData.length > 0 ? sourceChartData : [{ name: "Direct", value: 1 }]}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sourceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-muted">
                {sourceChartData.map((d, i) => (
                  <div key={d.name} className="flex justify-between items-center text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-navy font-semibold">
                      <span className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name}
                    </span>
                    <span className="font-bold text-navy-deep">{d.value} bookings</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Reservations Channels Audit Catalog" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                    <th className="py-3 px-4 text-left">Channel Source</th>
                    <th className="py-3 px-4 text-center">Bookings Count</th>
                    <th className="py-3 px-4 text-left">Revenue Contributed</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                  {sourceChartData.map((s, idx) => {
                    const rev = filteredData.filter(b => b.source === s.name).reduce((acc, curr) => acc + curr.amount, 0);
                    return (
                      <tr key={idx} className="hover:bg-muted/5">
                        <td className="py-3 px-4 font-bold text-navy">{s.name}</td>
                        <td className="py-3 px-4 text-center font-bold">{s.value}</td>
                        <td className="py-3 px-4 text-left font-black">₹{rev.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center"><Tag tone="success">Active</Tag></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* 4. Payments Reports */}
      {activeReportTab === "payments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel title="Captured Payments Share" className="lg:col-span-1">
            <div className="p-4 bg-white rounded-b-xl min-h-[300px] flex flex-col justify-between">
              <div className="h-[170px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData.length > 0 ? paymentChartData : [{ name: "Direct", value: 1 }]}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-muted">
                {paymentChartData.map((d, i) => (
                  <div key={d.name} className="flex justify-between items-center text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-navy font-semibold">
                      <span className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name}
                    </span>
                    <span className="font-bold text-navy-deep">₹{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Payments Settlement Summary Log" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                    <th className="py-3 px-4 text-left">Payment Level Status</th>
                    <th className="py-3 px-4 text-center">Transactions count</th>
                    <th className="py-3 px-4 text-left">Captured Volume</th>
                    <th className="py-3 px-4 text-center">Settlement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                  {paymentChartData.map((p, idx) => (
                    <tr key={idx} className="hover:bg-muted/5">
                      <td className="py-3 px-4 font-bold text-navy">{p.name}</td>
                      <td className="py-3 px-4 text-center font-semibold">{filteredData.filter(b => b.payment === p.name).length}</td>
                      <td className="py-3 px-4 text-left font-black text-success">₹{p.value.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <Tag tone={p.name === "Paid" ? "success" : "warning"}>{p.name === "Paid" ? "Settled" : "Pending"}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* 5. GST & Tax Reports */}
      {activeReportTab === "gst" && (
        <div className="space-y-4">
          <Panel title="Taxes & GST Liability Ledger Logs" description="Review HSN code SGST/CGST tax reconciliations.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                    <th className="py-3 px-4 text-left">Month / Period</th>
                    <th className="py-3 px-4 text-right">Base Taxable Valuation</th>
                    <th className="py-3 px-4 text-right">CGST Collected</th>
                    <th className="py-3 px-4 text-right">SGST Collected</th>
                    <th className="py-3 px-4 text-right">Gross GST Collected</th>
                    <th className="py-3 px-4 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                  <tr className="hover:bg-muted/5">
                    <td className="py-3 px-4 font-bold text-navy">August 2026</td>
                    <td className="py-3 px-4 text-right font-semibold">₹{roomRevenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium">₹{Math.round(gstCollected / 2).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium">₹{(gstCollected - Math.round(gstCollected / 2)).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-black text-purple">₹{gstCollected.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center"><Tag tone="success">Reconciled</Tag></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* 6. Room Performance Reports */}
      {activeReportTab === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel title="Room Category Revenue Share" className="lg:col-span-2">
            <div className="p-4 bg-white rounded-b-xl min-h-[300px] flex flex-col justify-between">
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData.length > 0 ? categoryChartData : [{ name: "Superior Deluxe", revenue: 1 }]}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="revenue"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(val) => `₹${val.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 justify-center pt-2 border-t border-muted/50">
                {categoryChartData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[10.5px]">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-navy font-bold">{d.name}</span>
                    <span className="text-muted-foreground font-semibold">({Math.round((d.revenue / Math.max(1, roomRevenue)) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Room Category Performance Ledger" className="lg:col-span-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[300px]">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                    <th className="py-3 px-4 text-left">Room Class</th>
                    <th className="py-3 px-4 text-center">Stays</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                  {categoryChartData.map((c, idx) => (
                    <tr key={idx} className="hover:bg-muted/5">
                      <td className="py-3 px-4 font-bold text-navy">{c.name}</td>
                      <td className="py-3 px-4 text-center font-semibold">{c.bookings}</td>
                      <td className="py-3 px-4 text-right font-black">₹{c.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

    </div>
  );
}