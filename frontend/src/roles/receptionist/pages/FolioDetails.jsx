import { createFileRoute } from "@tanstack/react-router";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { 
  Receipt, 
  CreditCard, 
  Printer, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  PlusCircle, 
  Calendar, 
  Home, 
  User, 
  Phone, 
  Tag, 
  SlidersHorizontal, 
  ShieldCheck, 
  RotateCcw, 
  FileText,
  Percent,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BedDouble,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { receptionistService } from "@/services/receptionist";
import { subscribeRealtimeSync } from "@/services/socket";

export const Route = createFileRoute("/reception/folio/$id")({
  head: () => ({
    meta: [
      { title: "Guest Digital Folio — Reception Console" },
      { name: "description", content: "Itemized billing dossier, incidental postings, payments received, and tax breakdown." }
    ]
  }),
  component: ReceptionFolioDetailsPage
});

function getCategoryBadge(category) {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('room') || cat.includes('tariff') || cat.includes('stay')) {
    return {
      label: category || "Room Tariff",
      className: "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
    };
  }
  if (cat.includes('f&b') || cat.includes('food') || cat.includes('dining') || cat.includes('beverage') || cat.includes('service')) {
    return {
      label: category || "Food & Beverage",
      className: "bg-amber-50 text-amber-700 border border-amber-200/60"
    };
  }
  if (cat.includes('laundry')) {
    return {
      label: category || "Laundry POS",
      className: "bg-sky-50 text-sky-700 border border-sky-200/60"
    };
  }
  if (cat.includes('discount') || cat.includes('coupon') || cat.includes('promo')) {
    return {
      label: category || "Discount",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
    };
  }
  if (cat.includes('refund') || cat.includes('rebate')) {
    return {
      label: category || "Refund / Rebate",
      className: "bg-rose-50 text-rose-700 border border-rose-200/60"
    };
  }
  return {
    label: category || "Incidentals",
    className: "bg-purple/10 text-purple border border-purple/20"
  };
}

function ReceptionFolioDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [folio, setFolio] = useState(null);
  const [showAdjustments, setShowAdjustments] = useState(false);

  const realBookingId = useMemo(() => {
    return String(id || '').replace(/^FOL-\d{4}-|^FOL-/, '');
  }, [id]);

  const loadFolioDetails = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    receptionistService.getFolioDetails(realBookingId)
      .then(res => {
        if (res.success && res.data) {
          const f = res.data;
          f.guest = f.guestName;
          f.room = f.roomNo;
          f.dates = f.stayDates;
          f.balance = Number(f.balanceDue !== undefined ? f.balanceDue : f.balance || 0);
          f.type = 'Guest Room Billing';
          setFolio(f);
        } else if (!isSilent) {
          toast.error("Folio record not found.");
        }
      })
      .catch(err => {
        console.error("Failed to query folio items:", err);
        if (!isSilent) toast.error("Unable to load folio record.");
      })
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    loadFolioDetails();
    const unsubscribe = subscribeRealtimeSync(() => {
      loadFolioDetails(true);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  // Quick Action Form Inputs
  const [addCategory, setAddCategory] = useState("F&B POS");
  const [addDesc, setAddDesc] = useState("Dinner Room Service");
  const [addQty, setAddQty] = useState("1");
  const [addPrice, setAddPrice] = useState("");
  const [postingCharge, setPostingCharge] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [discountAmount, setDiscountAmount] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const calculateTotalCharges = (fol) => {
    if (!fol) return 0;
    if (Array.isArray(fol.items) && fol.items.length > 0) {
      return fol.items.reduce((sum, item) => sum + (Number(item?.total) || Number(item?.amount) || 0), 0);
    }
    return Number(fol.totalCharges) || Number(fol.totalAmount) || Number(fol.amount) || Number(fol.total) || 0;
  };

  const handlePostCharge = () => {
    if (!addPrice || isNaN(addPrice) || Number(addPrice) <= 0) {
      toast.error("Please enter a valid numeric unit price.");
      return;
    }
    const qty = parseInt(addQty || "1", 10) || 1;
    const price = Number(addPrice);
    const itemTotal = price * qty;

    setPostingCharge(true);
    receptionistService.postFolioCharge(realBookingId, itemTotal, addDesc, addCategory)
      .then(res => {
        if (res.success) {
          toast.success(`Charge of ₹${itemTotal.toLocaleString('en-IN')} posted to folio successfully!`);
          setAddPrice("");
          loadFolioDetails(true);
        } else {
          toast.error(res.message || "Failed to post charge.");
        }
      })
      .catch(err => {
        console.error("Failed to post folio charge:", err);
        toast.error(err.message || "Failed to post folio charge.");
      })
      .finally(() => {
        setPostingCharge(false);
      });
  };

  const handleRecordPayment = () => {
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }
    const payAmt = Number(paymentAmount);

    setRecordingPayment(true);
    receptionistService.postFolioPayment(realBookingId, payAmt, paymentMethod)
      .then(res => {
        if (res.success) {
          toast.success(`Payment of ₹${payAmt.toLocaleString('en-IN')} recorded successfully via ${paymentMethod}!`);
          setPaymentAmount("");
          loadFolioDetails(true);
        } else {
          toast.error(res.message || "Failed to record payment.");
        }
      })
      .catch(err => {
        console.error("Failed to record folio payment:", err);
        toast.error(err.message || "Failed to record folio payment.");
      })
      .finally(() => {
        setRecordingPayment(false);
      });
  };

  const handleApplyDiscount = () => {
    if (!discountAmount || isNaN(discountAmount) || Number(discountAmount) <= 0) {
      toast.error("Please enter a valid discount amount.");
      return;
    }
    const disc = Number(discountAmount);
    const newItem = {
      category: "Discount",
      desc: "Promotional / Courtesy discount adjustment",
      qty: 1,
      price: -disc,
      tax: 0,
      total: -disc
    };

    setFolio(prev => {
      const updatedItems = [...(prev.items || []), newItem];
      const newTotal = updatedItems.reduce((s, item) => s + item.total, 0);
      const newBalance = Math.max(0, newTotal - (prev.amountPaid || 0));
      return {
        ...prev,
        items: updatedItems,
        balance: newBalance,
        paymentStatus: newBalance === 0 ? "Paid" : "Partial"
      };
    });

    setDiscountAmount("");
    toast.success(`Discount credit of ₹${disc.toLocaleString('en-IN')} applied successfully.`);
  };

  const handleRefundAdjustment = () => {
    if (!refundAmount || isNaN(refundAmount) || Number(refundAmount) <= 0) {
      toast.error("Please enter a valid refund adjustment amount.");
      return;
    }
    const refund = Number(refundAmount);
    setFolio(prev => {
      const newPaid = Math.max(0, (prev.amountPaid || 0) - refund);
      const totalCharges = calculateTotalCharges(prev);
      return {
        ...prev,
        amountPaid: newPaid,
        balance: totalCharges - newPaid,
        paymentStatus: "Refunded"
      };
    });

    setRefundAmount("");
    toast.success(`Refund adjustment of ₹${refund.toLocaleString('en-IN')} recorded successfully.`);
  };

  const handleCloseInvoice = () => {
    if (folio.balance > 0) {
      toast.error(`Cannot close folio invoice. There is an outstanding balance of ₹${folio.balance.toLocaleString('en-IN')}!`);
      return;
    }
    setFolio(prev => ({ ...prev, status: "Closed" }));
    toast.success("Folio invoice marked as Closed & Settled successfully!");
  };

  const handlePrint = () => {
    toast.info("Preparing digital folio invoice for printing...");
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleEmailInvoice = () => {
    const targetEmail = folio?.guestEmail || "guest@example.com";
    toast.success(`Digital folio invoice dispatched to ${targetEmail} successfully!`);
  };

  if (loading || !folio) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="size-8 border-3 border-navy/20 border-t-navy rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-muted-foreground">Loading digital folio ledger...</p>
      </div>
    );
  }

  const totalCharges = calculateTotalCharges(folio);
  const isSettled = Number(folio.balance || 0) <= 0;
  const isClosed = folio.status === "Closed";

  // Pre-tax and Tax Breakdown estimation
  const estimatedTax = (folio.items || []).reduce((acc, it) => acc + (Number(it.tax) || 0), 0);
  const baseSubtotal = totalCharges - estimatedTax;

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy print:space-y-4">
      
      {/* 1. Header Toolbar (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-navy bg-muted/30 border border-muted px-3 py-1.5 rounded-xl">
            {folio.id || `FOL-${realBookingId}`}
          </span>
          <span className={`px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
            isClosed 
              ? "bg-slate-100 text-slate-700 border-slate-200" 
              : isSettled 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {isClosed ? (
              <><Lock className="size-3" /> Closed</>
            ) : isSettled ? (
              <><CheckCircle2 className="size-3" /> Settled</>
            ) : (
              <><AlertCircle className="size-3" /> Active Dues</>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <Button 
            onClick={handlePrint}
            variant="outline"
            className="h-9 px-3.5 text-xs rounded-xl font-bold border-muted cursor-pointer flex items-center gap-1.5 bg-white hover:bg-muted/20"
          >
            <Printer className="size-3.5 text-navy/70" /> Print Folio
          </Button>

          <Button 
            onClick={handleEmailInvoice}
            variant="outline"
            className="h-9 px-3.5 text-xs rounded-xl font-bold border-muted cursor-pointer flex items-center gap-1.5 bg-white hover:bg-muted/20"
          >
            <Mail className="size-3.5 text-navy/70" /> Email Invoice
          </Button>

          {!isClosed ? (
            <Button 
              onClick={handleCloseInvoice}
              disabled={!isSettled}
              className={`h-9 px-4 text-xs rounded-xl font-bold cursor-pointer transition-all ${
                isSettled 
                  ? "bg-emerald-600 hover:bg-emerald-700 !text-white shadow-soft" 
                  : "bg-muted/50 text-muted-foreground cursor-not-allowed border border-muted"
              }`}
              title={isSettled ? "Archive and lock folio" : "Balance must be zero before closing folio"}
            >
              <CheckCircle2 className="size-3.5 mr-1.5" /> Lock & Close Folio
            </Button>
          ) : (
            <span className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Lock className="size-3.5 text-slate-500" /> Folio Closed
            </span>
          )}
        </div>
      </div>

      {/* 2. Top 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        
        {/* Total Charges */}
        <div className="bg-white rounded-2xl border border-muted p-4 sm:p-5 shadow-soft flex items-center gap-4">
          <div className="size-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Receipt className="size-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Total Charges</p>
            <p className="text-lg font-black text-navy truncate">₹{totalCharges.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-muted-foreground truncate">{folio.items?.length || 0} line items billed</p>
          </div>
        </div>

        {/* Amount Settled */}
        <div className="bg-white rounded-2xl border border-muted p-4 sm:p-5 shadow-soft flex items-center gap-4">
          <div className="size-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Amount Settled</p>
            <p className="text-lg font-black text-emerald-600 truncate">₹{Number(folio.amountPaid || 0).toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-muted-foreground truncate">Verified payments</p>
          </div>
        </div>

        {/* Balance Due */}
        <div className="bg-white rounded-2xl border border-muted p-4 sm:p-5 shadow-soft flex items-center gap-4">
          <div className={`size-11 rounded-xl border flex items-center justify-center shrink-0 ${
            folio.balance > 0 ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
          }`}>
            <AlertCircle className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Balance Due</p>
            <p className={`text-lg font-black truncate ${folio.balance > 0 ? "text-rose-600" : "text-emerald-700"}`}>
              ₹{Number(folio.balance || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {folio.balance > 0 ? "Pending collection" : "Zero balance — all clear"}
            </p>
          </div>
        </div>

        {/* Settlement Status */}
        <div className="bg-white rounded-2xl border border-muted p-4 sm:p-5 shadow-soft flex items-center gap-4">
          <div className="size-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5 text-sky-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">Account Status</p>
            <p className="text-base font-black text-navy truncate">
              {isClosed ? "Archived / Closed" : isSettled ? "Fully Paid" : "Pending Settlement"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {isClosed ? "Billing cycle finalized" : isSettled ? "Ready for checkout" : "Requires settlement"}
            </p>
          </div>
        </div>

      </div>

      {/* 3. Guest & Stay Dossier Card */}
      <div className="bg-white rounded-2xl border border-muted p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-muted pb-4">
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-gradient-to-br from-navy to-navy-deep text-white font-black text-sm flex items-center justify-center shrink-0 shadow-soft">
              {folio.guest ? folio.guest.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "G"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-navy">{folio.guest}</h2>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-200/60">
                  Room {folio.room || "Unassigned"}
                </span>
                <span className="text-xs text-muted-foreground hidden md:inline">
                  • {folio.roomType || "Standard Suite"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Booking Ref: <strong className="font-mono text-navy font-semibold">#{realBookingId}</strong> • Source: {folio.source || "Front Desk"}
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-medium sm:text-right">
            <p className="flex items-center gap-1.5 sm:justify-end">
              <Calendar className="size-3.5 text-navy/60" />
              <span>Stay: <strong>{folio.dates || folio.stayDates || "Current Stay"}</strong></span>
            </p>
            {folio.guestPhone && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Contact: <span className="font-mono">{folio.guestPhone}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-[#fcfcfc] border border-muted/80 p-3 rounded-xl space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned Suite</span>
            <p className="font-bold text-navy text-xs">Room {folio.room || "TBD"} ({folio.roomType || "Standard"})</p>
          </div>
          <div className="bg-[#fcfcfc] border border-muted/80 p-3 rounded-xl space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Stay Duration</span>
            <p className="font-bold text-navy text-xs">{folio.nights || 1} {(folio.nights || 1) === 1 ? 'Night' : 'Nights'} Stay</p>
          </div>
          <div className="bg-[#fcfcfc] border border-muted/80 p-3 rounded-xl space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pax Occupancy</span>
            <p className="font-bold text-navy text-xs">{folio.pax || "1 Guest"}</p>
          </div>
          <div className="bg-[#fcfcfc] border border-muted/80 p-3 rounded-xl space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Billing Cycle</span>
            <p className="font-bold text-emerald-700 text-xs">{isSettled ? "Settled (Clear)" : "Open (Dues Pending)"}</p>
          </div>
        </div>
      </div>

      {/* 4. Main 2-Column Working Area (2/3 Table + 1/3 Controls) */}
      <div className="grid gap-6 lg:grid-cols-3 print:grid-cols-1">
        
        {/* Left Column: Line Items Table & Accounting Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-2xl border border-muted shadow-soft overflow-hidden">
            
            {/* Table Header */}
            <div className="p-4 sm:p-5 border-b border-muted flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-navy">Itemized Transactions Ledger</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed record of room tariffs, incidental dining, laundry, and adjustments.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-muted/30 border border-muted text-navy rounded-lg text-xs font-bold">
                {folio.items?.length || 0} entries
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#fcfcfc] border-b border-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Tax (GST)</th>
                    <th className="py-3 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/60 font-medium">
                  {folio.items && folio.items.length > 0 ? (
                    folio.items.map((item, idx) => {
                      const badge = getCategoryBadge(item.category);
                      const isNegative = Number(item.total || item.amount || 0) < 0;
                      return (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-block ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-navy block">{item.desc}</span>
                          </td>
                          <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                            {item.qty || 1}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                            ₹{Math.abs(Number(item.price || 0)).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                            {Number(item.tax || 0) > 0 ? `₹${Number(item.tax).toLocaleString('en-IN')}` : "—"}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold font-mono whitespace-nowrap ${
                            isNegative ? "text-emerald-700" : "text-navy"
                          }`}>
                            {isNegative ? `-₹${Math.abs(Number(item.total || item.amount || 0)).toLocaleString('en-IN')}` : `₹${Number(item.total || item.amount || 0).toLocaleString('en-IN')}`}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                        No transactions found in this folio dossier.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="p-5 sm:p-6 bg-[#fcfcfc] border-t border-muted grid gap-6 sm:grid-cols-2 items-end">
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5 font-bold text-navy text-[11px]">
                  <ShieldCheck className="size-4 text-emerald-600" /> GST Compliant Hospitality Folio
                </p>
                <p className="text-[11px] leading-relaxed">
                  Tax invoice complies with statutory GST slab rates (SAC Code 9963). Front-desk settlements are synchronized in real time.
                </p>
              </div>

              <div className="space-y-2 text-xs font-semibold text-navy">
                <div className="flex justify-between items-center py-1 border-b border-muted/50">
                  <span className="text-muted-foreground">Net Accommodation & POS:</span>
                  <span className="font-mono">₹{Math.max(0, baseSubtotal).toLocaleString('en-IN')}</span>
                </div>
                {estimatedTax > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-muted/50">
                    <span className="text-muted-foreground">Statutory GST (18%):</span>
                    <span className="font-mono">₹{estimatedTax.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-b border-muted/50 font-bold">
                  <span className="text-navy">Total Charges Billed:</span>
                  <span className="font-mono">₹{totalCharges.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-muted/50 text-emerald-700">
                  <span>Payments & Credits Received:</span>
                  <span className="font-mono">-₹{Number(folio.amountPaid || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm font-black">
                  <span className="text-navy">Net Balance Outstanding:</span>
                  <span className={`font-mono text-base ${folio.balance > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    ₹{Number(folio.balance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Front-Desk Operational Controls (Hidden on Print) */}
        <div className="space-y-5 print:hidden">
          
          {/* Action Card 1: Post Incidental Charges */}
          <div className="bg-white rounded-2xl border border-muted p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 border-b border-muted pb-3">
              <div className="size-8 rounded-lg bg-navy/5 flex items-center justify-center shrink-0">
                <PlusCircle className="size-4 text-navy" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-navy">Post Incidental Charge</h4>
                <p className="text-[10px] text-muted-foreground">Add F&B dining, laundry, or minibar charges.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-semibold text-navy">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Charge Category</label>
                <select 
                  value={addCategory} 
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-muted bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                >
                  <option value="F&B POS">Food & Beverage (POS)</option>
                  <option value="Room Service">Room Service Dining</option>
                  <option value="Laundry POS">Laundry POS</option>
                  <option value="Mini-Bar">Mini-Bar Consumables</option>
                  <option value="Spa & Wellness">Spa & Wellness</option>
                  <option value="Incidentals">Incidentals & Damage</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Description / Item Name</label>
                <input 
                  type="text" 
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  placeholder="e.g. Dinner Room Service"
                  className="w-full h-10 px-3 border border-muted bg-white rounded-xl text-xs font-medium text-navy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="w-full h-10 px-3 border border-muted bg-white rounded-xl text-xs font-bold text-navy focus:outline-none text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Unit Price (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={addPrice}
                    placeholder="e.g. 450"
                    onChange={(e) => setAddPrice(e.target.value)}
                    className="w-full h-10 px-3 border border-muted bg-white rounded-xl text-xs font-bold text-navy focus:outline-none text-right font-mono"
                  />
                </div>
              </div>

              {addPrice && Number(addPrice) > 0 && (
                <div className="p-2.5 rounded-xl bg-muted/20 border border-muted/50 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Charge to post:</span>
                  <span className="font-bold text-navy font-mono">
                    ₹{((parseInt(addQty || "1", 10) || 1) * Number(addPrice)).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <Button 
                onClick={handlePostCharge}
                disabled={postingCharge || !addPrice || isClosed}
                className="w-full bg-navy hover:bg-navy-deep text-white h-10 text-xs rounded-xl font-bold cursor-pointer transition-all shadow-soft"
              >
                {postingCharge ? "Posting Charge..." : "Post Charge to Folio"}
              </Button>
            </div>
          </div>

          {/* Action Card 2: Record Desk Payment */}
          <div className="bg-white rounded-2xl border border-muted p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-muted pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CreditCard className="size-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-navy">Record Desk Payment</h4>
                  <p className="text-[10px] text-muted-foreground">Collect UPI, Card, or Cash payments.</p>
                </div>
              </div>

              {folio.balance > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(folio.balance))}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200 cursor-pointer transition-colors"
                >
                  Pay Full (₹{folio.balance.toLocaleString('en-IN')})
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs font-semibold text-navy">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Payment Method</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 border border-muted bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                >
                  <option value="UPI">UPI (QR / PhonePe / GPay)</option>
                  <option value="Card">Credit / Debit Card (POS Terminal)</option>
                  <option value="Cash">Cash at Desk</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Amount to Settle (₹)</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder={`e.g. ${folio.balance || 1000}`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full h-10 px-3 border border-muted bg-white rounded-xl text-xs font-bold text-navy focus:outline-none font-mono"
                />
              </div>

              <Button 
                onClick={handleRecordPayment}
                disabled={recordingPayment || !paymentAmount || isClosed}
                className="w-full bg-emerald-600 hover:bg-emerald-700 !text-white h-10 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-soft"
              >
                {recordingPayment ? "Recording Payment..." : "Record Payment"}
              </Button>
            </div>
          </div>

          {/* Action Card 3: Courtesy Adjustments & Discounts */}
          <div className="bg-white rounded-2xl border border-muted p-5 shadow-soft space-y-3">
            <button
              type="button"
              onClick={() => setShowAdjustments(prev => !prev)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-purple/10 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="size-4 text-purple" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-navy group-hover:text-purple transition-colors">Credits & Adjustments</h4>
                  <p className="text-[10px] text-muted-foreground">Apply courtesy discount or record refund.</p>
                </div>
              </div>
              {showAdjustments ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {showAdjustments && (
              <div className="pt-3 border-t border-muted space-y-4 text-xs font-semibold text-navy animate-fade-in">
                {/* Courtesy Discount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Apply Discount (₹)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="e.g. 500"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-full h-9 px-3 border border-muted bg-white rounded-xl text-xs font-bold text-navy focus:outline-none font-mono"
                    />
                    <Button 
                      onClick={handleApplyDiscount}
                      disabled={!discountAmount || isClosed}
                      className="bg-navy hover:bg-navy-deep text-white text-xs font-bold h-9 rounded-xl cursor-pointer px-4 shrink-0"
                    >
                      Credit
                    </Button>
                  </div>
                </div>

                {/* Refund Adjustment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Record Refund (₹)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="e.g. 1000"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full h-9 px-3 border border-muted bg-white rounded-xl text-xs font-bold text-navy focus:outline-none font-mono"
                    />
                    <Button 
                      onClick={handleRefundAdjustment}
                      disabled={!refundAmount || isClosed}
                      variant="ghost"
                      className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold h-9 rounded-xl cursor-pointer px-4 shrink-0"
                    >
                      Refund
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
