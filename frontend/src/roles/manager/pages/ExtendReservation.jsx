import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Crumbs, Tag, Notice } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inr } from "@/data/hs-data";
import { toast } from "sonner";
import { emitRealtimeEvent, subscribeRealtimeSync } from "@/services/socket";
import { 
  CalendarPlus, ArrowLeft, Bed, Calendar, Clock, DollarSign, 
  Sparkles, Check, ChevronRight, User, ShieldCheck, AlertCircle, Info, Building
} from "lucide-react";

function formatDateToYYYYMMDD(d) {
  if (!d || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getAdditionalNights(currentOutStr, newOutStr) {
  if (!currentOutStr || !newOutStr) return 0;
  const c = new Date(currentOutStr);
  const n = new Date(newOutStr);
  if (isNaN(c.getTime()) || isNaN(n.getTime())) return 0;
  const diffTime = n.getTime() - c.getTime();
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
}

function ManagerExtendReservation() {
  const { id: paramId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [dailyRate, setDailyRate] = useState(0);
  const [notes, setNotes] = useState("");

  const targetId = paramId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null);

  const loadBooking = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      let matched = null;
      const res = await managerService.getReservations();
      if (res && res.data) {
        matched = res.data.find(b => b._id === targetId || b.id === targetId || b.bookingId === targetId);
      }
      if (!matched && targetId) {
        const directRes = await managerService.getReservationById(targetId).catch(() => null);
        if (directRes && directRes.data) matched = directRes.data;
      }

      if (matched) {
        setBooking(matched);
        const currentOut = matched.checkOut ? new Date(matched.checkOut) : new Date();
        const nextDay = new Date(currentOut.getTime() + 24 * 60 * 60 * 1000);
        setNewCheckOutDate(formatDateToYYYYMMDD(nextDay));

        const totalAmt = Number(matched.amount || matched.totalAmount || 3000);
        const totalNights = Number(matched.nights || 1);
        const avgNight = totalAmt / Math.max(1, totalNights);
        const baseRate = Math.round(avgNight / 1.18);
        setDailyRate(baseRate > 0 ? baseRate : 2500);
      } else {
        setError("Reservation not found. Please verify the booking reference.");
      }
    } catch (err) {
      setError(err.message || "Failed to load reservation details.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
    const unsubscribe = subscribeRealtimeSync(() => {
      loadBooking(true);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [targetId]);

  const currentCheckOut = booking?.checkOut || formatDateToYYYYMMDD(new Date());
  const currentOutDate = new Date(currentCheckOut);
  const minDate = formatDateToYYYYMMDD(new Date(currentOutDate.getTime() + 24 * 60 * 60 * 1000));
  
  const additionalNights = getAdditionalNights(currentCheckOut, newCheckOutDate);
  const roomCharges = dailyRate * additionalNights;
  const gstAmount = Math.round(roomCharges * 0.18);
  const totalAdditionalAmount = roomCharges + gstAmount;

  const handleQuickPreset = (nightsToAdd) => {
    const targetDate = new Date(currentOutDate.getTime() + nightsToAdd * 24 * 60 * 60 * 1000);
    setNewCheckOutDate(formatDateToYYYYMMDD(targetDate));
  };

  const handleConfirmExtend = async (e) => {
    if (e) e.preventDefault();
    if (additionalNights <= 0) {
      toast.error("New check-out date must be after current check-out date.");
      return;
    }

    const bookingTargetId = booking?._id || booking?.id || booking?.bookingId || targetId;
    if (!bookingTargetId) {
      toast.error("Missing valid reservation ID.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        newCheckOut: newCheckOutDate,
        additionalNights,
        additionalAmount: totalAdditionalAmount,
        days: additionalNights,
        notes: notes ? `Stay extended by ${additionalNights} nights: ${notes}` : undefined
      };

      const res = await managerService.extendReservation(bookingTargetId, payload);

      if (res && res.success) {
        toast.success(`Stay extended successfully for ${booking.guest || 'guest'} until ${newCheckOutDate}!`);
        emitRealtimeEvent('booking_updated', {
          propertyId: booking.propertyId,
          bookingId: bookingTargetId,
          action: 'stay_extended',
          newCheckOut: newCheckOutDate,
          additionalNights,
          additionalAmount: totalAdditionalAmount
        });

        // Navigate back to reservations view
        navigate({ to: `/manager/reservations/view/${bookingTargetId}` });
      } else {
        toast.error(res?.message || "Failed to extend stay. Please try again.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to extend stay.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-left font-ui">
        <div className="py-20 text-center">
          <div className="mx-auto size-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4" />
          <p className="text-xs font-semibold text-muted-foreground">Loading reservation details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-left font-ui">
        <Notice tone="danger" title="Reservation Not Found">
          {error || "Could not retrieve the specified reservation."}
        </Notice>
        <div className="mt-4">
          <Button onClick={() => navigate({ to: "/manager/reservations" })} variant="outline" className="text-xs">
            <ArrowLeft className="size-3.5 mr-2" /> Back to Reservations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto text-left font-ui space-y-6">
      {/* 1. Breadcrumbs */}
      <Crumbs
        items={[
          { label: "Manager", to: "/manager" },
          { label: "Reservations", to: "/manager/reservations" },
          { label: booking.bookingId || "Booking", to: `/manager/reservations/view/${booking._id || booking.id || booking.bookingId}` },
          { label: "Extend Stay" }
        ]}
      />

      {/* 2. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-muted shadow-soft">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md">
              Ref #{booking.bookingId || booking._id}
            </span>
            <Tag tone={booking.status === "Checked-in" ? "success" : "brand"}>
              {booking.status}
            </Tag>
          </div>
          <h1 className="font-display text-2xl font-bold text-navy">Extend Stay Duration</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prolong departure date, recalculate tariff & taxes, and update guest folio in real-time.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => navigate({ to: `/manager/reservations/view/${booking._id || booking.id || booking.bookingId}` })}
          variant="outline"
          className="text-xs font-bold border-muted-foreground/20 hover:bg-muted cursor-pointer"
        >
          <ArrowLeft className="size-3.5 mr-1.5" /> Back to Details
        </Button>
      </div>

      {/* 3. Main Content Grid */}
      <form onSubmit={handleConfirmExtend} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        
        {/* Left Column: Guest & Stay Details + Scheduler */}
        <div className="space-y-6">
          
          {/* Guest Summary Card */}
          <div className="bg-white rounded-2xl p-6 border border-muted shadow-soft space-y-4">
            <h2 className="font-display text-base font-bold text-navy border-b border-muted pb-3 flex items-center gap-2">
              <User className="size-4 text-indigo-600" />
              <span>Guest & Room Summary</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-muted/60 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Primary Guest</span>
                <strong className="text-navy font-bold text-sm block">{booking.guest || 'Guest'}</strong>
                <span className="text-muted-foreground text-[11px] block truncate">{booking.email || booking.phone || 'N/A'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-muted/60 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Allocated Room</span>
                <strong className="text-navy font-bold text-sm block flex items-center gap-1.5">
                  <Bed className="size-3.5 text-indigo-600 shrink-0" />
                  <span>{booking.room || booking.roomType || 'Standard Room'}</span>
                </strong>
                <span className="text-muted-foreground text-[11px] block">{booking.roomType || 'Standard Room'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-muted/60 space-y-1 sm:col-span-2 lg:col-span-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Stay Schedule</span>
                <strong className="text-navy font-bold text-xs block">In: {booking.checkIn}</strong>
                <strong className="text-indigo-600 font-bold text-xs block">Current Out: {booking.checkOut}</strong>
              </div>
            </div>
          </div>

          {/* Departure Extension Scheduler */}
          <div className="bg-white rounded-2xl p-6 border border-muted shadow-soft space-y-5">
            <h2 className="font-display text-base font-bold text-navy border-b border-muted pb-3 flex items-center gap-2">
              <CalendarPlus className="size-4 text-indigo-600" />
              <span>Select New Departure Schedule</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="current-out" className="text-xs font-bold text-navy">Current Check-Out</Label>
                <div className="mt-1.5 p-3 rounded-xl bg-muted/30 border border-muted text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span>{booking.checkOut}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="new-out" className="text-xs font-bold text-navy">New Extended Check-Out <span className="text-rose-500">*</span></Label>
                <Input
                  id="new-out"
                  type="date"
                  min={minDate}
                  value={newCheckOutDate}
                  onChange={(e) => setNewCheckOutDate(e.target.value)}
                  required
                  className="mt-1.5 h-11 text-xs font-bold border-indigo-300 focus:border-indigo-600 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Quick Extension Presets */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Quick Add Presets</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "+1 Night", nights: 1 },
                  { label: "+2 Nights", nights: 2 },
                  { label: "+3 Nights", nights: 3 },
                  { label: "+5 Nights", nights: 5 },
                  { label: "+7 Nights", nights: 7 }
                ].map((preset) => (
                  <button
                    key={preset.nights}
                    type="button"
                    onClick={() => handleQuickPreset(preset.nights)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      additionalNights === preset.nights
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-muted/40 hover:bg-indigo-50 hover:text-indigo-700 border-muted text-navy"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Rate Tuning */}
            <div className="pt-3 border-t border-muted">
              <div className="flex justify-between items-center mb-1.5">
                <Label htmlFor="daily-rate" className="text-xs font-bold text-navy">Agreed Nightly Base Tariff (₹)</Label>
                <span className="text-[10px] text-muted-foreground">Excludes 18% GST</span>
              </div>
              <Input
                id="daily-rate"
                type="number"
                min="500"
                step="100"
                value={dailyRate}
                onChange={(e) => setDailyRate(Math.max(0, Number(e.target.value)))}
                className="h-10 text-xs font-bold"
              />
            </div>

            {/* Staff Notes */}
            <div className="pt-2">
              <Label htmlFor="notes" className="text-xs font-bold text-navy">Extension Reason / Folio Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Guest requested extension for extra day of meetings."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 text-xs min-h-[80px]"
              />
            </div>

          </div>

        </div>

        {/* Right Column: Live Folio Calculation & Action */}
        <aside className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-muted shadow-soft space-y-4 text-left sticky top-6">
            <h3 className="font-display text-base font-bold text-navy border-b border-muted pb-2 flex items-center gap-2">
              <DollarSign className="size-4 text-indigo-600" />
              <span>Folio Impact Breakdown</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1.5">
              <div className="flex justify-between text-indigo-950 font-bold">
                <span>Additional Duration:</span>
                <span className="text-indigo-700 font-extrabold">{additionalNights} Night{additionalNights > 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between text-indigo-900/70 text-[11px]">
                <span>Extension Window:</span>
                <span>{currentCheckOut} → {newCheckOutDate}</span>
              </div>
            </div>

            <dl className="space-y-2.5 text-xs border-t border-muted pt-3 font-medium">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Room Charges ({additionalNights} × {inr(dailyRate)})</dt>
                <dd className="font-bold text-navy">{inr(roomCharges)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Applicable GST (18%)</dt>
                <dd className="font-bold text-navy">{inr(gstAmount)}</dd>
              </div>

              <div className="flex justify-between border-t border-muted pt-3 text-sm font-bold text-navy">
                <dt>Total Additional Payable</dt>
                <dd className="font-extrabold text-indigo-600 text-base">{inr(totalAdditionalAmount)}</dd>
              </div>
            </dl>

            <div className="pt-3 border-t border-muted space-y-2">
              <Button
                type="submit"
                disabled={submitting || additionalNights <= 0}
                className="w-full h-11 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-500/20"
              >
                {submitting ? "Updating Folio..." : "Confirm & Extend Stay"}
              </Button>

              <Button
                type="button"
                onClick={() => navigate({ to: `/manager/reservations/view/${booking._id || booking.id || booking.bookingId}` })}
                variant="outline"
                className="w-full h-9 text-xs font-bold border-muted-foreground/20 hover:bg-muted cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </aside>

      </form>
    </div>
  );
}

export const Route = {
  head: () => ({
    meta: [
      { title: "Extend Stay — Manager Dashboard" },
      { name: "description", content: "Extend reservation stay dates, recalculate tariff & taxes, and update guest folio." }
    ]
  }),
  useParams: () => {
    if (typeof window === 'undefined') return { id: '' };
    const pathname = window.location.pathname;
    const parts = pathname.split('/');
    const lastPart = parts[parts.length - 1];
    return { id: lastPart && lastPart !== 'extend' ? decodeURIComponent(lastPart) : new URLSearchParams(window.location.search).get('id') || '' };
  },
  component: ManagerExtendReservation
};

export default ManagerExtendReservation;
