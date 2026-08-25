import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { receptionistService } from "@/services/receptionist";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, FileText, CheckCircle2, AlertOctagon, HelpCircle,
  CheckCircle, ArrowRight, Printer, RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/reception/new-booking")({
  head: () => ({
    meta: [
      { title: "New Reservation Desk — Hour Stay" },
      { name: "description", content: "Create new guest walk-in or phone reservations." }
    ]
  }),
  component: NewReservationPage
});

function NewReservationPage() {
  const todayStr = "25 Aug 2026";
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedBookingId, setGeneratedBookingId] = useState("");

  // Step 1: Guest Details State
  const [guestType, setGuestType] = useState("new"); // "new" or "existing"
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [idType, setIdType] = useState("Aadhaar");
  const [idNumber, setIdNumber] = useState("");
  const [adults, setAdults] = useState("2");
  const [childrenCount, setChildrenCount] = useState("0");
  const [guestTier, setGuestTier] = useState("Classic Guest");

  // Step 2: Stay Details State
  const [checkIn, setCheckIn] = useState("2026-08-25");
  const [checkOut, setCheckOut] = useState("2026-08-27");
  const [nights, setNights] = useState(2);
  const [roomType, setRoomType] = useState("Deluxe King");
  const [roomsCount, setRoomsCount] = useState("1");
  const [assignedRoom, setAssignedRoom] = useState("312");
  const [extraBed, setExtraBed] = useState("None");
  const [specialRequests, setSpecialRequests] = useState("");

  // Step 3: Booking Details State
  const [source, setSource] = useState("Walk-in");
  const [ratePlan, setRatePlan] = useState("Standard Bed & Breakfast");
  const [discount, setDiscount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);

  // Step 4: Payment Details State
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [amountPaid, setAmountPaid] = useState(0);

  // Computed values
  const roomRates = {
    "Standard Room": 3500,
    "Deluxe Room": 4800,
    "Deluxe King": 6200,
    "Executive Room": 8500,
    "Villa Suite": 12500,
    "Premium Deluxe": 7500,
    "Enterprise Suite": 14000,
    "Classic Double": 4500
  };

  const currentRate = roomRates[roomType] || 4500;
  const baseTotal = currentRate * nights * parseInt(roomsCount || "1");
  const taxAmount = Math.round(baseTotal * 0.18);
  const subtotal = baseTotal + taxAmount + Number(additionalCharges);
  const totalAmount = Math.max(0, subtotal - Number(discount));
  const balanceDue = Math.max(0, totalAmount - Number(amountPaid));
  const paymentStatus = amountPaid === 0 ? "Pending" : balanceDue === 0 ? "Paid" : "Deposit Paid";

  // Calculate nights when checkIn/checkOut change
  useEffect(() => {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = d2.getTime() - d1.getTime();
    if (diff > 0) {
      setNights(Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } else {
      setNights(1);
    }
  }, [checkIn, checkOut]);

  // Mock list of clean available rooms by type
  const cleanAvailableRooms = {
    "Standard Room": ["105", "106", "110"],
    "Deluxe Room": ["202", "203", "204"],
    "Deluxe King": ["312", "315", "318"],
    "Executive Room": ["201", "205"],
    "Villa Suite": ["102", "107"],
    "Premium Deluxe": ["302", "306"],
    "Enterprise Suite": ["206"],
    "Classic Double": ["108", "111"]
  };

  // Assign first available room when room type changes
  useEffect(() => {
    const available = cleanAvailableRooms[roomType] || [];
    if (available.length > 0) {
      setAssignedRoom(available[0]);
    }
  }, [roomType]);

  // Pre-fill existing guest mock helper
  const handleExistingGuestSelect = () => {
    setGuestName("Vikram Rathore");
    setGuestPhone("+91 98765 01234");
    setGuestEmail("vikram.rathore@outlook.com");
    setIdType("Aadhaar");
    setIdNumber("3456-7890-1234");
    setGuestType("existing");
  };

  // Submit trigger
  const handleConfirmReservation = () => {
    if (!guestName || !guestPhone) {
      alert("Please fill in Guest Name and Mobile Number!");
      return;
    }
    const data = {
      guest: guestName,
      phone: guestPhone,
      email: guestEmail,
      room: `${assignedRoom}·${roomType}`,
      checkIn,
      checkOut,
      nights,
      pax: `${adults} Adults`,
      source,
      amount: totalAmount,
      balance: balanceDue
    };
    receptionistService.createReservation(data)
      .then(res => {
        if (res.success && res.data) {
          setGeneratedBookingId(res.data.id || res.data._id);
          setIsSuccess(true);
        }
      })
      .catch(err => {
        console.error("Failed to create reservation:", err);
        alert(err.message || "Failed to create reservation.");
      });
  };

  const resetForm = () => {
    setIsSuccess(false);
    setCurrentStep(1);
    setGuestName("");
    setGuestPhone("");
    setGuestEmail("");
    setIdNumber("");
    setSpecialRequests("");
    setDiscount(0);
    setAdditionalCharges(0);
    setAmountPaid(0);
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      

      {isSuccess ? (
        /* Success State View */
        <div className="bg-white border border-muted rounded-2xl p-8 max-w-xl mx-auto shadow-lift text-center space-y-6 animate-scale-in">
          <CheckCircle2 className="size-16 text-emerald-500 mx-auto animate-bounce" />
          
          <div>
            <h3 className="text-lg font-black text-navy uppercase tracking-wider">Reservation Confirmed</h3>
            <p className="text-xs text-emerald-600 font-bold mt-1">Booking reference ID generated successfully.</p>
          </div>

          <div className="border border-muted rounded-xl p-4 text-left space-y-2.5 max-w-md mx-auto text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking ID:</span>
              <span className="font-mono font-bold text-base text-navy-deep">{generatedBookingId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guest Name:</span>
              <span className="font-bold">{guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assigned Room:</span>
              <span className="font-bold text-emerald-600">Room #{assignedRoom} ({roomType})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stay dates:</span>
              <span className="font-bold">{checkIn} to {checkOut} ({nights} Nights)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total billed:</span>
              <span className="font-black text-navy">₹{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Status:</span>
              <span className="font-bold text-emerald-600">{paymentStatus} (UPI)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-muted/50">
            <Button
              asChild
              className="bg-navy hover:bg-navy-deep text-white h-9 px-5 text-xs rounded-full font-bold cursor-pointer"
            >
              <Link to="/reception/reservations">View Reservations</Link>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => alert("Confirmation slip printed successfully!")}
              className="h-9 px-4 text-xs rounded-full font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="size-4" /> Print slip
            </Button>

            <Button
              onClick={resetForm}
              variant="ghost"
              className="h-9 px-4 text-xs rounded-full font-bold cursor-pointer flex items-center gap-1.5 hover:bg-muted"
            >
              <RefreshCw className="size-4" /> Make Another
            </Button>
          </div>
        </div>
      ) : (
        /* Wizard Booking Steps View */
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Left Columns: Form Steps Wizard */}
          <div className="lg:col-span-2 space-y-6">
            
            <Panel title="Reservation Placement Form" description="Complete the fields below to register guest check-in allocations.">
              <div className="p-6 space-y-6">
              
              {/* Step indicator bar */}
              <div className="flex items-center justify-between mb-8 border-b border-muted/50 pb-5 select-none text-[10px] font-bold">
                {[
                  { s: 1, label: "Guest" },
                  { s: 2, label: "Stay" },
                  { s: 3, label: "Billing" },
                  { s: 4, label: "Payment" }
                ].map((step, idx) => (
                  <div key={step.s} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`grid size-6 place-items-center rounded-full border text-[10px] font-black ${
                        currentStep === step.s
                          ? "bg-navy text-white border-navy"
                          : currentStep > step.s
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-muted text-muted-foreground border-muted"
                      }`}>
                        {currentStep > step.s ? "✓" : step.s}
                      </span>
                      <span className={currentStep === step.s ? "text-navy" : "text-muted-foreground"}>{step.label}</span>
                    </div>
                    {idx < 3 && (
                      <div className={`h-0.5 flex-1 mx-4 ${currentStep > step.s + 0.5 ? "bg-emerald-500" : "bg-muted"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Guest details */}
              {currentStep === 1 && (
                <div className="space-y-6 text-left">
                  
                  {/* Existing Guest quick selector */}
                  <div className="flex items-center justify-between p-3.5 bg-[#fafafa]/50 border border-muted rounded-xl">
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Guest Registry Lookup</p>
                      <p className="text-xs text-navy font-bold mt-1">Pre-fill details for a returning customer.</p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleExistingGuestSelect}
                      variant="outline"
                      className="h-8 text-xs font-bold px-4 rounded-full border-muted cursor-pointer hover:bg-muted"
                    >
                      Lookup guest
                    </Button>
                  </div>

                  {/* Section 1: Contact info */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">1. Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Guest Full Name</label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Mobile Contact Number</label>
                        <input
                          type="text"
                          placeholder="+91 98765 43210"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Email Address</label>
                        <input
                          type="email"
                          placeholder="john.doe@gmail.com"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Guest VIP Tier</label>
                        <select
                          value={guestTier}
                          onChange={(e) => setGuestTier(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                        >
                          <option value="Classic Guest">Classic Guest</option>
                          <option value="Silver Member">Silver Member</option>
                          <option value="Gold Elite">Gold Elite</option>
                          <option value="Platinum VIP">Platinum VIP</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: ID and Occupancy */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">2. Identification & Occupancy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">ID Type</label>
                        <select
                          value={idType}
                          onChange={(e) => setIdType(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                        >
                          <option value="Aadhaar">Aadhaar Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driver's License">Driver's License</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">ID Number</label>
                        <input
                          type="text"
                          placeholder="4567-xxxx-xxxx"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Adults Count</label>
                        <select
                          value={adults}
                          onChange={(e) => setAdults(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                        >
                          <option value="1">1 Adult</option>
                          <option value="2">2 Adults</option>
                          <option value="3">3 Adults</option>
                          <option value="4">4 Adults</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Children Count</label>
                        <select
                          value={childrenCount}
                          onChange={(e) => setChildrenCount(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                        >
                          <option value="0">No Children</option>
                          <option value="1">1 Child</option>
                          <option value="2">2 Children</option>
                          <option value="3">3 Children</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Step 2: Stay Details */}
              {currentStep === 2 && (
                <div className="space-y-6 text-left">
                  
                  {/* Section 1: Stay Dates */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">1. Stay Timeline</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Check-in Date</label>
                        <input
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Check-out Date</label>
                        <input
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Room Assignment */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">2. Room Rack Block</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Selected Room Category</label>
                        <select
                          value={roomType}
                          onChange={(e) => setRoomType(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                        >
                          <option value="Standard Room">Standard Room (₹3,500/night)</option>
                          <option value="Deluxe Room">Deluxe Room (₹4,800/night)</option>
                          <option value="Deluxe King">Deluxe King (₹6,200/night)</option>
                          <option value="Executive Room">Executive Room (₹8,500/night)</option>
                          <option value="Villa Suite">Villa Suite (₹12,500/night)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Rooms Count</label>
                        <input
                          type="number"
                          value={roomsCount}
                          onChange={(e) => setRoomsCount(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Allot Clean Room</label>
                        <select
                          value={assignedRoom}
                          onChange={(e) => setAssignedRoom(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                        >
                          {cleanAvailableRooms[roomType]?.map((rm) => (
                            <option key={rm} value={rm}>Room #{rm} (Clean)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Extra Bed Option</label>
                        <select
                          value={extraBed}
                          onChange={(e) => setExtraBed(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                        >
                          <option value="None">No Extra Bed</option>
                          <option value="Rollaway Bed">Rollaway Bed (+₹1,000/night)</option>
                          <option value="Baby Crib">Baby Crib (Complimentary)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Notes */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Special Preferences / Guest Notes</label>
                    <textarea
                      placeholder="Enter nuts allergies, high floor pref, extra bed requests..."
                      rows="3"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                    />
                  </div>

                </div>
              )}

              {/* Step 3: Tariff & Booking Channel */}
              {currentStep === 3 && (
                <div className="space-y-4 text-left">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">Tariff Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Booking Source Channel</label>
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                      >
                        <option value="Walk-in">Walk-in direct</option>
                        <option value="Direct Web">Direct Web portal</option>
                        <option value="Booking.com">Booking.com API</option>
                        <option value="MakeMyTrip">MakeMyTrip</option>
                        <option value="Agoda">Agoda</option>
                        <option value="Goibibo">Goibibo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Tariff Rate Plan</label>
                      <select
                        value={ratePlan}
                        onChange={(e) => setRatePlan(e.target.value)}
                        className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                      >
                        <option value="Standard Bed & Breakfast">Standard Bed & Breakfast (B&B)</option>
                        <option value="Room Only Stay">Room Only Stay (EP)</option>
                        <option value="Full Board Meals Included">Full Board Meals Included (AP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Discount Amount (₹)</label>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Incidentals / Extra bed charges (₹)</label>
                      <input
                        type="number"
                        value={additionalCharges}
                        onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                        className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Payments settlement */}
              {currentStep === 4 && (
                <div className="space-y-4 text-left">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center max-w-sm mx-auto">
                    <p className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">Total Amount to collect</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">₹{totalAmount.toLocaleString()}</p>
                  </div>

                  <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-muted/50 pb-1.5">Settlement</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1] cursor-pointer"
                      >
                        <option value="UPI">UPI Link</option>
                        <option value="Card">Credit / Debit Card</option>
                        <option value="Cash">Cash drawer</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-navy/70 tracking-wider block mb-1.5 uppercase">Amount Collected (₹)</label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        className="w-full h-10 px-3.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy shadow-sm transition-all focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy hover:border-[#cbd5e1]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form buttons */}
              <div className="flex justify-between items-center pt-5 border-t border-muted/50 mt-8 shrink-0">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
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
                    <Link to="/reception/reservations">Cancel</Link>
                  </Button>
                )}

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1 && (!guestName || !guestPhone)) {
                        alert("Guest name and contact number are required!");
                        return;
                      }
                      setCurrentStep(prev => prev + 1);
                    }}
                    className="bg-navy hover:bg-navy-deep text-white h-9 px-5 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleConfirmReservation}
                    className="bg-emerald-600 hover:bg-emerald-700 !text-white h-9 px-6 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Confirm Reservation
                  </Button>
                )}
              </div>
              </div>

            </Panel>

          </div>

          {/* Right Column: Sticky Booking Summary Panel */}
          <div className="space-y-6">
            
            <Panel title="Reservation Ledger Summary" description="Live checkout calculations and check-in allotments.">
              <div className="p-4 space-y-4 text-xs text-navy font-semibold">
                
                <div className="space-y-2 border-b border-muted pb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guest Profile Name:</span>
                    <span className="font-bold">{guestName || <em className="text-muted-foreground/50 font-normal">Not entered</em>}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected Allotted Room:</span>
                    <span className="font-bold text-indigo">Room #{assignedRoom} ({roomType})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stay Dates length:</span>
                    <span className="font-bold">{checkIn} to {checkOut} ({nights} Nights)</span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-muted pb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Tariff ({nights} nights):</span>
                    <span>₹{baseTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes & GST (18%):</span>
                    <span>₹{taxAmount.toLocaleString()}</span>
                  </div>
                  {additionalCharges > 0 && (
                    <div className="flex justify-between text-navy">
                      <span className="text-muted-foreground">Extra Incidentals:</span>
                      <span>+₹{Number(additionalCharges).toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount deduction:</span>
                      <span className="font-bold">-₹{Number(discount).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex justify-between text-navy text-sm font-black">
                    <span>Total Billed Amount:</span>
                    <span className="text-base font-black">₹{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tariff Amount Collected:</span>
                    <span>₹{Number(amountPaid).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 bg-rose-50/30 p-2.5 rounded-lg border border-rose-100/50 mt-2 font-black text-sm">
                    <span className="uppercase text-[9px] tracking-wider font-black">Folio Balance Due:</span>
                    <span className="text-base">₹{balanceDue.toLocaleString()}</span>
                  </div>
                </div>

              </div>
            </Panel>

          </div>

        </div>
      )}

    </div>
  );
}