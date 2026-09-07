import { useEffect, useState, useCallback } from "react";
import { PageHeader, Panel, Tag, ActionGroup, ViewActionButton, EditActionButton, DeleteActionButton, DownloadActionButton, ActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { adminService } from "@/services/admin";
import { managerService } from "@/services/manager";
import { receptionistService } from "@/services/receptionist";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import { invalidateApiCache } from "@/services/apiClient";
import {
  CreditCard, Search, CheckCircle2, ArrowUpRight,
  Undo2, RefreshCw, Plus, Wallet, Landmark,
  IndianRupee, Download, Check
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
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Record Payment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Payment Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // New Payment Form
  const [newPayment, setNewPayment] = useState({
    guestName: "",
    bookingId: "",
    roomNumber: "101",
    amount: "",
    paymentMethod: "UPI",
    status: "Settled"
  });

  const getService = useCallback(() => {
    if (role === "admin") return adminService;
    if (role === "manager") return managerService;
    return receptionistService;
  }, [role]);

  const loadPayments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    const service = getService();
    try {
      invalidateApiCache();
      const res = await service.getPayments();
      const rawList = (res && res.data && Array.isArray(res.data))
        ? res.data
        : (Array.isArray(res) ? res : []);

      const formatted = rawList.map(p => ({
        _id: String(p._id || p.id || ""),
        bookingId: p.bookingId || "—",
        guestName: p.guestName || p.guest || p.customerName || "Guest",
        roomNumber: p.roomNumber || p.room || "101",
        amount: Number(p.amount || 0),
        paymentMethod: p.paymentMethod || p.method || "UPI",
        status: p.status || "Settled",
        propertyId: p.propertyId || "",
        createdAt: p.createdAt || p.date || new Date().toISOString()
      }));

      setPayments(formatted);
    } catch (err) {
      console.error("Failed to load payments ledger:", err);
      if (!isSilent) {
        toast.error("Could not fetch payments ledger.");
      }
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [getService]);

  useEffect(() => {
    loadPayments(false);

    const handleFocus = () => loadPayments(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadPayments(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadPayments(true);
    });

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (unsubscribe) unsubscribe();
    };
  }, [loadPayments]);

  // Method Icon Helper
  const getMethodIcon = (method) => {
    const m = String(method || "").toLowerCase();
    if (m.includes("card")) return CreditCard;
    if (m.includes("upi") || m.includes("wallet")) return Wallet;
    if (m.includes("net") || m.includes("bank") || m.includes("transfer")) return Landmark;
    return IndianRupee;
  };

  // Status Tone Helper
  const getStatusTone = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "settled" || s === "paid" || s === "success") return "success";
    if (s === "refunded") return "error";
    if (s === "pending" || s === "partial") return "warning";
    return "neutral";
  };

  // Record Payment Submit Handler
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!newPayment.guestName || !newPayment.amount) {
      toast.error("Please fill in required fields (Guest Name & Amount).");
      return;
    }

    setIsSubmitting(true);
    const service = getService();
    try {
      const payload = {
        guestName: newPayment.guestName,
        bookingId: newPayment.bookingId || `BK-${Math.floor(100000 + Math.random() * 900000)}`,
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

  // Open Edit Modal
  const handleOpenEditModal = (p) => {
    setEditingPayment({
      _id: p._id,
      bookingId: p.bookingId,
      guestName: p.guestName,
      roomNumber: p.roomNumber,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      status: p.status
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Handler
  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPayment) return;

    setIsEditing(true);
    const service = getService();
    try {
      const payload = {
        guestName: editingPayment.guestName,
        bookingId: editingPayment.bookingId,
        roomNumber: editingPayment.roomNumber,
        amount: Number(editingPayment.amount),
        paymentMethod: editingPayment.paymentMethod,
        status: editingPayment.status
      };

      await service.updatePayment(editingPayment._id, payload);
      toast.success(`Payment transaction updated for ${editingPayment.guestName}!`);
      setIsEditModalOpen(false);
      setEditingPayment(null);
      loadPayments(true);
    } catch (err) {
      console.error("Failed to update payment:", err);
      toast.error(err.message || "Failed to update payment.");
    } finally {
      setIsEditing(false);
    }
  };

  // Quick Settle Handler
  const handleQuickStatusChange = async (payment, newStatus) => {
    const service = getService();
    try {
      await service.updatePayment(payment._id, { status: newStatus });
      toast.success(`Payment status updated to ${newStatus}`);
      loadPayments(true);
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update status.");
    }
  };

  // Delete Payment Handler
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to delete this payment transaction?")) {
      return;
    }
    const service = getService();
    try {
      if (service.deletePayment) {
        await service.deletePayment(paymentId);
      } else {
        await service.updatePayment(paymentId, { status: "Refunded" });
      }
      toast.success("Payment record removed.");
      loadPayments(true);
    } catch (err) {
      console.error("Failed to delete payment:", err);
      toast.error("Failed to delete payment.");
    }
  };

  // Single Receipt Download / CSV
  const handleDownloadSingleReceipt = (p) => {
    const headers = "Transaction ID,Booking ID,Guest Name,Room Number,Amount (INR),Payment Method,Status,Date & Time\n";
    const row = `"${p._id}","${p.bookingId}","${p.guestName}","${p.roomNumber}","${p.amount}","${p.paymentMethod}","${p.status}","${new Date(p.createdAt).toLocaleString()}"\n`;
    const blob = new Blob([headers + row], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt_${p.guestName.replace(/\s+/g, "_")}_${p.bookingId || p._id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Receipt downloaded for ${p.guestName}.`);
  };

  // Export All CSV Handler
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
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter(p => p.status === "Pending" || p.status === "Partial").length;
  const refundedAmount = payments.filter(p => p.status === "Refunded").reduce((sum, p) => sum + p.amount, 0);

  // Filtered List
  const filteredPayments = payments.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.guestName || "").toLowerCase().includes(q) ||
      (p.bookingId || "").toLowerCase().includes(q) ||
      (p._id || "").toLowerCase().includes(q) ||
      (String(p.roomNumber) || "").includes(q);

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
          label="Total Collected"
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          hint="All settled guest collections"
          icon={CheckCircle2}
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="Today's Collections"
          value={`₹${todayCollected.toLocaleString("en-IN")}`}
          hint="Gross logged today"
          icon={ArrowUpRight}
          accentColor="#6366f1"
        />
        <PremiumStatCard
          label="Total Transactions"
          value={`${payments.length} Records`}
          hint={`${settledPayments.length} Settled, ${pendingCount} Pending`}
          icon={CreditCard}
          accentColor="#0ea5e9"
        />
        <PremiumStatCard
          label="Refunds Processed"
          value={`₹${refundedAmount.toLocaleString("en-IN")}`}
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
              onClick={() => loadPayments(true)}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="h-9 px-3 text-xs font-bold rounded-xl border-muted hover:bg-muted/50 cursor-pointer flex items-center gap-1.5"
              title="Refresh ledger from database"
            >
              <RefreshCw className={`size-3.5 text-navy ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
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
          <table className="w-full text-left text-xs min-w-[1000px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none whitespace-nowrap">
                <th className="py-3.5 px-4 text-left">Transaction ID</th>
                <th className="py-3.5 px-4 text-left">Booking ID / Guest</th>
                <th className="py-3.5 px-4 text-left">Room No</th>
                <th className="py-3.5 px-4 text-left">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-left">Date & Time</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-left min-w-[140px]">Actions</th>
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
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-deep text-left">
                        {p._id ? p._id.substring(p._id.length - 8).toUpperCase() : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex flex-col">
                          <span className="font-bold text-navy">{p.guestName}</span>
                          <span className="text-[10px] font-mono text-indigo font-semibold">{p.bookingId}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-left font-bold text-brand">Room #{p.roomNumber}</td>
                      <td className="py-3.5 px-4 text-left text-navy">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 font-semibold text-[11px]">
                          <MethodIcon className="size-3.5 text-navy-deep shrink-0" />
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-navy text-sm">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-left text-muted-foreground font-medium text-[11px]">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Tag tone={tone}>
                          {p.status}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4 text-left whitespace-nowrap min-w-[140px]">
                        <ActionGroup align="left">
                          <ViewActionButton
                            onClick={() => navigate(`/${role}/payments/${p._id}`)}
                            title="View Payment Details"
                          />
                          {!(p.status === "Settled" || p.status === "Paid" || p.status === "Success") && (
                            <EditActionButton
                              onClick={() => handleOpenEditModal(p)}
                              title="Edit Payment Record"
                            />
                          )}
                          <DownloadActionButton
                            onClick={() => handleDownloadSingleReceipt(p)}
                            title="Download Payment Receipt"
                          />
                          {(p.status === "Pending" || p.status === "Partial") && (
                            <ActionButton
                              icon={Check}
                              variant="success"
                              onClick={() => handleQuickStatusChange(p, "Settled")}
                              title="Mark as Settled"
                            />
                          )}
                          <DeleteActionButton
                            onClick={() => handleDeletePayment(p._id)}
                            title="Delete Payment Record"
                          />
                        </ActionGroup>
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
                  placeholder="e.g. Sunny or Abhi"
                  value={newPayment.guestName}
                  onChange={(e) => setNewPayment({ ...newPayment, guestName: e.target.value })}
                  className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Booking ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BK780567"
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
                    placeholder="e.g. 201"
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
                  placeholder="e.g. 6797"
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
                    <option value="Refunded">Refunded</option>
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

      {/* 6. Edit Payment Modal */}
      {isEditModalOpen && editingPayment && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Edit Payment Record</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Modify ledger details for {editingPayment.guestName}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-navy cursor-pointer"
                onClick={() => { setIsEditModalOpen(false); setEditingPayment(null); }}
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Guest Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingPayment.guestName}
                  onChange={(e) => setEditingPayment({ ...editingPayment, guestName: e.target.value })}
                  className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Booking ID
                  </label>
                  <input
                    type="text"
                    value={editingPayment.bookingId}
                    onChange={(e) => setEditingPayment({ ...editingPayment, bookingId: e.target.value })}
                    className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={editingPayment.roomNumber}
                    onChange={(e) => setEditingPayment({ ...editingPayment, roomNumber: e.target.value })}
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
                  value={editingPayment.amount}
                  onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-black text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={editingPayment.paymentMethod}
                    onChange={(e) => setEditingPayment({ ...editingPayment, paymentMethod: e.target.value })}
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
                    value={editingPayment.status}
                    onChange={(e) => setEditingPayment({ ...editingPayment, status: e.target.value })}
                    className="w-full px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                  >
                    <option value="Settled">Settled</option>
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end border-t border-muted/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsEditModalOpen(false); setEditingPayment(null); }}
                  className="h-9 px-4 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isEditing}
                  className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-5 text-xs rounded-xl cursor-pointer"
                >
                  {isEditing ? "Updating..." : "Save Changes"}
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
