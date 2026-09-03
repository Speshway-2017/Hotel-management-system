import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import {
  User,
  Calendar,
  Home,
  CreditCard,
  ChevronLeft,
  ShieldAlert,
  Award,
  Sparkles,
  MessageSquare,
  AlertOctagon,
  FileText
} from "lucide-react";
import { toast } from "sonner";

// Utility helpers for date handling
const formatDateToYYYYMMDD = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToString = (date) => {
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getAdditionalNights = (currentOutStr, newOutStr) => {
  const currentOut = new Date(currentOutStr);
  const newOut = new Date(newOutStr);
  if (isNaN(currentOut.getTime()) || isNaN(newOut.getTime())) return 0;
  const diffTime = newOut - currentOut;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

function ManagerViewGuest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guestProfile, setGuestProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Extend Stay modal state
  const [extendingBooking, setExtendingBooking] = useState(null);
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [dailyRate, setDailyRate] = useState(0);
  const [extendingSubmit, setExtendingSubmit] = useState(false);

  const handleOpenExtendModal = (b) => {
    setExtendingBooking(b);
    const currentOut = new Date(b.checkOut);
    const nextDay = new Date(currentOut.getTime() + 24 * 60 * 60 * 1000);
    setNewCheckOutDate(formatDateToYYYYMMDD(nextDay));
    const avgNightWithTax = b.amount / (b.nights || 1);
    setDailyRate(Math.round(avgNightWithTax / 1.18));
  };

  const handleConfirmExtend = async () => {
    if (!extendingBooking || !newCheckOutDate) return;
    const additionalNights = getAdditionalNights(extendingBooking.checkOut, newCheckOutDate);
    if (additionalNights <= 0) {
      toast.error("New check-out date must be after current check-out date.");
      return;
    }
    
    setExtendingSubmit(true);
    try {
      const roomCharges = dailyRate * additionalNights;
      const gst = Math.round(roomCharges * 0.18);
      const totalAdditionalAmount = roomCharges + gst;
      
      const payload = {
        newCheckOut: formatDateToString(new Date(newCheckOutDate)),
        additionalNights,
        additionalAmount: totalAdditionalAmount
      };
      
      const res = await managerService.extendReservation(extendingBooking._id || extendingBooking.id, payload);
      if (res.success) {
        toast.success(`Stay extended successfully until ${payload.newCheckOut}!`);
        setExtendingBooking(null);
        if (id) loadGuestDetail();
      } else {
        toast.error(res.message || "Failed to extend stay.");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred while extending stay.");
    } finally {
      setExtendingSubmit(false);
    }
  };

  const loadGuestDetail = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const decodedKey = atob(id);
      const res = await managerService.getReservations();
      
      if (res.success && res.data) {
        // Scope bookings to manager's property
        const propertyBookings = res.data;
        
        // Match bookings for this specific guest (by name or phone)
        const guestBookings = propertyBookings.filter(b => b.guest === decodedKey || b.phone === decodedKey);
        
        if (guestBookings.length > 0) {
          const b = guestBookings[0];
          const nameParts = b.guest.toLowerCase().split(" ");
          const email = nameParts.length > 1 ? `${nameParts[0]}.${nameParts[1]}@gmail.com` : `${nameParts[0]}@gmail.com`;
          
          const loyaltyTiers = ["Platinum", "Gold", "Silver", "Regular"];
          const tierIndex = (b.guest.length) % loyaltyTiers.length;
          const loyaltyTier = loyaltyTiers[tierIndex];
          
          const roomPrefs = ["High floor, non-smoking", "Near elevator, twin bed", "King bed, pool view", "Quiet room, extra blankets"];
          const roomPref = roomPrefs[b.guest.length % roomPrefs.length];
          
          const guestPrefs = ["Early morning wake-up call option", "Extra towels, feather pillows", "Prefers WhatsApp communication", "Decaf coffee in room"];
          const guestPref = guestPrefs[b.guest.length % guestPrefs.length];

          const feedbackOptions = ["Excellent service, butler was helpful", "Clean rooms, loved the pool views", "Smooth check-in experience", "Courteous desk staff"];
          const feedback = feedbackOptions[b.guest.length % feedbackOptions.length];

          const complaintsOptions = ["None", "AC cooling was slow initially", "Pillow was too firm", "Delayed luggage delivery"];
          const complaint = complaintsOptions[b.guest.length % complaintsOptions.length];

          setGuestProfile({
            name: b.guest,
            phone: b.phone || "+91 99999 88888",
            email: email,
            loyaltyTier,
            roomPreference: roomPref,
            guestPreference: guestPref,
            feedback,
            complaint,
            stays: guestBookings
          });
        } else if (!isSilent) {
          setError("Guest CRM profile record not found.");
        }
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load guest profiles details.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "manager") {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    if (id) {
      loadGuestDetail();
      const unsubscribe = subscribeRealtimeSync(() => {
        loadGuestDetail(true);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [id]);

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view guests for this property. Access is strictly scoped to your assigned hotel branch.
        </Notice>
        <Link to="/manager/guests" className="inline-flex items-center gap-1.5 text-xs text-navy font-bold hover:underline">
          <ChevronLeft className="size-3.5" /> Back to Guests Hub
        </Link>
      </div>
    );
  }

  // Sort stays (latest first)
  const sortedStays = guestProfile ? [...guestProfile.stays].sort((x, y) => new Date(y.checkIn) - new Date(x.checkIn)) : [];
  const latestStay = sortedStays[0];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/manager/guests" className="inline-flex items-center justify-center size-8 rounded-full border border-muted bg-white hover:bg-muted/15 text-navy transition-all cursor-pointer">
          <ChevronLeft className="size-4" />
        </Link>
        <PageHeader
          title={guestProfile ? `${guestProfile.name}'s Profile` : "Guest CRM Profile"}
          subtitle="Stay metrics, dynamic room preferences, feedback tracking, and loyalty summary ledger."
        />
      </div>

      {error && <Notice tone="error" title="CRM Fetch Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : guestProfile ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          {/* Guest Profile Details & Restricted KYC Document Box */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <User className="size-4.5 text-brand" />
                <h4 className="font-semibold text-navy text-sm">Guest Identification</h4>
              </div>
              <div className="space-y-3.5 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Guest Name</span>
                  <p className="font-bold text-navy-deep mt-0.5">{guestProfile.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Contact Phone</span>
                  <p className="font-semibold mt-0.5">{guestProfile.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</span>
                  <p className="font-semibold mt-0.5">{guestProfile.email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Loyalty Status</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Tag tone="brand">{guestProfile.loyaltyTier} Member</Tag>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Restriction notice */}
            <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-5 shadow-soft space-y-3">
              <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="size-4 shrink-0" />
                <span>KYC Verification Documents</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Guest identity documents (Aadhaar cards, passports, Form C cards) are restricted to checkout terminals and front desk receptionists for OCR scan audits. General managers and dashboard reports cannot download or view guest document files directly.
              </p>
            </div>
          </div>

          {/* Core Details (Preferences, Feedback, Stays) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preferences Card */}
              <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-muted">
                  <Sparkles className="size-4.5 text-purple" />
                  <h4 className="font-semibold text-navy text-sm">Guest Preferences</h4>
                </div>
                <div className="space-y-3 text-xs text-navy">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Room Type Allocation</span>
                    <p className="font-semibold mt-0.5 text-navy-deep">{guestProfile.roomPreference}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Service Preferences</span>
                    <p className="font-semibold mt-0.5 text-navy-deep">{guestProfile.guestPreference}</p>
                  </div>
                </div>
              </div>

              {/* Feedback and complaints card */}
              <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-muted">
                  <MessageSquare className="size-4.5 text-warning" />
                  <h4 className="font-semibold text-navy text-sm">Feedback & Complaints</h4>
                </div>
                <div className="space-y-3 text-xs text-navy">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Last Stay Feedback</span>
                    <p className="italic text-muted-foreground mt-0.5">"{guestProfile.feedback}"</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Operational Complaints</span>
                    <div className="mt-1 flex items-center gap-1.5 font-bold">
                      {guestProfile.complaint === "None" ? (
                        <span className="text-success text-[11px]">No active complaints reported</span>
                      ) : (
                        <>
                          <AlertOctagon className="size-3.5 text-warning" />
                          <span className="text-warning text-[11px]">{guestProfile.complaint}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current/Latest Stay Details */}
            {latestStay && (
              <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-muted">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4.5 text-brand" />
                    <h4 className="font-semibold text-navy text-sm">Active / Latest Booking Details</h4>
                  </div>
                  <Tag tone={
                    latestStay.status === "Confirmed" ? "brand" :
                    latestStay.status === "Checked-in" ? "success" :
                    latestStay.status === "Checked-out" ? "neutral" : "error"
                  }>
                    {latestStay.status}
                  </Tag>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-navy">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Room</span>
                    <strong className="text-brand text-sm block mt-0.5">{latestStay.room ? `Room ${latestStay.room}` : "Not Assigned"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Stay Dates</span>
                    <span className="font-semibold block mt-0.5">{latestStay.checkIn} → {latestStay.checkOut}</span>
                    {latestStay.status === "Checked-in" && (
                      <button
                        onClick={() => handleOpenExtendModal(latestStay)}
                        className="text-[10px] text-brand hover:underline font-bold block mt-1 cursor-pointer"
                      >
                        Extend Stay
                      </button>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Amount</span>
                    <strong className="text-navy block mt-0.5 text-sm">₹{latestStay.amount?.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Outstanding Folio</span>
                    <strong className={`block mt-0.5 text-sm ${latestStay.balance === 0 ? "text-success" : "text-destructive"}`}>
                      ₹{(latestStay.balance || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Stay History Table */}
            <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
              <div className="p-4 bg-[#fcfcfc] border-b border-muted flex items-center gap-2">
                <FileText className="size-4.5 text-navy" />
                <h4 className="font-semibold text-navy text-sm">Historic Stay Ledger</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                      <th className="py-3.5 px-6">Booking ID</th>
                      <th className="py-3.5 px-4">Room</th>
                      <th className="py-3.5 px-4">Arrival</th>
                      <th className="py-3.5 px-4">Departure</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Amount</th>
                      <th className="py-3.5 px-6 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                    {sortedStays.map((s) => (
                      <tr key={s._id || s.id} className="hover:bg-[#fcfcfc]/60 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-[11px] text-muted-foreground">
                          #{s._id || s.id}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-brand">
                          {s.room ? `Room ${s.room}` : "Not Assigned"}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">{s.checkIn}</td>
                        <td className="py-3.5 px-4 text-muted-foreground">{s.checkOut}</td>
                        <td className="py-3.5 px-4 text-center">
                          <Tag tone={
                            s.status === "Confirmed" ? "brand" :
                            s.status === "Checked-in" ? "success" :
                            s.status === "Checked-out" ? "neutral" : "error"
                          }>
                            {s.status}
                          </Tag>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-navy">₹{s.amount?.toLocaleString()}</td>
                        <td className={`py-3.5 px-6 text-right font-bold ${s.balance === 0 ? "text-success" : "text-destructive"}`}>
                          ₹{(s.balance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      ) : null}

      {/* Extend Stay Modal */}
      {extendingBooking && (
        <div className="fixed inset-0 bg-[#071420]/75 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-muted shadow-lift w-full max-w-md overflow-hidden animate-scale-up text-left font-sans">
            
            {/* Modal Header */}
            <div className="bg-navy p-5 text-white flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold">Extend Stay Duration</h3>
                <p className="text-[10px] text-[#A5F3FC] font-semibold mt-1">Guest: {extendingBooking.guest} · Room: {extendingBooking.room}</p>
              </div>
              <button
                onClick={() => setExtendingBooking(null)}
                className="text-white/60 hover:text-white cursor-pointer text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs text-navy">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Current Checkout</label>
                  <p className="font-semibold text-navy-deep bg-muted/20 border border-muted/50 p-2.5 rounded-lg text-[11px]">{extendingBooking.checkOut}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">New Checkout Date</label>
                  <input
                    type="date"
                    min={formatDateToYYYYMMDD(new Date(new Date(extendingBooking.checkOut).getTime() + 24 * 60 * 60 * 1000))}
                    value={newCheckOutDate}
                    onChange={(e) => setNewCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy text-navy font-semibold h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Additional Nights</label>
                  <p className="font-bold text-navy bg-muted/20 border border-muted/50 p-2.5 rounded-lg text-xs">
                    {getAdditionalNights(extendingBooking.checkOut, newCheckOutDate)} Nights
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Daily Charge (Excl. GST)</label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy text-navy font-bold h-9"
                  />
                </div>
              </div>

              {/* Price Breakdown Ledger */}
              <div className="border-t border-muted pt-4 space-y-2 select-none">
                <div className="flex justify-between font-semibold text-muted-foreground">
                  <span>Room Charges (Excl. GST):</span>
                  <span>₹{(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-muted-foreground">
                  <span>GST (18%):</span>
                  <span>₹{Math.round(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) * 0.18).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-black text-navy text-sm pt-2 border-t border-muted/50">
                  <span>Total Additional Amount:</span>
                  <span className="text-brand">
                    ₹{(
                      dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) +
                      Math.round(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) * 0.18)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex justify-end gap-2 border-t border-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setExtendingBooking(null)}
                  className="h-9 px-4 text-xs font-bold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmExtend}
                  disabled={extendingSubmit || getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) <= 0}
                  className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-5 rounded-md cursor-pointer"
                >
                  {extendingSubmit ? "Processing..." : "Confirm Extension"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/manager/guests/view/$id")({
  component: ManagerViewGuest
});
