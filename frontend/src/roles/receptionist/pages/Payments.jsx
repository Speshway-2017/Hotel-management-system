import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { subscribeRealtimeSync } from "@/services/socket";
import { 
  CreditCard, Search, ArrowUpRight, CheckCircle2, AlertTriangle, 
  TrendingUp, RefreshCw, Landmark, Wallet, Plus, Download, Filter
} from "lucide-react";

export const Route = createFileRoute("/reception/payments")({
  head: () => ({
    meta: [
      { title: "Payments Ledger — Hour Stay" },
      { name: "description", content: "Track guest payments, pending balances, and transactions." }
    ]
  }),
  component: PaymentsPage
});

function SummaryCard({ label, value, hint, icon: Icon, accentColor }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between min-h-[100px] text-left"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <h3 className="mt-2 text-base font-black text-navy">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-2 text-[9px] text-muted-foreground truncate">{hint}</div>
    </div>
  );
}

function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadPayments = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    receptionistService.getPayments()
      .then(res => {
        if (res.success && res.data) {
          setPayments(res.data);
        }
      })
      .catch(err => console.error("Failed to load payments ledger:", err))
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    loadPayments(false);

    const handleFocus = () => loadPayments(true);
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadPayments(true);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const totalCollected = payments
    .filter(p => p.status === 'Settled')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefunds = payments
    .filter(p => p.status === 'Refunded')
    .reduce((sum, p) => sum + p.amount, 0);

  const todayPayments = payments
    .filter(p => p.status === 'Settled' && new Date(p.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = payments.filter(p => {
    const guestStr = String(p.guestName || p.guest || "").toLowerCase();
    const bookingIdStr = String(p.bookingId || "").toLowerCase();
    const idStr = String(p._id || p.id || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = guestStr.includes(query) || bookingIdStr.includes(query) || idStr.includes(query);
    const matchesMethod = methodFilter === "all" || p.paymentMethod === methodFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const getMethodIcon = (method) => {
    switch (method) {
      case 'Card': return CreditCard;
      case 'UPI': return Wallet;
      case 'Bank Transfer': return Landmark;
      default: return Wallet;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading payments transaction ledger...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Top Navbar Header */}
      <PageHeader />

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <SummaryCard label="Total Collected" value={`₹${totalCollected.toLocaleString()}`} hint="All-time settled transactions" icon={CheckCircle2} accentColor="#10b981" />
        <SummaryCard label="Today's Payments" value={`₹${todayPayments.toLocaleString()}`} hint="Total logged today" icon={TrendingUp} accentColor="#6366f1" />
        <SummaryCard label="Refunds Processed" value={`₹${totalRefunds.toLocaleString()}`} hint="Deducted adjustment logs" icon={RefreshCw} accentColor="#f43f5e" />
        <SummaryCard label="Pending Audits" value="₹0" hint="No outstanding checks" icon={AlertTriangle} accentColor="#eab308" />
      </div>

      {/* Filter and Table Panel */}
      <Panel title="Payments Registry & Ledger" description="Track UPI, card, and cash transaction captures registered at front desk.">
        <div className="p-6 space-y-4">
          
          {/* Filters controls */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-b border-muted pb-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by Guest name, Booking ID, Transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full md:w-auto"
              >
                <option value="all">All Methods</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full md:w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="Settled">Settled</option>
                <option value="Refunded">Refunded</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Guest Name</th>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30 font-semibold">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-muted-foreground">
                      No payment transactions match filters.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const MethodIcon = getMethodIcon(p.paymentMethod);
                    return (
                      <tr key={p._id} className="hover:bg-muted/5">
                        <td className="py-3.5 px-4 font-mono text-[10px] font-bold text-navy-deep">{p._id}</td>
                        <td className="py-3.5 px-4">{p.guestName}</td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-indigo">{p.bookingId}</td>
                        <td className="py-3.5 px-4 text-right font-black text-navy">₹{p.amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <MethodIcon className="size-3 text-navy-deep shrink-0" />
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <Tag tone={p.status === 'Settled' ? 'success' : p.status === 'Refunded' ? 'error' : 'warning'}>
                            {p.status}
                          </Tag>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </Panel>
    </div>
  );
}