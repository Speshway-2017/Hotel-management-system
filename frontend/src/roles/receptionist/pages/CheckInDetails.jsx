import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, Upload, FileText, CheckCircle2, AlertOctagon, HelpCircle, ArrowLeft
} from "lucide-react";

export const Route = createFileRoute("/reception/check-in/$id")({
  head: () => ({
    meta: [
      { title: "Guest Check-in Details — Hour Stay" },
      { name: "description", content: "Guest check-in wizard and profile details validation." }
    ]
  }),
  component: ReceptionCheckInDetailsPage
});

import { receptionistService } from "@/services/receptionist";

function ReceptionCheckInDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(null);

  // Wizard state machine
  const [step, setStep] = useState(1); // 1: Profile verification, 2: ID Upload, 3: Surcharges & Room, 4: Settle & Check-in
  
  // Input states
  const [assignedRoom, setAssignedRoom] = useState("");
  const [idUploaded, setIdUploaded] = useState(false);
  const [idType, setIdType] = useState("Aadhaar");
  const [idNumber, setIdNumber] = useState("");
  const [earlyCheckInFee, setEarlyCheckInFee] = useState(0);
  const [nameDiscrepancy, setNameDiscrepancy] = useState(false);
  const [roomDirtyBlock, setRoomDirtyBlock] = useState(false);
  const [suggestedAlternative, setSuggestedAlternative] = useState("304 (Clean)");
  const [collectedPayment, setCollectedPayment] = useState(0);

  useEffect(() => {
    setLoading(true);
    receptionistService.getReservations()
      .then(res => {
        if (res.success && res.data) {
          const found = res.data.find(b => b.id === id);
          if (found) {
            found.name = found.guest;
            found.type = found.roomType || 'Deluxe Room';
            found.amountPaid = found.amount - found.balance;
            setGuest(found);
            setAssignedRoom(found.room ? found.room.split(' ')[0] : '101');
            setCollectedPayment(found.balance);
          } else {
            console.warn("Reservation not found for checkin.");
          }
        }
      })
      .catch(err => console.error("Failed to load reservation details for checkin:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFinishCheckIn = () => {
    receptionistService.updateReservationStatus(guest.id || guest._id, 'Checked-in', assignedRoom)
      .then(res => {
        if (res.success) {
          alert(`Guest ${guest.name} successfully Checked In to Room #${assignedRoom}!`);
          navigate("/reception/check-in");
        }
      })
      .catch(err => {
        console.error("Failed to check-in guest:", err);
        alert(err.message || "Failed to check-in guest.");
      });
  };

  if (loading || !guest) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading guest check-in wizard...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Dynamic navbar header injection */}
      <PageHeader />

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Wizard Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Check-in Placement Wizard" description="Process guest arrivals, assign rooms, upload ID proofs, and collect payments.">
            
            <div className="p-6 space-y-6">
              
              {/* Step indicator bar */}
              <div className="flex items-center justify-between mb-6 border-b border-muted/50 pb-5 select-none text-[10px] font-bold">
                {[
                  { s: 1, label: "Profile" },
                  { s: 2, label: "ID Verification" },
                  { s: 3, label: "Room Allotment" },
                  { s: 4, label: "Final Settlement" }
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
                    {idx < 3 && (
                      <div className={`h-0.5 flex-1 mx-4 ${step > st.s + 0.5 ? "bg-emerald-500" : "bg-muted"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Profile Verification */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">1. Profile Details & Reservation Matches</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground text-[10px]">Guest Full Name</p>
                      <p className="font-bold mt-0.5 text-navy">{guest.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Contact Mobile</p>
                      <p className="font-bold mt-0.5 text-navy">{guest.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Email Address</p>
                      <p className="font-bold mt-0.5 text-navy">{guest.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Occupancy (Pax)</p>
                      <p className="font-bold mt-0.5 text-navy">{guest.pax}</p>
                    </div>
                  </div>

                  <div className="bg-[#fafafa]/50 border border-muted p-4 rounded-xl flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="discrepancy"
                      checked={nameDiscrepancy}
                      onChange={(e) => setNameDiscrepancy(e.target.checked)}
                      className="size-4 text-navy cursor-pointer"
                    />
                    <label htmlFor="discrepancy" className="text-xs font-semibold text-navy cursor-pointer">
                      Flag profile discrepancy (Name doesn't match ID registry profile)
                    </label>
                  </div>

                  {nameDiscrepancy && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold p-3.5 rounded-xl flex items-start gap-2 animate-shake">
                      <ShieldAlert className="size-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">Name Discrepancy Flag Active</p>
                        <p className="mt-0.5">Please add cashier override notes to bypass security audit log block.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: ID Upload */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">2. Document Identification Proof</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">ID Type</label>
                      <select 
                        value={idType} 
                        onChange={(e) => setIdType(e.target.value)}
                        className="w-full h-10 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                      >
                        <option value="Aadhaar">Aadhaar Card</option>
                        <option value="Passport">Passport</option>
                        <option value="Driver's License">Driver's License</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">ID Number Reference</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 5621-xxxx-xxxx"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        className="w-full h-10 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-muted rounded-2xl p-6 text-center hover:bg-muted/10 cursor-pointer transition-all">
                    <Upload className="size-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs font-bold text-navy">Click to upload ID scan document file</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG or PDF formats up to 5MB</p>
                  </div>
                </div>
              )}

              {/* Step 3: Surcharges & Room Assignment */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">3. Room Allotment Validation</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Room Category Assigned</label>
                      <input 
                        type="text" 
                        value={guest.type} 
                        disabled
                        className="w-full h-10 px-3 border border-muted bg-[#f5f5f5] rounded-xl text-xs font-bold text-muted-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Room Number</label>
                      <input 
                        type="text" 
                        value={assignedRoom} 
                        onChange={(e) => setAssignedRoom(e.target.value)}
                        className="w-full h-10 px-3 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Early Check-in alert */}
                  {earlyCheckInFee > 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold p-3.5 rounded-xl flex items-start gap-2">
                      <Clock className="size-4 mt-0.5 shrink-0 animate-bounce" />
                      <div>
                        <p className="font-bold">Early Check-in Warning Detected</p>
                        <p className="mt-0.5">Guest is check-in ahead of regular 02:00 PM hours. Apply standard ₹1,500 check-in fee surcharge.</p>
                      </div>
                    </div>
                  )}

                  {/* Room status blocked alert */}
                  {roomDirtyBlock && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11px] p-4 rounded-xl space-y-2 animate-shake">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold">Room #{assignedRoom} is currently DIRTY status</p>
                          <p className="mt-0.5 font-semibold">Housekeeping has not inspected this room yet. Allotment is locked.</p>
                        </div>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-rose-100 flex items-center justify-between text-xs text-navy font-bold">
                        <span>Suggested Clean Room alternative:</span>
                        <Button 
                          type="button"
                          onClick={() => {
                            setAssignedRoom("404");
                            setRoomDirtyBlock(false);
                          }}
                          className="bg-navy hover:bg-navy-deep text-white h-6 px-3 rounded text-[10px] cursor-pointer"
                        >
                          Allot Room #404
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Settle & Check-in */}
              {step === 4 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">4. Payment Settlements</h4>
                  
                  <div className="bg-[#fafafa]/50 border border-muted p-4 rounded-xl grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div>
                      <p className="text-muted-foreground text-[10px]">Room Charges Due</p>
                      <p className="font-black text-navy text-sm">₹{guest.balance.toLocaleString()}</p>
                    </div>
                    {earlyCheckInFee > 0 && (
                      <div>
                        <p className="text-muted-foreground text-[10px]">Early Check-in Surcharge</p>
                        <p className="font-black text-amber-700 text-sm">₹{earlyCheckInFee.toLocaleString()}</p>
                      </div>
                    )}
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
                    <Link to="/reception/check-in">Cancel</Link>
                  </Button>
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 3 && roomDirtyBlock) {
                        alert("Cannot proceed. Selected room is dirty!");
                        return;
                      }
                      setStep(prev => prev + 1);
                    }}
                    className="bg-navy hover:bg-navy-deep text-white h-9 px-5 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleFinishCheckIn}
                    className="bg-emerald-600 hover:bg-emerald-700 !text-white h-9 px-6 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Confirm Check-in
                  </Button>
                )}
              </div>

            </div>

          </Panel>
        </div>

        {/* Right Sticky Summary Column */}
        <div className="space-y-6">
          <Panel title="Allotment Details" description="Summary calculations.">
            <div className="p-4 space-y-4 text-xs font-semibold text-navy">
              <div className="space-y-2 border-b border-muted pb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest Profile Name:</span>
                  <span className="font-bold">{guest.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Category:</span>
                  <span className="font-bold">{guest.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Room:</span>
                  <span className="font-bold text-indigo">Room #{assignedRoom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stay Dates:</span>
                  <span className="font-bold text-right">{guest.checkIn} - {guest.checkOut}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stay Nights:</span>
                  <span>{guest.nights} Nights</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Balance Due:</span>
                  <span>₹{guest.balance.toLocaleString()}</span>
                </div>
                {earlyCheckInFee > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Surcharge:</span>
                    <span>+₹{earlyCheckInFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-muted/50 pt-2 text-sm font-black text-navy-deep">
                  <span>Final Total:</span>
                  <span>₹{(guest.balance + earlyCheckInFee).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

      </div>

    </div>
  );
}
