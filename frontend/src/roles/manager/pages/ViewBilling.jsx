import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import {
  Receipt,
  Calendar,
  User,
  CreditCard,
  DollarSign,
  Briefcase,
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";

// India rupee formatting helper
const formatRupee = (num) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(num);
};

function ManagerViewBilling() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "manager") {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    const loadInvoiceDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        let decodedId = id;
        try {
          decodedId = atob(id);
        } catch (e) {
          decodedId = id;
        }
        const billingRes = await managerService.getBilling();
        
        let foundInvoice = null;
        if (billingRes.success && billingRes.data) {
          const list = billingRes.data.map((r, idx) => {
            const rid = r._id || r.id;
            const totalAmount = Number(r.totalAmount !== undefined && r.totalAmount !== null ? r.totalAmount : (r.amount || 0));
            const balance = r.balance === undefined ? 0 : Number(r.balance);
            const paidAmount = r.paidAmount !== undefined ? Number(r.paidAmount) : Math.max(0, totalAmount - balance);
            const discountAmount = Number(r.discountAmount || r.discount || 0);
            const couponCode = r.couponCode || null;
            const originalAmount = Number(r.originalAmount || (totalAmount + discountAmount));
            const baseRoomCharges = Math.round(originalAmount / 1.18);
            const gstTaxes = originalAmount - baseRoomCharges;
            const paymentStatus = balance === 0 ? "Paid" : balance === totalAmount ? "Unpaid" : "Partial";
            const invoiceStatus = r.status === "Cancelled" ? "Cancelled" : "Issued";

            return {
              id: `INV-${rid.substring(0, 4).toUpperCase()}-10${idx + 1}`,
              bookingId: rid,
              guest: r.guest,
              room: r.room || "101",
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              roomCharges: baseRoomCharges,
              serviceCharges: 0,
              discounts: discountAmount,
              couponCode: couponCode,
              taxes: gstTaxes,
              totalAmount,
              paidAmount,
              balance,
              paymentStatus,
              invoiceStatus,
              issuedDate: r.checkIn
            };
          });
          foundInvoice = list.find(inv => inv.bookingId === decodedId || inv.id === decodedId || inv.bookingId === id || inv.id === id);
        }

        if (foundInvoice) {
          // Simulated payments ledger details
          const paymentLogs = [];
          if (foundInvoice.paidAmount > 0) {
            paymentLogs.push({
              txnId: `TXN-${foundInvoice.bookingId.substring(0, 4).toUpperCase()}-701`,
              date: foundInvoice.checkIn,
              mode: foundInvoice.totalAmount > 6000 ? "Credit Card" : "UPI (GPay)",
              amount: foundInvoice.paidAmount,
              status: "Successful"
            });
          }

          setInvoice({
            ...foundInvoice,
            paymentLogs
          });
        } else {
          setError("Invoice folio details record not found.");
        }

      } catch (err) {
        setError(err.message || "Failed to load invoice folio details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadInvoiceDetails();
  }, [id]);

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view invoice details for this property. Scoped hotel access only.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      <PageHeader
        title={invoice ? `Folio ${invoice.id}` : "Billing Details"}
        subtitle="Itemized room charges ledger, taxes (GST), discounts, and transaction payments."
      />

      {error && <Notice tone="error" title="Folio Sync Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : invoice ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main invoice breakdown */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Folio Header Info */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <User className="size-5 text-brand" />
                  <h4 className="font-semibold text-navy text-sm font-display">Guest & Folio Info</h4>
                </div>
                <div className="flex gap-2">
                  <Tag tone={
                    invoice.paymentStatus === "Paid" ? "success" :
                    invoice.paymentStatus === "Partial" ? "warning" : "error"
                  }>
                    Payment: {invoice.paymentStatus}
                  </Tag>
                  <Tag tone={
                    invoice.invoiceStatus === "Issued" ? "success" :
                    invoice.invoiceStatus === "Draft" ? "neutral" : "error"
                  }>
                    Invoice: {invoice.invoiceStatus}
                  </Tag>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Guest Name</span>
                  <strong className="text-navy-deep text-sm block mt-0.5">{invoice.guest}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Booking Reference ID</span>
                  <span className="font-mono font-semibold block mt-0.5">#{invoice.bookingId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Assigned Room</span>
                  <strong className="text-brand block mt-0.5 text-sm">Room {invoice.room}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Stay Duration Dates</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-muted-foreground">
                    <Calendar className="size-4 shrink-0" />
                    <span>{invoice.checkIn} → {invoice.checkOut}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro Payments ledger */}
            <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
              <div className="p-4 bg-[#fcfcfc] border-b border-muted flex items-center gap-2">
                <CreditCard className="size-4.5 text-brand" />
                <h4 className="font-semibold text-navy text-sm font-display">Payments Ledger</h4>
              </div>

              {invoice.paymentLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No payment transactions captured yet. (Stay balance is fully outstanding)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                        <th className="py-3.5 px-6">Transaction ID</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Payment Mode</th>
                        <th className="py-3.5 px-4 text-right">Amount</th>
                        <th className="py-3.5 px-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                      {invoice.paymentLogs.map((p, i) => (
                        <tr key={i} className="hover:bg-[#fcfcfc]/60 transition-colors whitespace-nowrap">
                          <td className="py-3.5 px-6 font-mono font-bold text-navy-deep">{p.txnId}</td>
                          <td className="py-3.5 px-4 text-muted-foreground">{p.date}</td>
                          <td className="py-3.5 px-4 text-navy-deep">{p.mode}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-brand">{formatRupee(p.amount)}</td>
                          <td className="py-3.5 px-6 text-center">
                            <Tag tone="success">{p.status}</Tag>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar details breakdown */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Folio Breakdown */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4 text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Receipt className="size-4.5 text-brand" />
                <h4 className="font-semibold text-navy text-sm font-display">Invoice Breakdown</h4>
              </div>

              <div className="space-y-3.5 text-xs text-navy font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Room Tariff Charges</span>
                  <span className="font-mono text-navy-deep">{formatRupee(invoice.roomCharges)}</span>
                </div>
                {invoice.serviceCharges > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Add-on / Service Charges</span>
                    <span className="font-mono text-navy-deep">{formatRupee(invoice.serviceCharges)}</span>
                  </div>
                )}
                {invoice.discounts > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 font-semibold">
                    <span>Coupon Promo ({invoice.couponCode || 'APPLIED'})</span>
                    <span className="font-mono">-{formatRupee(invoice.discounts)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">GST Taxes (18% Statutory)</span>
                  <span className="font-mono text-navy-deep">{formatRupee(invoice.taxes)}</span>
                </div>
                
                <div className="pt-3 border-t border-muted flex justify-between items-center text-sm font-bold">
                  <span className="text-navy-deep">Grand Total</span>
                  <span className="font-mono text-brand">{formatRupee(invoice.totalAmount)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-mono text-success">{formatRupee(invoice.paidAmount)}</span>
                </div>

                <div className="pt-2 border-t border-muted/50 flex justify-between items-center text-sm font-bold text-purple">
                  <span>Outstanding Balance</span>
                  <span className="font-mono">{formatRupee(invoice.balance)}</span>
                </div>
              </div>
            </div>

            {/* Manager Warning Audit info */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-3 text-left">
              <div className="flex items-center gap-2 pb-2 text-warning">
                <AlertCircle className="size-4.5" />
                <h4 className="font-semibold text-navy text-xs font-display">System Audit Note</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                As Property Manager, you have viewing and monitoring authorization for billing ledger audit tracking. Modifications, invoice reversals, or refund operations must be processed through corporate permissions.
              </p>
            </div>

          </div>

        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/manager/billing/view/$id")({
  component: ManagerViewBilling
});
