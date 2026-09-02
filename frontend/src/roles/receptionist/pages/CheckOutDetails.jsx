import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, Upload, FileText, CheckCircle2, AlertOctagon, HelpCircle, ArrowLeft, Receipt, CreditCard
} from "lucide-react";

export const Route = createFileRoute("/reception/check-out/$id")({
  head: () => ({
    meta: [
      { title: "Guest Check-out Details — Hour Stay" },
      { name: "description", content: "Guest checkout folio wizard, itemized POS billing review and payment collection." }
    ]
  }),
  component: ReceptionCheckOutDetailsPage
});

import { toast } from "sonner";
import { receptionistService } from "@/services/receptionist";

function ReceptionCheckOutDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(null);

  // Wizard state machine
  const [step, setStep] = useState(1); // 1: Stay review, 2: POS Itemized charges, 3: Settle Payments, 4: Confirmed checkout
  
  // Late Checkout auto calculations
  const [lateCheckoutFee, setLateCheckoutFee] = useState(0);
  const [corporateAccount, setCorporateAccount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [collectedPayment, setCollectedPayment] = useState(0);

  useEffect(() => {
    setLoading(true);
    receptionistService.getReservations()
      .then(res => {
        if (res.success && res.data) {
          const found = res.data.find(b => 
            String(b._id) === String(id) || 
            String(b.id) === String(id) || 
            String(b.bookingId) === String(id)
          );
          if (found) {
            found.name = found.guest || found.name;
            found.type = found.roomType || 'Deluxe Room';
            found.amountPaid = Number(found.amount || 0) - Number(found.balance || 0);
            setGuest(found);
            setCollectedPayment(found.balance || 0);
          } else {
            toast.error("Departure reservation record not found.");
          }
        }
      })
      .catch(err => console.error("Failed to load departure details:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFinishCheckout = () => {
    // If balance remains, process payment first
    const processCheckoutStatus = () => {
      receptionistService.updateReservationStatus(guest._id || guest.id, 'Checked-out')
        .then(res => {
          if (res.success) {
            toast.success(`Guest ${guest.name} has been Checked Out successfully. Room #${guest.room} is now dirty housekeeping status.`);
            navigate("/reception/check-out");
          } else {
            toast.error(res.message || "Failed to complete checkout.");
          }
        })
        .catch(err => {
          console.error("Failed to check-out guest:", err);
          toast.error(err.message || "Failed to update guest check-out status.");
        });
    };

    if (guest.balance > 0) {
      receptionistService.postFolioPayment(guest._id || guest.id, guest.balance, paymentMethod)
        .then(res => {
          if (res.success) {
            processCheckoutStatus();
          } else {
            toast.error(res.message || "Payment recording failed.");
          }
        })
        .catch(err => {
          console.error("Failed to settle checkout balance:", err);
          toast.error(err.message || "Failed to settle folio balance during checkout.");
        });
    } else {
      processCheckoutStatus();
    }
  };

  if (loading || !guest) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading guest check-out wizard...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Top Header navbar redirect */}
      <PageHeader />

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left wizard column */}
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Checkout Folio Ledger" description="Verify guest incidentals POS postings, process final payment settlement, and confirm check-out.">
            
            <div className="p-6 space-y-6">
              
              {/* Step indicator bar */}
              <div className="flex items-center justify-between mb-6 border-b border-muted/50 pb-5 select-none text-[10px] font-bold">
                {[
                  { s: 1, label: "Stay Info" },
                  { s: 2, label: "POS Incidentals" },
                  { s: 3, label: "Folio Settlement" }
                ].map((st, idx) => (
                  <div key={st.s} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`grid size-6 place-items-center rounded-full border text-[10px] font-black ${
                        step === st.s
                          ? "bg-navy text-cream border-navy"
                          : step > st.s
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-muted text-muted-foreground border-muted"
                      }`}>
                        {step > st.s ? "✓" : st.s}
                      </span>
                      <span className={step === st.s ? "text-navy" : "text-muted-foreground"}>{st.label}</span>
                    </div>
                    {idx < 2 && (
                      <div className={`h-0.5 flex-1 mx-4 ${step > st.s + 0.5 ? "bg-emerald-500" : "bg-muted"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Stay Info Review */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">1. Profile Details & Reservation Matches</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div>
                      <p className="text-muted-foreground text-[10px]">Guest Full Name</p>
                      <p className="font-bold text-navy mt-0.5">{guest.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Contact Mobile</p>
                      <p className="font-bold text-navy mt-0.5">{guest.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Room Number</p>
                      <p className="font-bold text-navy mt-0.5">Room #{guest.room}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Room Category</p>
                      <p className="font-bold text-navy mt-0.5">{guest.type}</p>
                    </div>
                  </div>

                  {lateCheckoutFee > 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold p-3.5 rounded-xl flex items-start gap-2">
                      <Clock className="size-4 mt-0.5 shrink-0 animate-bounce" />
                      <div>
                        <p className="font-bold">Late Checkout Warning Detected</p>
                        <p className="mt-0.5">Guest is checkout past standard 11:00 AM hours. Apply standard ₹2,000 late check-out fee surcharge.</p>
                      </div>
                    </div>
                  )}

                  {corporateAccount && (
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold p-3.5 rounded-xl flex items-start gap-2">
                      <ShieldAlert className="size-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">Corporate Direct Billing Account</p>
                        <p className="mt-0.5">All room charges are billed direct to corporate invoice ledger. Collect F&B/POS incidentals only.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: POS Incidentals */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">2. Itemized POS incidentals</h4>
                  
                  <div className="border border-muted rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted/30 font-semibold">
                        <tr>
                          <td className="py-2.5 px-3">Room Tariff</td>
                          <td className="py-2.5 px-3">{guest.nights} Nights stays ({guest.type})</td>
                          <td className="py-2.5 px-3 text-right">₹{guest.balance.toLocaleString()}</td>
                        </tr>
                        {lateCheckoutFee > 0 && (
                          <tr>
                            <td className="py-2.5 px-3 text-amber-700">Surcharge</td>
                            <td className="py-2.5 px-3">Late Checkout Fee</td>
                            <td className="py-2.5 px-3 text-right">₹{lateCheckoutFee.toLocaleString()}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="py-2.5 px-3 text-indigo">F&B Room Service</td>
                          <td className="py-2.5 px-3">Minibar snack drawer consumption</td>
                          <td className="py-2.5 px-3 text-right">₹1,200</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 3: Folio Payment Settlement */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">3. Folio Settlement</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Payment Method</label>
                      <select 
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full h-10 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                      >
                        <option value="UPI">UPI Link</option>
                        <option value="Card">Credit/Debit Card</option>
                        <option value="Cash">Cash drawer</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Amount Collected (₹)</label>
                      <input 
                        type="number" 
                        value={collectedPayment}
                        onChange={(e) => setCollectedPayment(Number(e.target.value))}
                        className="w-full h-10 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form buttons */}
              <div className="flex justify-between items-center pt-5 border-t border-muted/50 mt-8 shrink-0">
                {step > 1 ? (
                  <Button
                    type="button"
                    onClick={() => setStep(prev => prev - 1)}
                    variant="outline"
                    className="h-9 px-4 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Back
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    className="h-9 px-4 text-xs rounded-full font-bold cursor-pointer text-muted-foreground hover:bg-muted"
                  >
                    <Link to="/reception/check-out">Cancel</Link>
                  </Button>
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={() => setStep(prev => prev + 1)}
                    className="bg-navy hover:bg-navy-deep text-white h-9 px-5 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleFinishCheckout}
                    className="bg-emerald-600 hover:bg-emerald-700 !text-white h-9 px-6 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Confirm Checkout
                  </Button>
                )}
              </div>

            </div>

          </Panel>
        </div>

        {/* Right sticky column */}
        <div className="space-y-6">
          <Panel title="Ledger Summary" description="Billing check-offs.">
            <div className="p-4 space-y-4 text-xs font-semibold text-navy">
              <div className="space-y-2 border-b border-muted pb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest Name:</span>
                  <span className="font-bold">{guest.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room Number:</span>
                  <span className="font-bold text-indigo">Room #{guest.room}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dates:</span>
                  <span className="font-bold">{guest.checkIn} - {guest.checkOut}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stay Balance:</span>
                  <span>₹{guest.balance.toLocaleString()}</span>
                </div>
                {lateCheckoutFee > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Late Checkout:</span>
                    <span>+₹{lateCheckoutFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-indigo">
                  <span>Incidentals:</span>
                  <span>+₹1,200</span>
                </div>
                <div className="flex justify-between border-t border-muted/50 pt-2 text-sm font-black text-navy-deep">
                  <span>Grand Total:</span>
                  <span>₹{(guest.balance + lateCheckoutFee + 1200).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

      </div>

    </div>
  );
}
