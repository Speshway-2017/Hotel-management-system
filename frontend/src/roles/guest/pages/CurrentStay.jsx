import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Hotel, Bed, Calendar, Clock, AlertTriangle, CheckCircle2, 
  Wifi, Phone, ArrowRight, ShieldCheck, RefreshCw, Sparkles, 
  Receipt, Plus, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { inr } from "@/data/hs-data";
import { subscribeRealtimeSync } from "@/services/socket";
import { authService } from "@/services/auth";

export const Route = createFileRoute("/guest/current-stay")({
  head: () => ({
    meta: [
      { title: "Current Stay — Hour Stay" },
      { name: "description", content: "Details of your current room stay, live checkout timer, and stay extensions." }
    ]
  }),
  component: GuestCurrentStayPage
});

function parseStayCheckout(dateStr, timeStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  let y, m, d;
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

  if (dmy) {
    d = parseInt(dmy[1], 10);
    m = parseInt(dmy[2], 10);
    y = parseInt(dmy[3], 10);
  } else if (ymd) {
    y = parseInt(ymd[1], 10);
    m = parseInt(ymd[2], 10);
    d = parseInt(ymd[3], 10);
  } else {
    const parsed = new Date(s);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  }

  let hours = 11;
  let mins = 0;
  if (timeStr) {
    const tStr = String(timeStr).trim();
    const tMatch = tStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (tMatch) {
      hours = parseInt(tMatch[1], 10);
      mins = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
      const meridiem = tMatch[3] ? tMatch[3].toUpperCase() : null;
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    }
  }

  return new Date(y, m - 1, d, hours, mins, 0);
}

function GuestCurrentStayPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  
  // Extension Modal State
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendType, setExtendType] = useState("hours"); // 'hours' | 'nights'
  const [extendHours, setExtendHours] = useState(2);
  const [extendNights, setExtendNights] = useState(1);
  const [extending, setExtending] = useState(false);

  // Time calculation state
  const [now, setNow] = useState(new Date());

  const fetchActiveStay = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/v1/guest/bookings`, { headers }).then(r => r.json());

      if (res && res.success && Array.isArray(res.data)) {
        // Find active in-house stay
        const inHouse = res.data.find(b => {
          const st = (b.status || '').toLowerCase().trim();
          return st === 'checked-in' || st === 'checked in' || st === 'staying' || st === 'active' || st === 'in-house';
        });

        if (inHouse) {
          setBooking(inHouse);
        } else {
          // If no active in-house stay, find upcoming
          const upcoming = res.data.find(b => {
            const st = (b.status || '').toLowerCase().trim();
            return st === 'confirmed' || st === 'paid' || st === 'pending';
          });
          setBooking(upcoming || res.data[0] || null);
        }
      }
    } catch (err) {
      console.error("Failed to load current stay:", err);
      if (!silent) setError("Unable to load stay details from server.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveStay(false);

    // Live clock ticker every 10 seconds
    const clockInterval = setInterval(() => setNow(new Date()), 10000);

    const unsubscribe = subscribeRealtimeSync(() => {
      fetchActiveStay(true);
    });

    return () => {
      clearInterval(clockInterval);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Compute remaining time until checkout
  const checkOutDate = booking?.checkOut || booking?.checkOutDate;
  const checkOutTime = booking?.checkOutTime || '11:00 AM';
  const scheduledTime = parseStayCheckout(checkOutDate, checkOutTime);

  let minutesLeft = null;
  let isCheckoutDue = false;
  let isCheckoutApproaching = false;

  if (scheduledTime) {
    const diffMs = scheduledTime.getTime() - now.getTime();
    minutesLeft = Math.round(diffMs / 60000);
    isCheckoutDue = minutesLeft <= 0;
    isCheckoutApproaching = minutesLeft > 0 && minutesLeft <= 15;
  }

  const isInHouse = booking && ['checked-in', 'checked in', 'staying', 'active', 'in-house'].includes((booking.status || '').toLowerCase().trim());

  // Handle stay extension submit
  const handleExtendStaySubmit = async () => {
    if (!booking) return;
    setExtending(true);
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const bId = booking.bookingId || booking.id || booking._id;
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      const payload = {
        bookingId: bId,
        paymentMethod: 'UPI',
        paidNow: false
      };

      if (extendType === 'hours') {
        payload.extendHours = Number(extendHours);
        const hourlyRate = Math.round(Number(booking.amount || booking.totalAmount || 3000) / (24 * (Number(booking.nights) || 1)));
        payload.additionalAmount = Number(extendHours) * Math.max(200, hourlyRate);
      } else {
        payload.additionalNights = Number(extendNights);
        const nightlyRate = Math.round(Number(booking.amount || booking.totalAmount || 3000) / (Number(booking.nights) || 1));
        payload.additionalAmount = Number(extendNights) * Math.max(1000, nightlyRate);
      }

      const res = await fetch(`${apiBase}/v1/guest/bookings/${bId}/extend`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res && res.success) {
        toast.success("Stay Extended Successfully!", {
          description: `Your booking has been extended. Additional tariff: ${inr(payload.additionalAmount)}.`
        });
        setShowExtendModal(false);
        fetchActiveStay(true);
      } else {
        toast.error("Extension Failed", {
          description: res.message || "Failed to extend stay. Please consult the front desk."
        });
      }
    } catch (err) {
      toast.error("Error extending booking: " + err.message);
    } finally {
      setExtending(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/10 text-center space-y-4 shadow-soft font-ui">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Loading current stay details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-navy/10 text-center space-y-4 shadow-soft font-ui">
        <Hotel className="size-12 text-navy/30 mx-auto" />
        <h3 className="font-display text-lg font-bold text-navy">No Active In-Stay Found</h3>
        <p className="text-xs text-navy/60 max-w-md mx-auto">
          You currently have no active checked-in room stay. Book a new stay or view your reservations list.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => navigate({ to: "/guest/bookings" })}
            className="bg-navy text-cream text-xs font-bold px-4 py-2 rounded-xl"
          >
            My Bookings
          </Button>
          <Button
            onClick={() => window.location.href = "/hotels"}
            variant="outline"
            className="text-xs font-bold px-4 py-2 rounded-xl"
          >
            Explore Hotels
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-ui animate-fade-in">
      
      {/* 1. CHECK-OUT 10-15 MIN & ARRIVED ALERT BANNER */}
      {isInHouse && (isCheckoutApproaching || isCheckoutDue) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400 p-5 rounded-2xl shadow-lift text-left space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Clock className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-extrabold text-amber-950 flex items-center gap-2">
                  <span>{isCheckoutDue ? "Check-out Time Has Arrived!" : `Check-out in ${minutesLeft} Minutes`}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 uppercase tracking-wide">
                    {isCheckoutDue ? "Check-out Due" : "Action Required"}
                  </span>
                </h4>
                <p className="text-xs sm:text-sm text-amber-900/90 font-medium leading-relaxed max-w-2xl">
                  {isCheckoutDue
                    ? "Your scheduled check-out time has arrived. If you want to stay extra, please extend your booking now or visit the front desk to complete check-out."
                    : `Your check-out time for Room ${booking.room || 'Standard Room'} is approaching in ${minutesLeft} minutes. If you want to stay extra, extend your booking below.`}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowExtendModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md border-none cursor-pointer inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <Plus className="size-4" />
              Extend Booking Now
            </Button>
          </div>
        </div>
      )}

      {/* 2. Main Current Stay Card */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 sm:p-8 shadow-soft space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-navy/5 pb-6 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display text-2xl font-bold text-navy">
                {booking.hotel || booking.propertyName || "Hour Stay Luxury Hotel"}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isInHouse ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-purple/10 text-purple border border-purple/20"
              }`}>
                {isInHouse ? "In-House Stay" : (booking.status || "Confirmed")}
              </span>
            </div>
            <p className="text-xs text-navy/60 flex items-center gap-2 font-medium">
              <span>Room: <strong className="text-navy">{booking.room || "Room 312"}</strong></span>
              <span>•</span>
              <span>Ref: <strong className="font-mono text-purple">{booking.bookingId || booking.id}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isInHouse && (
              <Button
                onClick={() => setShowExtendModal(true)}
                className="bg-navy hover:bg-navy/90 text-cream text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 border-none shadow-soft"
              >
                <Plus className="size-3.5 text-gold" />
                Extend Stay
              </Button>
            )}
            <Button
              onClick={() => navigate({ to: `/guest/bookings`, search: { id: booking.bookingId || booking.id } })}
              variant="outline"
              className="text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
            >
              <Receipt className="size-3.5 text-navy" />
              Digital Folio
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-cream/20 p-4 rounded-xl border border-navy/5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50 flex items-center gap-1">
              <Calendar className="size-3 text-purple" /> Check-In Time
            </span>
            <p className="text-sm font-bold text-navy">{booking.checkIn || "Today"} (12:00 PM)</p>
            <p className="text-[11px] text-emerald-600 font-semibold">✓ Completed</p>
          </div>

          <div className={`p-4 rounded-xl border space-y-1 ${
            isCheckoutApproaching || isCheckoutDue
              ? "bg-amber-50/80 border-amber-300"
              : "bg-cream/20 border-navy/5"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50 flex items-center gap-1">
              <Clock className="size-3 text-purple" /> Scheduled Check-Out
            </span>
            <p className="text-sm font-bold text-navy">{booking.checkOut || "Tomorrow"} ({checkOutTime})</p>
            <p className={`text-[11px] font-bold ${
              isCheckoutDue ? "text-rose-600" : isCheckoutApproaching ? "text-amber-700" : "text-navy/60"
            }`}>
              {isCheckoutDue ? "Check-out time reached" : minutesLeft !== null ? `${minutesLeft} mins remaining` : "On schedule"}
            </p>
          </div>

          <div className="bg-cream/20 p-4 rounded-xl border border-navy/5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50 flex items-center gap-1">
              <Wifi className="size-3 text-purple" /> Room Wi-Fi
            </span>
            <p className="text-sm font-bold text-navy">HourStayGuest{booking.room ? String(booking.room).replace(/\D/g, '') || '312' : '312'}</p>
            <p className="text-[11px] text-navy/60 font-semibold">High-speed 100 Mbps</p>
          </div>

          <div className="bg-cream/20 p-4 rounded-xl border border-navy/5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50 flex items-center gap-1">
              <Phone className="size-3 text-purple" /> Front Desk Help
            </span>
            <p className="text-sm font-bold text-navy">Dial &quot;0&quot; or &quot;9&quot;</p>
            <p className="text-[11px] text-navy/60 font-semibold">24/7 Concierge & Service</p>
          </div>

        </div>

        {/* Stay extension encouragement banner */}
        <div className="bg-purple/5 border border-purple/15 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
          <div className="flex items-start gap-3">
            <Sparkles className="size-5 text-purple shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-navy">Need to stay longer?</h4>
              <p className="text-xs text-navy/70 mt-0.5">
                If you want to stay extra, extend your booking seamlessly without having to re-pack or change rooms.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowExtendModal(true)}
            className="bg-navy hover:bg-navy/90 text-cream text-xs font-bold rounded-lg px-4 py-1.5 shrink-0"
          >
            Extend Booking
          </Button>
        </div>

      </div>

      {/* EXTEND STAY MODAL */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-navy/10 max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 text-left font-ui">
            
            <div className="flex items-center justify-between border-b border-navy/5 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-purple" />
                <h3 className="font-display text-lg font-bold text-navy">Extend Your Stay</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="text-navy/40 hover:text-navy cursor-pointer border-none bg-transparent text-lg font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-navy/70 leading-relaxed">
              Choose how long you want to extend your stay in Room <strong>{booking.room || "Standard Room"}</strong>. Your booking will be updated automatically in real time.
            </p>

            {/* Selection Tabs */}
            <div className="flex gap-2 bg-cream/40 p-1 rounded-xl border border-navy/10">
              <button
                type="button"
                onClick={() => setExtendType("hours")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none ${
                  extendType === "hours" ? "bg-navy text-cream shadow-xs" : "text-navy/70 hover:text-navy"
                }`}
              >
                Hourly Extension
              </button>
              <button
                type="button"
                onClick={() => setExtendType("nights")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none ${
                  extendType === "nights" ? "bg-navy text-cream shadow-xs" : "text-navy/70 hover:text-navy"
                }`}
              >
                Nightly / Daily
              </button>
            </div>

            {extendType === "hours" ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-navy block">Select Additional Hours</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 6].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtendHours(h)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        extendHours === h
                          ? "bg-purple text-white border-purple shadow-sm"
                          : "bg-white text-navy border-navy/10 hover:border-purple/40"
                      }`}
                    >
                      +{h} hr{h > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-bold text-navy block">Select Additional Nights</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setExtendNights(n)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        extendNights === n
                          ? "bg-purple text-white border-purple shadow-sm"
                          : "bg-white text-navy border-navy/10 hover:border-purple/40"
                      }`}
                    >
                      +{n} Night{n > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Tariff */}
            <div className="bg-cream/30 p-3.5 rounded-xl border border-navy/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-navy/50 tracking-wider block">Estimated Extension Tariff</span>
                <span className="text-xs text-navy/70 font-medium">Payable at checkout or folio settlement</span>
              </div>
              <span className="font-display text-lg font-bold text-emerald-700">
                {(() => {
                  const baseAmount = Number(booking.amount || booking.totalAmount || 3000);
                  const nights = Number(booking.nights) || 1;
                  if (extendType === 'hours') {
                    const hourlyRate = Math.round(baseAmount / (24 * nights));
                    return inr(extendHours * Math.max(200, hourlyRate));
                  } else {
                    const nightlyRate = Math.round(baseAmount / nights);
                    return inr(extendNights * Math.max(1000, nightlyRate));
                  }
                })()}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowExtendModal(false)}
                className="text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={extending}
                onClick={handleExtendStaySubmit}
                className="bg-navy hover:bg-navy/90 text-cream text-xs font-bold rounded-xl px-5 border-none cursor-pointer"
              >
                {extending ? "Extending..." : "Confirm Stay Extension"}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
