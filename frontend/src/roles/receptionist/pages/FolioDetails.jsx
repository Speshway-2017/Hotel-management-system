import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, Upload, FileText, CheckCircle2, AlertOctagon, HelpCircle, ArrowLeft, Receipt, CreditCard, Mail, Printer, Undo2
} from "lucide-react";

export const Route = createFileRoute("/reception/folio/$id")({
  head: () => ({
    meta: [
      { title: "Folio Details Console — Hour Stay" },
      { name: "description", content: "Guest folio billing details, split invoices, credit card payments and tax logs." }
    ]
  }),
  component: ReceptionFolioDetailsPage
});

import { receptionistService } from "@/services/receptionist";

function ReceptionFolioDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [folio, setFolio] = useState(null);

  const realBookingId = id.replace(/^FOL-\d{4}-|^FOL-/, '');

  const loadFolioDetails = () => {
    setLoading(true);
    receptionistService.getFolioDetails(realBookingId)
      .then(res => {
        if (res.success && res.data) {
          const f = res.data;
          f.guest = f.guestName;
          f.room = f.roomNo;
          f.dates = f.stayDates;
          f.balance = f.balanceDue;
          f.type = 'Guest Room Billing';
          setFolio(f);
        }
      })
      .catch(err => console.error("Failed to query folio items:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFolioDetails();
  }, [id]);

  // Quick Action form inputs
  const [addCategory, setAddCategory] = useState("F&B POS");
  const [addDesc, setAddDesc] = useState("Dinner Room Service");
  const [addQty, setAddQty] = useState("1");
  const [addPrice, setAddPrice] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");

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
      alert("Please enter a valid numeric unit price!");
      return;
    }
    const qty = parseInt(addQty || "1");
    const price = Number(addPrice);
    const itemTotal = price * qty;

    receptionistService.postFolioCharge(realBookingId, itemTotal, addDesc, addCategory)
      .then(res => {
        if (res.success) {
          alert("Incidental charge posted to guest folio successfully!");
          setAddPrice("");
          loadFolioDetails();
        }
      })
      .catch(err => {
        console.error("Failed to post folio charge:", err);
        alert(err.message || "Failed to post folio charge.");
      });
  };

  const handleRecordPayment = () => {
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
      alert("Please enter a valid payment amount!");
      return;
    }
    const payAmt = Number(paymentAmount);
    
    receptionistService.postFolioPayment(realBookingId, payAmt, paymentMethod)
      .then(res => {
        if (res.success) {
          alert(`Payment of ₹${payAmt.toLocaleString()} recorded successfully via ${paymentMethod}!`);
          setPaymentAmount("");
          loadFolioDetails();
        }
      })
      .catch(err => {
        console.error("Failed to record folio payment:", err);
        alert(err.message || "Failed to record folio payment.");
      });
  };

  const handleApplyDiscount = () => {
    if (!discountAmount || isNaN(discountAmount) || Number(discountAmount) <= 0) {
      alert("Please enter a valid discount amount!");
      return;
    }
    const disc = Number(discountAmount);
    const newItem = {
      category: "Adjustments",
      desc: "Promotional discount adjustment",
      qty: 1,
      price: -disc,
      tax: 0,
      total: -disc
    };

    setFolio(prev => {
      const updatedItems = [...prev.items, newItem];
      const newTotal = updatedItems.reduce((s, item) => s + item.total, 0);
      const newBalance = Math.max(0, newTotal - prev.amountPaid);
      return {
        ...prev,
        items: updatedItems,
        balance: newBalance,
        paymentStatus: newBalance === 0 ? "Paid" : "Partial"
      };
    });

    setDiscountAmount("");
    alert("Discount adjustment applied successfully!");
  };

  const handleRefundAdjustment = () => {
    if (!refundAmount || isNaN(refundAmount) || Number(refundAmount) <= 0) {
      alert("Please enter a valid refund adjustment amount!");
      return;
    }
    const refund = Number(refundAmount);
    setFolio(prev => {
      const newPaid = Math.max(0, prev.amountPaid - refund);
      const totalCharges = calculateTotalCharges(prev);
      return {
        ...prev,
        amountPaid: newPaid,
        balance: totalCharges - newPaid,
        paymentStatus: "Refunded"
      };
    });

    setRefundAmount("");
    alert("Refund payment adjustment recorded successfully!");
  };

  const handleCloseInvoice = () => {
    if (folio.balance > 0) {
      alert("Cannot close folio invoice. There is an outstanding balance remaining!");
      return;
    }
    setFolio(prev => ({ ...prev, status: "Closed" }));
    alert("Folio invoice marked as Closed successfully!");
  };

  if (loading || !folio) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading folio ledger dossier...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Page header navigation override */}
      <PageHeader />

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left main block */}
        <div className="md:col-span-2 space-y-6">
          
          <Panel title="Folio Transactions Logs" description="Review room tariffs, incidental postings, taxes and payments received.">
            <div className="p-6 space-y-6">
              
              {/* Stat summary items */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-muted p-3.5 rounded-xl space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Total Charges</p>
                  <p className="font-black text-navy text-sm">₹{calculateTotalCharges(folio).toLocaleString()}</p>
                </div>
                <div className="border border-muted p-3.5 rounded-xl space-y-1 text-emerald-600">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Amount Settled</p>
                  <p className="font-black text-sm">₹{folio.amountPaid.toLocaleString()}</p>
                </div>
                <div className={`border border-muted p-3.5 rounded-xl space-y-1 ${folio.balance > 0 ? "text-rose-600 animate-pulse" : "text-emerald-700"}`}>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Balance Outstanding</p>
                  <p className="font-black text-sm">₹{folio.balance.toLocaleString()}</p>
                </div>
              </div>

              {/* Transaction list */}
              <div className="border border-muted rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left bg-white">
                  <thead>
                    <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Tax (18%)</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30 font-semibold">
                    {folio.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/5">
                        <td className="py-2.5 px-3 text-indigo font-bold">{item.category}</td>
                        <td className="py-2.5 px-3">{item.desc}</td>
                        <td className="py-2.5 px-3 text-center">{item.qty}</td>
                        <td className="py-2.5 px-3 text-right">₹{item.price.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">₹{item.tax.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-black">₹{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action buttons footer */}
              <div className="flex gap-2 border-t border-muted/50 pt-5 mt-2">
                <Button 
                  onClick={() => alert("Invoice printed successfully!")}
                  variant="outline"
                  className="h-9 px-4 text-xs rounded-full font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="size-4" /> Print Copy
                </Button>
                <Button 
                  onClick={() => alert("Invoice dispatched to email!")}
                  variant="outline"
                  className="h-9 px-4 text-xs rounded-full font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Mail className="size-4" /> Email Invoice
                </Button>
                {folio.status === "Active" && (
                  <Button 
                    onClick={handleCloseInvoice}
                    className="ml-auto bg-emerald-600 hover:bg-emerald-700 !text-white h-9 px-6 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Lock & Close Folio
                  </Button>
                )}
              </div>

            </div>
          </Panel>

        </div>

        {/* Right action control column */}
        <div className="space-y-6">
          
          {/* Post incidental charges */}
          <Panel title="Add Account Charges" description="Post F&B dining or laundry incidentals.">
            <div className="p-4 space-y-3.5 text-xs font-semibold text-navy">
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Category</label>
                <select 
                  value={addCategory} 
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full h-9 px-2.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                >
                  <option value="F&B POS">Food & Beverage (POS)</option>
                  <option value="Laundry POS">Laundry POS</option>
                  <option value="Incidentals">Incidentals</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Description</label>
                <input 
                  type="text" 
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="w-full h-9 px-2.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Qty</label>
                  <input 
                    type="number" 
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="w-full h-9 px-2.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Unit Price (₹)</label>
                  <input 
                    type="number" 
                    value={addPrice}
                    placeholder="e.g. 500"
                    onChange={(e) => setAddPrice(e.target.value)}
                    className="w-full h-9 px-2.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                  />
                </div>
              </div>
              <Button 
                onClick={handlePostCharge}
                className="w-full bg-navy hover:bg-navy-deep text-white h-9 text-xs rounded-xl font-bold cursor-pointer"
              >
                Post Charge
              </Button>
            </div>
          </Panel>

          {/* Settle outstanding payments */}
          <Panel title="Folio Credit Adjustments" description="Collect payments or apply discount vouchers.">
            <div className="p-4 space-y-4 text-xs font-semibold text-navy">
              <div className="space-y-2 border-b border-muted pb-3.5">
                <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none">Record desk payment</p>
                <div className="flex gap-2">
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="px-2.5 h-9 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-1/3"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                  <input 
                    type="number" 
                    placeholder="Amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="px-2.5 h-9 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none w-1/3"
                  />
                  <Button 
                    onClick={handleRecordPayment}
                    className="bg-emerald-600 hover:bg-emerald-700 !text-white h-9 rounded-xl text-xs font-bold cursor-pointer w-1/3"
                  >
                    Pay
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Apply Discount (₹)</label>
                  <div className="flex gap-1">
                    <input 
                      type="number" 
                      placeholder="e.g. 500"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-full h-8 px-2 border border-[#E7E9EE] bg-white rounded-lg text-xs font-bold text-navy focus:outline-none"
                    />
                    <Button 
                      onClick={handleApplyDiscount}
                      className="bg-navy hover:bg-navy-deep text-white text-[10px] font-bold h-8 rounded-lg cursor-pointer px-2.5 shrink-0"
                    >
                      Credit
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Rebate Refund (₹)</label>
                  <div className="flex gap-1">
                    <input 
                      type="number" 
                      placeholder="e.g. 1000"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full h-8 px-2 border border-[#E7E9EE] bg-white rounded-lg text-xs font-bold text-navy focus:outline-none"
                    />
                    <Button 
                      onClick={handleRefundAdjustment}
                      variant="ghost"
                      className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold h-8 rounded-lg cursor-pointer px-2.5 shrink-0"
                    >
                      Refund
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

        </div>

      </div>

    </div>
  );
}
