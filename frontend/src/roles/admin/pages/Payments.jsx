import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, Tag, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { adminService } from "@/services/admin";
import { toast } from "sonner";
import {
  CreditCard, Search, Eye, CheckCircle2, XCircle, ArrowUpRight, DollarSign,
  Undo2, RefreshCw, Layers, ShieldAlert, Sparkles
} from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments Ledger — Speshway Luxury Hotel" },
      { name: "description", content: "Review capturing card transactions, UPI logs, cash reconciliations, refunds, and bank settlements." }
    ]
  }),
  component: AdminPaymentsPage
});

function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div>
        <div className="h-6 flex items-start">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        </div>
        <h3 className="mt-1 font-display text-base font-black text-navy leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

const initialTransactions = [];

function AdminPaymentsPage() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Txn Audit Detail Modal
  const [selectedTxn, setSelectedTxn] = useState(null);



  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        const res = await adminService.getPayments();
        if (res.success && res.data) {
          const mapped = res.data.map(p => ({
            _id: p._id || p.id,
            txnId: `TXN-${(p._id || p.id || "").substring(0, 8).toUpperCase()}`,
            bookingId: p.bookingId || "BK-0000",
            guest: p.guestName || "Guest",
            room: p.roomNumber || "101",
            amount: p.amount || 0,
            date: p.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
            method: p.paymentMethod || "UPI",
            status: p.status === 'Settled' ? 'Success' : (p.status || 'Success'),
            settlementStatus: "Settled",
            settlementDate: p.settledAt || "Today, 02:00 AM",
            gateway: p.gateway || "Razorpay GDS",
            reference: "UPI ID Mapped"
          }));
          setTransactions(mapped);
        }
      } catch (err) {
        toast.error("Failed to load transaction history.");
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();

    const handleFocus = () => loadTransactions();
    window.addEventListener('focus', handleFocus);

    let socketInst = null;
    import('@/services/socket').then(({ socket }) => {
      socketInst = socket;
      socket.on('payment_added', loadTransactions);
      socket.on('booking_updated', loadTransactions);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const syncTransactions = (list) => {
    setTransactions(list);
  };

  // KPIs
  const successList = transactions.filter(t => t.status === "Success");
  const totalCollected = successList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const pendingSettlementVal = transactions.filter(t => t.settlementStatus === "Pending Settlement").reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const failedCount = transactions.filter(t => t.status === "Failed").length;
  const refundedVal = transactions.filter(t => t.status === "Refunded").reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Filtered list
  const filteredTxns = transactions.filter(t => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      (t.guest || "").toLowerCase().includes(s) ||
      (t.txnId || "").toLowerCase().includes(s) ||
      (t.bookingId || "").toLowerCase().includes(s) ||
      (t.room || "").toLowerCase().includes(s);

    const matchesMethod = methodFilter === "all" || (t.method || "").toLowerCase().includes(methodFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTxns.length / itemsPerPage) || 1;
  const paginatedTxns = filteredTxns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleTriggerRefund = (txnId) => {
    const updated = transactions.map(t => {
      if (t.txnId === txnId) {
        toast.success(`Refund initiated for Transaction ${txnId}!`);
        return { ...t, status: "Refunded" };
      }
      return t;
    });
    syncTransactions(updated);
    if (selectedTxn && selectedTxn.txnId === txnId) {
      setSelectedTxn({ ...selectedTxn, status: "Refunded" });
    }
  };

  const handleMarkSettled = (txnId) => {
    const updated = transactions.map(t => {
      if (t.txnId === txnId) {
        toast.success(`Transaction ${txnId} marked as settled manually!`);
        return { ...t, settlementStatus: "Settled", settlementDate: new Date().toISOString().substring(0, 10) + " 02:00 AM" };
      }
      return t;
    });
    syncTransactions(updated);
    if (selectedTxn && selectedTxn.txnId === txnId) {
      setSelectedTxn({ ...selectedTxn, settlementStatus: "Settled", settlementDate: new Date().toISOString().substring(0, 10) + " 02:00 AM" });
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {/* 1. Stat cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard
          label="Payments Collected"
          value={`₹${totalCollected.toLocaleString()}`}
          hint="Gross success merchant deposits"
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="Pending Settlements"
          value={`₹${pendingSettlementVal.toLocaleString()}`}
          hint="Authorized volume awaiting settlement"
          accentColor="#f59e0b"
        />
        <PremiumStatCard
          label="Declined Payments"
          value={failedCount.toString()}
          hint="Failed card/UPI captures"
          accentColor="#ef4444"
        />
        <PremiumStatCard
          label="Refunded Value"
          value={`₹${refundedVal.toLocaleString()}`}
          hint="Total refunds dispatched"
          accentColor="#6b7280"
        />
      </div>

      {/* Filters Search panel */}
      <Panel title="Payments Ledger Filters">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <FormField label="Search Guest or Txn Reference" id="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                className="pl-9 h-10 text-xs font-bold"
                placeholder="Guest, Room, Txn ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </FormField>

          <FormField label="Payment Method" id="method">
            <Select
              id="method"
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All Methods</option>
              <option value="card">Cards (Visa/Mastercard)</option>
              <option value="upi">UPI (GPay/PhonePe)</option>
              <option value="virtual">OTA Virtual Card</option>
            </Select>
          </FormField>

          <FormField label="Capture Status" id="status">
            <Select
              id="status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All statuses</option>
              <option value="Success">Success (Paid)</option>
              <option value="Failed">Failed (Declined)</option>
              <option value="Refunded">Refunded</option>
            </Select>
          </FormField>
        </div>
      </Panel>

      {/* Main transactions catalog */}
      <Panel title="Transaction History Log" description={`Displaying ${filteredTxns.length} payment captures.`}>
        {paginatedTxns.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground select-none">No transactions found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1000px]">
              <thead className="whitespace-nowrap">
                <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Room No</th>
                  <th className="py-3 px-4 text-right">Captured Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Capture Status</th>
                  <th className="py-3 px-4">Settlement Status</th>
                  <th className="py-3 px-4 text-center font-bold" style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                {paginatedTxns.map((t) => (
                  <tr key={t.txnId} className="hover:bg-muted/5">
                    <td className="py-3.5 px-4 font-mono font-bold text-navy">{t.txnId}</td>
                    <td className="py-3.5 px-4 font-bold text-navy">{t.guest}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">Room #{t.room}</td>
                    <td className="py-3.5 px-4 text-right font-black text-navy">₹{t.amount.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-medium text-navy">{t.method}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{t.date}</td>
                    <td className="py-3.5 px-4">
                      <Tag tone={t.status === "Success" ? "success" : t.status === "Failed" ? "danger" : "neutral"}>
                        {t.status}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.settlementStatus === "Settled" ? "bg-success/15 text-success" : t.settlementStatus === "Pending Settlement" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                      }`}>{t.settlementStatus}</span>
                    </td>
                    <td className="py-3 px-4 text-center" style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>
                      <Button
                        onClick={() => setSelectedTxn(t)}
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 mx-auto flex items-center justify-center rounded-full"
                        title="Audit Transaction"
                      >
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Transaction Audit detail overlay Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Audit: {selectedTxn.txnId}</h3>
                <p className="text-[9.5px] text-muted-foreground uppercase mt-0.5">Booking Ref: {selectedTxn.bookingId}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-navy"
                onClick={() => setSelectedTxn(null)}
              >
                <XCircle className="size-4" />
              </Button>
            </div>

            {/* Audit log body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-muted/20 border border-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Gateway:</span>
                  <span className="font-bold">{selectedTxn.gateway}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Captured Amount:</span>
                  <span className="font-black">₹{selectedTxn.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Captured Method:</span>
                  <span className="font-bold">{selectedTxn.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capture Status:</span>
                  <Tag tone={selectedTxn.status === "Success" ? "success" : selectedTxn.status === "Failed" ? "danger" : "neutral"}>
                    {selectedTxn.status}
                  </Tag>
                </div>
              </div>

              <div className="p-3 bg-[#fafafa]/50 border border-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Settlement Status:</span>
                  <span className="font-bold">{selectedTxn.settlementStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Settled Timestamp:</span>
                  <span className="font-semibold">{selectedTxn.settlementDate}</span>
                </div>
              </div>

              {/* Administrative Actions */}
              <div className="pt-2 border-t border-muted/50 space-y-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Administrative Overrides</p>
                <div className="flex gap-2">
                  {selectedTxn.status === "Success" && (
                    <Button
                      onClick={() => handleTriggerRefund(selectedTxn.txnId)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold h-9 text-xs rounded-full flex items-center justify-center gap-1.5"
                    >
                      <Undo2 className="size-3.5" /> Trigger Refund
                    </Button>
                  )}
                  {selectedTxn.settlementStatus === "Pending Settlement" && (
                    <Button
                      onClick={() => handleMarkSettled(selectedTxn.txnId)}
                      className="flex-1 bg-navy hover:bg-navy-deep text-white font-bold h-9 text-xs rounded-full flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="size-3.5" /> Force Settlement
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setSelectedTxn(null)}
                className="h-8 px-4 text-xs rounded-full"
              >
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}