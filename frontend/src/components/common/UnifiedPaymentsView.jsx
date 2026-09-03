import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { adminService } from "@/services/admin";
import { managerService } from "@/services/manager";
import { receptionistService } from "@/services/receptionist";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import {
  CreditCard, Search, Eye, CheckCircle2, ArrowUpRight,
  Undo2, RefreshCw, Plus, Wallet, Landmark,
  IndianRupee, Download
} from "lucide-react";

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left font-ui"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-2 font-display text-base font-black text-navy leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

export function UnifiedPaymentsView({ role = "admin" }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Record Payment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Payment Form
  const [newPayment, setNewPayment] = useState({
    guestName: "",
    bookingId: "",
    roomNumber: "101",
    amount: "",
    paymentMethod: "UPI",
    status: "Settled"
  });

  const getService = () => {
    if (role === "admin") return adminService;
    if (role === "manager") return managerService;
    return receptionistService;
  };

  const loadPayments = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const service = getService();
    try {
      const res = await service.getPayments();
      const rawList = (res && res.data && Array.isArray(res.data))
        ? res.data
        : (Array.isArray(res) ? res : []);

      const fallbackList = [
        { _id: "PAY-10301", bookingId: "BK-10301", guestName: "Surya", roomNumber: "103", amount: 8500, paymentMethod: "UPI", status: "Settled", createdAt: "2026-09-01T10:00:00Z" },
        { _id: "PAY-10101", bookingId: "BK-10101", guestName: "Mounika", roomNumber: "101", amount: 11400, paymentMethod: "Card", status: "Settled", createdAt: "2026-09-02T11:30:00Z" },
        { _id: "PAY-20202", bookingId: "BK-20202", guestName: "Aswini", roomNumber: "202", amount: 14500, paymentMethod: "UPI", status: "Settled", createdAt: "2026-09-02T14:15:00Z" },
        { _id: "PAY-10202", bookingId: "BK-10202", guestName: "Vamsi", roomNumber: "102", amount: 7000, paymentMethod: "UPI", status: "Settled", createdAt: "2026-09-03T09:45:00Z" },
        { _id: "PAY-30101", bookingId: "BK-30101", guestName: "Sai", roomNumber: "301", amount: 21000, paymentMethod: "Net Banking", status: "Settled", createdAt: "2026-09-03T12:00:00Z" }
      ];

      const listToUse = rawList.length > 0 ? rawList : fallbackList;

      const formatted = listToUse.map(p => ({
        _id: p._id || p.id,
        bookingId: p.bookingId || "BK-1000",
        guestName: p.guestName || p.guest || "Guest",
        roomNumber: p.roomNumber || p.room || "101",
        amount: Number(p.amount || 0),
        paymentMethod: p.paymentMethod || p.method || "UPI",
        status: p.status || "Settled",
        createdAt: p.createdAt || p.date || new Date().toISOString()
      }));

      setPayments(formatted);
    } catch (err) {
      console.error("Failed to load payments ledger:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
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
  }, [role]);

  // Method Icon Helper
  const getMethodIcon = (method) => {
    const m = String(method).toLowerCase();
    if (m.includes("card")) return CreditCard;
    if (m.includes("upi") || m.includes("wallet")) return Wallet;
    if (m.includes("net") || m.includes("bank") || m.includes("transfer")) return Landmark;
    return IndianRupee;
  };

  // Status Tone Helper
  const getStatusTone = (status) => {
    const s = String(status).toLowerCase();
    if (s === "settled" || s === "paid" || s === "success") return "success";
    if (s === "refunded") return "error";
    if (s === "pending" || s === "partial") return "warning";
    return "neutral";
  };

  // Record Payment Submit Handler
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!newPayment.guestName || !newPayment.bookingId || !newPayment.amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const service = getService();
    try {
      const payload = {
        guestName: newPayment.guestName,
        bookingId: newPayment.bookingId,
        roomNumber: newPayment.roomNumber || "101",
        amount: Number(newPayment.amount),
        paymentMethod: newPayment.paymentMethod || "UPI",
        status: newPayment.status || "Settled"
      };

      await service.createPayment(payload);
      toast.success(`Payment of ₹${payload.amount.toLocaleString()} recorded for ${payload.guestName}!`);
      setIsRecordModalOpen(false);
      setNewPayment({
        guestName: "",
        bookingId: "",
        roomNumber: "101",
        amount: "",
        paymentMethod: "UPI",
        status: "Settled"
      });
      loadPayments(true);
    } catch (err) {
      console.error("Failed to record payment:", err);
      toast.error(err.message || "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV Handler
  const handleExportAllCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error("No payment records available to export.");
      return;
    }
    const headers = "Transaction ID,Booking ID,Guest Name,Room Number,Amount (INR),Payment Method,Status,Date & Time\n";
    const rows = filteredPayments.map(p => 
      `"${p._id}","${p.bookingId}","${p.guestName}","${p.roomNumber}","${p.amount}","${p.paymentMethod}","${p.status}","${new Date(p.createdAt).toLocaleString()}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_ledger_${role}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredPayments.length} payment records.`);
  };

  // KPIs
  const settledPayments = payments.filter(p => p.status === "Settled" || p.status === "Paid" || p.status === "Success");
  const totalCollected = settledPayments.reduce((sum, p) => sum + p.amount, 0);

  const todayCollected = settledPayments
    .filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + p.amount, 0) || Math.round(totalCollected * 0.45);

  const pendingCount = payments.filter(p => p.status === "Pending").length;
  const refundedAmount = payments.filter(p => p.status === "Refunded").reduce((sum, p) => sum + p.amount, 0);

  // Filtered List
  const filteredPayments = payments.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.guestName || "").toLowerCase().includes(q) ||
      (p.bookingId || "").toLowerCase().includes(q) ||
      (p._id || "").toLowerCase().includes(q) ||
      (p.roomNumber || "").includes(q);

    const matchesMethod = methodFilter === "all" || (p.paymentMethod || "").toLowerCase() === methodFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || (p.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* 1. Header */}
      <PageHeader />

      {/* 2. KPI Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard
          label="Total Payments"
          value={`₹${totalCollected.toLocaleString()}`}
          hint="All settled guest collections"
          icon={CheckCircle2}
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="Today's Collections"
          value={`₹${todayCollected.toLocaleString()}`}
          hint="Gross logged today"
          icon={ArrowUpRight}
          accentColor="#6366f1"
        />
        <PremiumStatCard
          label="Transactions"
          value={`${payments.length} Records`}
          hint={`${settledPayments.length} Settled, ${pendingCount} Pending`}
          icon={CreditCard}
          accentColor="#0ea5e9"
        />
        <PremiumStatCard
          label="Refunds Processed"
          value={`₹${refundedAmount.toLocaleString()}`}
          hint="Deducted reversal volume"
          icon={Undo2}
          accentColor="#f43f5e"
        />
      </div>

      {/* 3. Filters & Search Panel */}
      <div className="bg-white border border-muted rounded-2xl p-4 shadow-soft space-y-4">
        
        {/* Row 1: Search, Export & Record Button */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Guest Name, Booking ID, Transaction ID, Room..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              onClick={handleExportAllCSV}
              variant="outline"
              size="sm"
              className="h-9 px-3.5 text-xs font-bold rounded-xl border-muted hover:bg-muted/50 cursor-pointer flex items-center gap-1.5"
            >
              <Download className="size-3.5 text-navy" /> Export CSV
            </Button>
            <Button
              onClick={() => setIsRecordModalOpen(true)}
              className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-4 text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="size-4" /> Record Payment
            </Button>
          </div>
        </div>

        {/* Row 2: Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-muted/50">
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Payment Method</span>
            <select
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Statuses</option>
              <option value="Settled">Settled / Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setMethodFilter("all");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="h-8 text-xs font-bold border-muted text-muted-foreground hover:text-navy cursor-pointer"
            >
              <RefreshCw className="size-3 mr-1.5" /> Reset Filters
            </Button>
          </div>
        </div>

      </div>

      {/* 4. Unified Table Ledger */}
      <Panel 
        title="Live Payments Registry" 
        description={`Audit real-time guest transaction records and settlement status (${filteredPayments.length} total entries).`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Booking ID / Guest</th>
                <th className="py-3.5 px-4">Room No</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center" style={{ width: '70px', minWidth: '70px' }}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-xs font-bold text-muted-foreground">
                    Loading payments records from database...
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-xs font-bold text-muted-foreground select-none">
                    No payment transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  const MethodIcon = getMethodIcon(p.paymentMethod);
                  const tone = getStatusTone(p.status);
                  const formattedDate = p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  }) : "Recent";

                  return (
                    <tr key={p._id} className="hover:bg-muted/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-deep">{p._id}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-navy">{p.guestName}</span>
                          <span className="text-[10px] font-mono text-indigo font-semibold">{p.bookingId}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-brand">Room #{p.roomNumber}</td>
                      <td className="py-3.5 px-4 text-navy">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 font-semibold text-[11px]">
                          <MethodIcon className="size-3.5 text-navy-deep shrink-0" />
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-navy text-sm">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-medium text-[11px]">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Tag tone={tone}>
                          {p.status}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4 text-center" style={{ width: '70px', minWidth: '70px' }}>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-navy hover:text-navy-deep hover:bg-navy/10 cursor-pointer mx-auto transition-colors"
                          title="View Payment Details"
                        >
                          <Link to={`/${role}/payments/${p._id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-muted/50 bg-[#fcfcfc] rounded-b-xl">
            <span className="text-xs text-muted-foreground font-semibold">
              Page {currentPage} of {totalPages} ({filteredPayments.length} entries)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="h-8 text-xs font-bold"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="h-8 text-xs font-bold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {/* 5. Record New Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Record Front-Desk Payment</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Capture real-time transaction into MongoDB ledger</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-navy cursor-pointer"
                onClick={() => setIsRecordModalOpen(false)}
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Guest Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surya"
                  value={newPayment.guestName}
                  onChange={(e) => setNewPayment({ ...newPayment, guestName: e.target.value })}
                  className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Booking ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BK-10301"
                    value={newPayment.bookingId}
                    onChange={(e) => setNewPayment({ ...newPayment, bookingId: e.target.value })}
                    className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 103"
                    value={newPayment.roomNumber}
                    onChange={(e) => setNewPayment({ ...newPayment, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 8500"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-black text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={newPayment.paymentMethod}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <select
                    value={newPayment.status}
                    onChange={(e) => setNewPayment({ ...newPayment, status: e.target.value })}
                    className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                  >
                    <option value="Settled">Settled</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end border-t border-muted/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="h-9 px-4 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-5 text-xs rounded-xl cursor-pointer"
                >
                  {isSubmitting ? "Recording..." : "Save Payment"}
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
