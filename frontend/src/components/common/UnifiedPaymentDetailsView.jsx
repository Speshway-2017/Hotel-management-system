import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";
import { managerService } from "@/services/manager";
import { receptionistService } from "@/services/receptionist";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import {
  CreditCard, Download, Printer, CheckCircle2,
  Clock, Undo2, Building2, User, Receipt, IndianRupee,
  Calendar, Check, ShieldCheck, FileText, Sparkles
} from "lucide-react";

export function UnifiedPaymentDetailsView({ role = "admin" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const receiptRef = useRef(null);

  const getService = () => {
    if (role === "admin") return adminService;
    if (role === "manager") return managerService;
    return receptionistService;
  };

  const loadPaymentData = async () => {
    setLoading(true);
    const service = getService();
    try {
      const res = await service.getPayments();
      const list = (res && res.data && Array.isArray(res.data))
        ? res.data
        : (Array.isArray(res) ? res : []);

      // Find by _id or bookingId or match ID
      let found = list.find(p => String(p._id) === String(id) || String(p.id) === String(id) || String(p.bookingId) === String(id));

      setPayment(found || null);
    } catch (err) {
      console.error("Failed to load payment details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentData();

    const unsubscribe = subscribeRealtimeSync(() => {
      loadPaymentData();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, role]);

  const handleUpdateStatus = async (newStatus) => {
    if (!payment) return;
    setIsUpdating(true);
    const service = getService();
    try {
      await service.updatePayment(payment._id || id, { status: newStatus });
      toast.success(`Payment transaction marked as ${newStatus}!`);
      setPayment(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error(err.message || "Failed to update status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintOrDownload = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!payment) return;
    const headers = "Transaction ID,Booking ID,Guest Name,Room Number,Amount,Payment Method,Status,Date\n";
    const row = `"${payment._id || id}","${payment.bookingId}","${payment.guestName}","${payment.roomNumber}","${payment.amount}","${payment.paymentMethod}","${payment.status}","${new Date(payment.createdAt).toLocaleString()}"\n`;
    const blob = new Blob([headers + row], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt_${payment._id || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Payment receipt CSV downloaded.");
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-bold text-muted-foreground">
        Loading payment transaction details...
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-6 text-left">
        <div className="p-8 text-center space-y-4">
          <p className="text-sm font-bold text-navy">Payment record not found.</p>
        </div>
      </div>
    );
  }

  const tone = payment.status === "Settled" || payment.status === "Paid" ? "success" : payment.status === "Refunded" ? "error" : "warning";

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      {/* Top Bar with Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-muted pb-4">
        <div>
          <h2 className="text-lg font-black text-navy font-display flex items-center gap-2">
            Payment #{payment._id || id}
            <Tag tone={tone}>{payment.status}</Tag>
          </h2>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
            Booking Ref: <span className="font-mono text-indigo">{payment.bookingId}</span> • {new Date(payment.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Download & Print Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs font-bold rounded-xl border-muted hover:bg-muted/50 cursor-pointer flex items-center gap-1.5"
          >
            <Download className="size-3.5 text-navy" /> Export CSV
          </Button>
          <Button
            onClick={handlePrintOrDownload}
            className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-4 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="size-3.5" /> Print / Download Receipt
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" ref={receiptRef}>
        
        {/* Left 2 Cols: Detailed Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Guest & Reservation Card */}
          <Panel title="Guest & Reservation Particulars" description="Occupancy and guest details associated with this transaction.">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white rounded-b-xl">
              
              <div className="p-3.5 bg-muted/20 border border-muted rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Guest Information</span>
                <p className="text-sm font-bold text-navy flex items-center gap-1.5">
                  <User className="size-4 text-brand" /> {payment.guestName}
                </p>
                <p className="text-muted-foreground font-semibold">Allocated: <span className="font-bold text-navy">Room #{payment.roomNumber}</span></p>
              </div>

              <div className="p-3.5 bg-muted/20 border border-muted rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Booking Reference</span>
                <p className="text-sm font-mono font-bold text-indigo flex items-center gap-1.5">
                  <FileText className="size-4 text-indigo" /> {payment.bookingId}
                </p>
                <p className="text-muted-foreground font-semibold">Property: <span className="font-bold text-navy">Speshway Luxury Hotel</span></p>
              </div>

            </div>
          </Panel>

          {/* Payment Financial Voucher Table */}
          <Panel title="Financial Settlement Ledger" description="Itemized billing breakdown and statutory GST calculation.">
            <div className="p-5 bg-white rounded-b-xl space-y-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-muted text-[10px] uppercase font-bold text-muted-foreground">
                    <th className="py-2.5">Description</th>
                    <th className="py-2.5">Rate Plan</th>
                    <th className="py-2.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/40 font-semibold">
                  <tr>
                    <td className="py-3 font-bold text-navy">Room Tariff & Accommodation Charges</td>
                    <td className="py-3 text-muted-foreground">Room Plan Charges</td>
                    <td className="py-3 text-right font-bold text-navy">₹{Math.round(payment.amount / 1.18).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-navy">Integrated Goods & Service Tax (IGST 18%)</td>
                    <td className="py-3 text-muted-foreground">Statutory GST Slab</td>
                    <td className="py-3 text-right font-bold text-navy">₹{(payment.amount - Math.round(payment.amount / 1.18)).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-muted/15 font-black text-sm">
                    <td className="py-3 px-2 text-navy" colSpan="2">Total Paid Amount</td>
                    <td className="py-3 px-2 text-right text-emerald-600 font-display">₹{payment.amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" /> Payment Fully Captured & Reconciled
                </span>
                <span>Balance Due: ₹0</span>
              </div>
            </div>
          </Panel>

        </div>

        {/* Right Col: Transaction Metadata & Status Management */}
        <div className="space-y-6">
          
          <Panel title="Payment Metadata" description="Technical details and gateway audit log.">
            <div className="p-5 space-y-4 text-xs bg-white rounded-b-xl">
              
              <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
                <span className="text-muted-foreground font-semibold">Transaction ID:</span>
                <span className="font-mono font-bold text-navy">{payment._id || id}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
                <span className="text-muted-foreground font-semibold">Payment Channel:</span>
                <span className="font-bold text-navy flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-brand" /> {payment.paymentMethod}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
                <span className="text-muted-foreground font-semibold">Captured Date:</span>
                <span className="font-medium text-navy">
                  {new Date(payment.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
                <span className="text-muted-foreground font-semibold">Captured Time:</span>
                <span className="font-medium text-navy">
                  {new Date(payment.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground font-semibold">Gateway Status:</span>
                <Tag tone={tone}>{payment.status}</Tag>
              </div>

              {/* Status Update Actions */}
              <div className="pt-4 border-t border-muted space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Update Payment Status
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    disabled={isUpdating || payment.status === "Settled"}
                    onClick={() => handleUpdateStatus("Settled")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-[11px] rounded-lg cursor-pointer"
                  >
                    <Check className="size-3 mr-1" /> Settled
                  </Button>
                  <Button
                    size="sm"
                    disabled={isUpdating || payment.status === "Pending"}
                    onClick={() => handleUpdateStatus("Pending")}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-8 text-[11px] rounded-lg cursor-pointer"
                  >
                    <Clock className="size-3 mr-1" /> Pending
                  </Button>
                  <Button
                    size="sm"
                    disabled={isUpdating || payment.status === "Refunded"}
                    onClick={() => handleUpdateStatus("Refunded")}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 text-[11px] rounded-lg cursor-pointer"
                  >
                    <Undo2 className="size-3 mr-1" /> Refund
                  </Button>
                </div>
              </div>

            </div>
          </Panel>

        </div>

      </div>

    </div>
  );
}
