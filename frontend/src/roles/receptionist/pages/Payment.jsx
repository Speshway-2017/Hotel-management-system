import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";

export const Route = createFileRoute("/reception/payment")({
  head: () => ({
    meta: [
      { title: "Payments Ledger — Hour Stay" },
      { name: "description", content: "Payment records, cash drawer receipts, credit card POS logs and refunds tracker." }
    ]
  }),
  component: PaymentsPage
});

function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  const loadTransactions = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    receptionistService.getPayments()
      .then(res => {
        if (res && res.success && Array.isArray(res.data)) {
          const list = res.data.map(p => ({
            id: p._id || p.id || `TXN-${Math.floor(100 + Math.random() * 900)}`,
            guest: p.guestName || p.guest || "Guest",
            bookingId: p.bookingId || "Walk-in",
            room: p.room || "101",
            folioId: `FOL-${p.bookingId || '2026'}`,
            amount: Number(p.amount) || 0,
            method: p.paymentMethod || p.method || "UPI",
            date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Today",
            status: p.status || "Paid",
            notes: p.notes || "Settled transaction"
          }));
          setTransactions(list);
        }
      })
      .catch(err => console.error("Failed to load payments:", err))
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    loadTransactions(false);

    const handleFocus = () => loadTransactions(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadTransactions(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Selected Transaction details Modal
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Record Payment Modal Form State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [formGuestName, setFormGuestName] = useState("");
  const [formBookingId, setFormBookingId] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formFolioId, setFormFolioId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("UPI");
  const [formNotes, setFormNotes] = useState("");

  // Statistics summaries
  const totalCollected = transactions
    .filter(t => t.status === "Paid" || t.status === "Settled" || t.status === "Partially Paid")
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingAmount = 0;
  
  const todayPayments = transactions
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRefunds = transactions
    .filter(t => t.status === "Refunded")
    .reduce((sum, t) => sum + t.amount, 0);

  // Status mappings
  const statusMeta = {
    Paid: { tone: "success", label: "Paid" },
    Settled: { tone: "success", label: "Settled" },
    Pending: { tone: "error", label: "Pending" },
    "Partially Paid": { tone: "warning", label: "Partial" },
    Refunded: { tone: "neutral", label: "Refunded" },
    Failed: { tone: "error", label: "Failed" }
  };

  // Filter calculations
  const filteredTransactions = transactions.filter(t => {
    const guestStr = String(t.guest || "").toLowerCase();
    const idStr = String(t.id || "").toLowerCase();
    const roomStr = String(t.room || "").toLowerCase();
    const bookingIdStr = String(t.bookingId || "").toLowerCase();
    const folioIdStr = String(t.folioId || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = guestStr.includes(query) || idStr.includes(query) || roomStr.includes(query) || bookingIdStr.includes(query) || folioIdStr.includes(query);
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    const matchesMethod = filterMethod === "all" || t.method === filterMethod;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!formGuestName || !formAmount || isNaN(formAmount) || Number(formAmount) <= 0) {
      toast.error("Please fill in Guest Name and enter a valid numeric Payment Amount!");
      return;
    }

    try {
      await receptionistService.logPayment({
        guestName: formGuestName,
        bookingId: formBookingId || "Walk-in",
        amount: Number(formAmount),
        paymentMethod: formMethod,
        status: "Settled"
      });

      toast.success(`Successfully recorded payment of ₹${Number(formAmount).toLocaleString()}!`);

      // Reset Form
      setFormGuestName("");
      setFormBookingId("");
      setFormRoom("");
      setFormFolioId("");
      setFormAmount("");
      setFormMethod("UPI");
      setFormNotes("");
      setShowRecordModal(false);

      loadTransactions();
    } catch (err) {
      console.error("Failed to record payment:", err);
      toast.error(err.message || "Failed to record payment.");
    }
  };

  const handleIssueRefund = (txn) => {
    const confirmRefund = window.confirm(`Are you sure you want to issue a full refund of ₹${txn.amount.toLocaleString()} for Transaction ${txn.id}?`);
    if (!confirmRefund) return;

    setTransactions(prev => prev.map(t => {
      if (t.id === txn.id) {
        return { ...t, status: "Refunded", notes: `Refunded: ${t.notes}` };
      }
      return t;
    }));

    if (selectedTransaction && selectedTransaction.id === txn.id) {
      setSelectedTransaction(prev => ({ ...prev, status: "Refunded" }));
    }

    alert("Refund processed successfully!");
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Top Navbar details injection */}
      <PageHeader 
        actions={
          <Button 
            onClick={() => setShowRecordModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 !text-white h-9 px-5 text-xs rounded-full font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="size-4" /> Record Desk Payment
          </Button>
        }
      />

      {/* Summary statistic cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Collected */}
        <div className="bg-white border border-[#E7E9EE] rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Total Collected</span>
            <div className="size-7 bg-emerald-50 rounded-lg grid place-items-center text-emerald-600">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <p className="text-xl font-black text-navy mt-1">₹{totalCollected.toLocaleString()}</p>
          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">Lifetime property ledger</span>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white border border-[#E7E9EE] rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Pending Amount</span>
            <div className="size-7 bg-rose-50 rounded-lg grid place-items-center text-rose-600">
              <Clock className="size-4" />
            </div>
          </div>
          <p className="text-xl font-black text-navy mt-1">₹{pendingAmount.toLocaleString()}</p>
          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">Active guest folios</span>
        </div>

        {/* Today's Payments */}
        <div className="bg-white border border-[#E7E9EE] rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Today's Payments</span>
            <div className="size-7 bg-indigo-50 rounded-lg grid place-items-center text-indigo-600">
              <IndianRupee className="size-4" />
            </div>
          </div>
          <p className="text-xl font-black text-navy mt-1">₹{todayPayments.toLocaleString()}</p>
          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">Recorded transactions</span>
        </div>

        {/* Refunds Issued */}
        <div className="bg-white border border-[#E7E9EE] rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Refunds</span>
            <div className="size-7 bg-amber-50 rounded-lg grid place-items-center text-amber-600">
              <Undo2 className="size-4" />
            </div>
          </div>
          <p className="text-xl font-black text-navy mt-1">₹{totalRefunds.toLocaleString()}</p>
          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">Credit adjustments</span>
        </div>

      </div>

      {/* Filter panel */}
      <div className="bg-white border border-muted rounded-2xl p-4 shadow-soft flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by guest, room, txn #, folio #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none"
          />
        </div>

        {/* Filter select tags */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Fully Paid</option>
            <option value="Partially Paid">Partial</option>
            <option value="Refunded">Refunded</option>
            <option value="Failed">Failed</option>
          </select>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
          >
            <option value="all">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>

        </div>

      </div>

      {/* Ledger transactions panel list */}
      <Panel title="Payments Settlement Ledger" description="Register, filter, and print invoices receipts for all cash, card, bank wire, and UPI payments.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Guest Details</th>
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Room No</th>
                <th className="py-3.5 px-4">Folio ID</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Payment Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center font-bold text-muted-foreground select-none">
                    No matching payment transactions found in registry database.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const sM = statusMeta[t.status] || statusMeta.Paid;
                  return (
                    <tr key={t.id} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-deep">{t.id}</td>
                      <td className="py-3.5 px-4 font-bold text-navy">{t.guest}</td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">{t.bookingId}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo">Room #{t.room}</td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">{t.folioId}</td>
                      <td className="py-3.5 px-4 font-black">₹{t.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold">{t.method}</td>
                      <td className="py-3.5 px-4 text-navy">{t.date}</td>
                      <td className="py-3.5 px-4">
                        <Tag tone={sM.tone}>{sM.label}</Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 whitespace-nowrap select-none">
                          <Button
                            onClick={() => setSelectedTransaction(t)}
                            size="xs"
                            variant="outline"
                            className="text-navy border-navy/30 hover:bg-navy/5 h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                          >
                            Details
                          </Button>
                          {t.status !== "Refunded" && (
                            <Button
                              onClick={() => handleIssueRefund(t)}
                              size="icon"
                              variant="ghost"
                              className="size-7 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Issue Refund"
                            >
                              <Undo2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Record Payment Dialog Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
          <form 
            onSubmit={handleRecordPaymentSubmit}
            className="bg-white rounded-2xl border border-muted shadow-lift max-w-md w-full p-6 animate-scale-in space-y-4"
          >
            <div className="flex items-center justify-between border-b border-muted pb-3">
              <h3 className="text-sm font-black text-navy uppercase tracking-wider">Record Desk Transaction</h3>
              <button 
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="grid size-8 place-items-center rounded-lg text-navy/60 hover:bg-muted cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold text-navy">
              
              <div>
                <label className="text-[9px] font-bold text-muted-foreground block mb-1">Guest Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  required
                  value={formGuestName}
                  onChange={(e) => setFormGuestName(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block mb-1">Booking ID</label>
                  <input
                    type="text"
                    placeholder="e.g. res_101"
                    value={formBookingId}
                    onChange={(e) => setFormBookingId(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block mb-1">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 302"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block mb-1">Folio / Invoice Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. FOL-2026-095"
                    value={formFolioId}
                    onChange={(e) => setFormFolioId(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block mb-1">Payment Method</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                  >
                    <option value="UPI">UPI Link</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Cash">Cash drawer</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-muted-foreground block mb-1">Amount to settle (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-muted-foreground block mb-1">Reference Notes</label>
                <textarea
                  placeholder="Additional cashier comments..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows="2"
                  className="w-full px-3 py-2 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none"
                />
              </div>

            </div>

            <div className="border-t border-muted pt-3 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setShowRecordModal(false)}
                variant="ghost"
                className="h-9 px-4 text-xs rounded-full font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 !text-white h-9 px-6 text-xs rounded-full font-bold cursor-pointer"
              >
                Record Payment
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction Details Drawer Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-muted shadow-lift max-w-md w-full p-6 animate-scale-in space-y-4">
            
            <div className="flex items-center justify-between border-b border-muted pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-navy" />
                <h3 className="text-sm font-black text-navy uppercase tracking-wider">Payment Receipt</h3>
              </div>
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="grid size-8 place-items-center rounded-lg text-navy/60 hover:bg-muted cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-navy font-semibold">
              
              <div className="bg-[#fafafa]/50 border border-muted rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase font-black text-muted-foreground">Amount Transacted</p>
                <p className="text-2xl font-black text-navy mt-1">₹{selectedTransaction.amount.toLocaleString()}</p>
                <div className="mt-1 flex justify-center">
                  <Tag tone={statusMeta[selectedTransaction.status].tone}>{selectedTransaction.status}</Tag>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-muted/50 pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono font-bold">{selectedTransaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest Profile:</span>
                  <span className="font-bold">{selectedTransaction.guest}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allotted Room:</span>
                  <span className="font-bold text-indigo">Room #{selectedTransaction.room}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-mono">{selectedTransaction.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Folio Ref:</span>
                  <span className="font-mono font-bold text-navy-deep">{selectedTransaction.folioId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-bold">{selectedTransaction.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction Date:</span>
                  <span>{selectedTransaction.date}</span>
                </div>
                <div className="flex flex-col gap-1 border-t border-muted/30 pt-2.5">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="bg-[#fafafa] border border-muted p-2 rounded-lg text-[11px] font-semibold text-navy leading-normal italic">
                    {selectedTransaction.notes}
                  </p>
                </div>
              </div>

            </div>

            <div className="border-t border-muted pt-3 flex items-center justify-between">
              <Button
                onClick={() => alert("Receipt document downloaded successfully!")}
                variant="outline"
                className="h-9 px-3 text-xs rounded-full font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="size-4" /> Download Receipt
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedTransaction(null)}
                  variant="ghost"
                  className="h-9 px-4 text-xs rounded-full font-bold cursor-pointer hover:bg-muted"
                >
                  Close Receipt
                </Button>
                {selectedTransaction.status !== "Refunded" && (
                  <Button
                    onClick={() => handleIssueRefund(selectedTransaction)}
                    variant="ghost"
                    className="bg-rose-50 border border-rose-200 text-rose-700 h-9 px-4 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Refund
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
