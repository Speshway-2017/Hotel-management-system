import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader, Panel, Tag, Notice } from "@/components/hs/kit";
import { receptionistService } from "@/services/receptionist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inr } from "@/data/hs-data";
import { toast } from "sonner";
import { emitRealtimeEvent, subscribeRealtimeSync } from "@/services/socket";
import { validateWithZod, extendStaySchema } from "@/schemas";
import { 
  CalendarPlus, Bed, Calendar, Clock, DollarSign, 
  Sparkles, Check, ChevronRight, User, ShieldCheck, 
  AlertCircle, Info, Building, ArrowRight, Receipt, Plus
} from "lucide-react";

// Formatting helpers
function formatDateToYYYYMMDD(d) {
  if (!d || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDateWithTime(dateStr, timeStr = "11:00") {
  if (!dateStr) return "N/A";
  try {
    const [y, m, d] = String(dateStr).split("T")[0].split("-");
    if (!y || !m || !d) return `${dateStr} at ${timeStr}`;
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const formattedDate = dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    
    // Format time into AM/PM
    const [hh, mm] = String(timeStr || "11:00").split(":");
    const hoursNum = parseInt(hh, 10) || 11;
    const minsNum = mm || "00";
    const ampm = hoursNum >= 12 ? "PM" : "AM";
    const displayHours = hoursNum % 12 || 12;
    const formattedTime = `${String(displayHours).padStart(2, "0")}:${minsNum} ${ampm}`;

    return `${formattedDate} at ${formattedTime}`;
  } catch {
    return `${dateStr} at ${timeStr}`;
  }
}

function ReceptionExtendReservation() {
  const { id: paramId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);

  // Baseline current check-out state
  const [currentCheckOutDate, setCurrentCheckOutDate] = useState("");
  const [currentCheckOutTime, setCurrentCheckOutTime] = useState("11:00");

  // Extension inputs: Starts directly from current checkout date & time
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [newCheckOutTime, setNewCheckOutTime] = useState("11:00");
  const [dailyRate, setDailyRate] = useState(3000);
  const [notes, setNotes] = useState("");

  const targetId = paramId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null);

  const loadBooking = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      let matched = null;
      const res = await receptionistService.getReservations();
      if (res && res.data) {
        matched = res.data.find(b => b._id === targetId || b.id === targetId || b.bookingId === targetId);
      }
      if (!matched && targetId) {
        // Fallback: try finding from guests
        const guestsRes = await receptionistService.getGuests().catch(() => null);
        if (guestsRes && guestsRes.data) {
          matched = guestsRes.data.find(g => g._id === targetId || g.id === targetId || g.bookingId === targetId);
        }
      }

      if (matched) {
        setBooking(matched);

        // Parse initial baseline checkout date
        let rawOut = matched.checkOut || matched.departureDate;
        let baseDateStr = "";
        let baseTimeStr = "11:00";

        if (rawOut) {
          if (String(rawOut).includes("T")) {
            const parts = String(rawOut).split("T");
            baseDateStr = parts[0];
            if (parts[1]) baseTimeStr = parts[1].substring(0, 5);
          } else if (String(rawOut).includes(" ")) {
            const parts = String(rawOut).split(" ");
            baseDateStr = parts[0];
          } else {
            baseDateStr = String(rawOut);
          }
        }
        if (!baseDateStr) {
          baseDateStr = formatDateToYYYYMMDD(new Date());
        }

        setCurrentCheckOutDate(baseDateStr);
        setCurrentCheckOutTime(baseTimeStr || "11:00");

        // Set extension starting date to current checkout date initially
        setNewCheckOutDate(baseDateStr);
        setNewCheckOutTime(baseTimeStr || "11:00");

        // Calculate accurate baseline daily rate from total amount and nights
        const totalAmt = Number(matched.amount || matched.totalAmount || 3000);
        const totalNights = Number(matched.nights || 1);
        const avgNight = totalAmt / Math.max(1, totalNights);
        const baseRate = Math.round(avgNight);
        setDailyRate(baseRate > 0 ? baseRate : 3000);
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

  // Duration and Financial Calculations
  const calculation = useMemo(() => {
    if (!currentCheckOutDate || !newCheckOutDate) {
      return {
        totalHours: 0,
        additionalNights: 0,
        remainderHours: 0,
        durationLabel: "0 Hours",
        roomCharges: 0,
        totalAdditionalAmount: 0,
        isValid: false
      };
    }

    const [currY, currM, currD] = currentCheckOutDate.split("-").map(Number);
    const [currH, currMin] = (currentCheckOutTime || "11:00").split(":").map(Number);
    const currTimestamp = new Date(currY, currM - 1, currD, currH || 11, currMin || 0).getTime();

    const [newY, newM, newD] = newCheckOutDate.split("-").map(Number);
    const [newH, newMin] = (newCheckOutTime || "11:00").split(":").map(Number);
    const newTimestamp = new Date(newY, newM - 1, newD, newH || 11, newMin || 0).getTime();

    const diffMs = newTimestamp - currTimestamp;
    const totalHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);

    const additionalNights = Math.floor(totalHours / 24);
    const remainderHours = Math.round(totalHours % 24);

    let durationLabel = "";
    if (totalHours <= 0) {
      durationLabel = "0 Hours (Select a future date/time)";
    } else if (totalHours < 24) {
      durationLabel = `${totalHours} Hour${totalHours === 1 ? "" : "s"} Extension`;
    } else if (remainderHours === 0) {
      durationLabel = `${additionalNights} Night${additionalNights === 1 ? "" : "s"} Extension`;
    } else {
      durationLabel = `${additionalNights} Night${additionalNights === 1 ? "" : "s"} + ${remainderHours} Hour${remainderHours === 1 ? "" : "s"}`;
    }

    // Rate calculations
    const hourlyRate = Math.max(250, Math.round(dailyRate / 8));
    let roomCharges = 0;
    if (totalHours > 0) {
      if (totalHours < 24) {
        roomCharges = Math.min(dailyRate, Math.round(totalHours * hourlyRate));
      } else {
        roomCharges = (additionalNights * dailyRate) + Math.min(dailyRate, Math.round(remainderHours * hourlyRate));
      }
    }

    const totalAdditionalAmount = roomCharges;

    return {
      totalHours,
      additionalNights: additionalNights + (remainderHours > 0 ? Number((remainderHours / 24).toFixed(2)) : 0),
      integerNights: additionalNights,
      remainderHours,
      durationLabel,
      roomCharges,
      totalAdditionalAmount,
      isValid: totalHours > 0
    };
  }, [currentCheckOutDate, currentCheckOutTime, newCheckOutDate, newCheckOutTime, dailyRate]);

  // Quick Preset Handlers starting strictly from current check-out
  const handleApplyPreset = (type, value) => {
    if (!currentCheckOutDate) return;
    const [currY, currM, currD] = currentCheckOutDate.split("-").map(Number);
    const [currH, currMin] = (currentCheckOutTime || "11:00").split(":").map(Number);
    const baseDate = new Date(currY, currM - 1, currD, currH || 11, currMin || 0);

    let targetDate = new Date(baseDate.getTime());
    if (type === "hours") {
      targetDate = new Date(baseDate.getTime() + value * 60 * 60 * 1000);
    } else if (type === "nights") {
      targetDate = new Date(baseDate.getTime() + value * 24 * 60 * 60 * 1000);
    }

    setNewCheckOutDate(formatDateToYYYYMMDD(targetDate));
    const hh = String(targetDate.getHours()).padStart(2, "0");
    const mm = String(targetDate.getMinutes()).padStart(2, "0");
    setNewCheckOutTime(`${hh}:${mm}`);
  };

  const handleConfirmExtend = async (e) => {
    if (e) e.preventDefault();
    const statusLower = String(booking?.status || '').toLowerCase().trim();
    if (['checked-out', 'checked out', 'completed', 'cancelled', 'canceled'].includes(statusLower)) {
      toast.error("Cannot extend stay for a checked-out booking.");
      return;
    }
    if (!calculation.isValid) {
      toast.error("Please select a new check-out date/time that is after the current check-out.");
      return;
    }

    const val = validateWithZod(extendStaySchema, {
      extraDays: Math.max(1, calculation.additionalNights),
      additionalAmount: calculation.totalAdditionalAmount,
      reason: notes
    });

    if (!val.isValid) {
      toast.error(val.firstError);
      return;
    }

    const bookingTargetId = booking?._id || booking?.id || booking?.bookingId || targetId;
    if (!bookingTargetId) {
      toast.error("Missing valid reservation ID.");
      return;
    }

    setSubmitting(true);
    try {
      const formattedNewCheckOut = `${newCheckOutDate}T${newCheckOutTime}:00`;
      const payload = {
        newCheckOut: formattedNewCheckOut,
        checkOut: newCheckOutDate,
        checkOutTime: newCheckOutTime,
        additionalNights: calculation.additionalNights,
        additionalAmount: calculation.totalAdditionalAmount,
        notes: notes ? `Stay extended by ${calculation.durationLabel}: ${notes}` : `Stay extended by ${calculation.durationLabel}`
      };

      const res = await receptionistService.extendStay(bookingTargetId, payload);

      if (res && (res.success || res.data)) {
        toast.success(`Stay extended successfully for ${booking.guest || 'guest'} until ${formatDisplayDateWithTime(newCheckOutDate, newCheckOutTime)}!`);
        emitRealtimeEvent('booking_updated', {
          propertyId: booking.propertyId,
          bookingId: bookingTargetId,
          action: 'stay_extended',
          newCheckOut: formattedNewCheckOut,
          additionalAmount: calculation.totalAdditionalAmount
        });

        navigate(`/reception/reservations/${bookingTargetId}`);
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
      <div className="p-8 max-w-5xl mx-auto text-left font-ui">
        <div className="py-24 text-center space-y-3">
          <div className="mx-auto size-10 rounded-full border-4 border-[#4f46e5] border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-slate-600">Retrieving live booking dossier from database...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-left font-ui">
        <Notice tone="danger" title="Reservation Not Found">
          {error || "Could not retrieve the specified reservation."}
        </Notice>
      </div>
    );
  }

  const currentTotalAmount = Number(booking.amount || booking.totalAmount || 0);
  const currentBalance = Number(booking.balance || 0);
  const updatedTotalAmount = currentTotalAmount + calculation.totalAdditionalAmount;
  const updatedBalance = currentBalance + calculation.totalAdditionalAmount;

  return (
    <div className="p-6 max-w-6xl mx-auto text-left font-ui space-y-6">
      
      {/* 1. Header with Status */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="bg-indigo-50 text-[#4338ca] border border-indigo-200 text-xs font-mono font-black px-2.5 py-0.5 rounded-md">
              Ref #{booking.bookingId || booking._id}
            </span>
            <Tag tone={booking.status === "Checked-in" ? "success" : "brand"}>
              {booking.status}
            </Tag>
            <span className="text-xs font-bold text-slate-500">
              {booking.source || "Front Desk Stay"}
            </span>
          </div>
          <h1 className="font-display text-2xl font-black text-[#0f172a]">
            Extend Guest Stay
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Modify departure timestamp starting directly from current checkout. Calculates dynamic hourly/nightly tariff.
          </p>
        </div>
      </div>

      {['checked-out', 'checked out', 'completed', 'cancelled', 'canceled'].includes(String(booking.status || '').toLowerCase().trim()) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
          <AlertCircle className="size-5 text-amber-600 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Stay Already Checked-Out</h4>
            <p className="text-xs text-amber-800">
              This reservation has been marked as <strong>Checked-out</strong>. Extending stay duration is only permitted for active in-house stays.
            </p>
          </div>
        </div>
      )}

      {/* 2. Main Grid Layout */}
      <form onSubmit={handleConfirmExtend} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Guest & Stay Context Panel */}
          <div 
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
            style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
          >
            <h2 className="text-sm font-black uppercase tracking-wider border-b pb-3 flex items-center gap-2" style={{ color: '#0f172a', borderColor: '#f1f5f9' }}>
              <User className="size-4 text-[#4f46e5]" />
              <span>Current Guest & Stay Context</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div 
                className="p-3.5 rounded-xl border space-y-1"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              >
                <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: '#64748b' }}>Primary Guest</span>
                <strong className="font-bold text-sm block truncate" style={{ color: '#0f172a' }}>{booking.guest || 'Guest'}</strong>
                <span className="font-medium text-xs block truncate" style={{ color: '#475569' }}>{booking.phone || booking.email || 'No contact'}</span>
              </div>

              <div 
                className="p-3.5 rounded-xl border space-y-1"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              >
                <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: '#64748b' }}>Assigned Room</span>
                <strong className="font-bold text-sm block flex items-center gap-1.5" style={{ color: '#0f172a' }}>
                  <Bed className="size-3.5 text-[#4f46e5] shrink-0" />
                  <span>Room #{booking.room || '101'}</span>
                </strong>
                <span className="font-medium text-xs block truncate" style={{ color: '#475569' }}>{booking.roomType || 'Standard Room'}</span>
              </div>

              <div 
                className="p-3.5 rounded-xl border space-y-1"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              >
                <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: '#64748b' }}>Current Check-Out</span>
                <strong className="font-extrabold text-xs block" style={{ color: '#4338ca' }}>
                  {formatDisplayDateWithTime(currentCheckOutDate, currentCheckOutTime)}
                </strong>
                <span className="font-semibold text-[11px] block" style={{ color: '#64748b' }}>Baseline departure</span>
              </div>
            </div>
          </div>

          {/* New Departure Time Selection Panel */}
          <div 
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5"
            style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
          >
            <h2 className="text-sm font-black uppercase tracking-wider border-b pb-3 flex items-center gap-2" style={{ color: '#0f172a', borderColor: '#f1f5f9' }}>
              <CalendarPlus className="size-4 text-[#4f46e5]" />
              <span>Select New Extended Check-Out</span>
            </h2>

            {/* Current vs New Check-out Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold block mb-1.5" style={{ color: '#0f172a' }}>
                  Extension Starting From (Current Check-Out)
                </Label>
                <div 
                  className="p-3 rounded-xl border text-xs font-bold flex items-center gap-2"
                  style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#0f172a' }}
                >
                  <Clock className="size-4 text-slate-500 shrink-0" />
                  <span>{formatDisplayDateWithTime(currentCheckOutDate, currentCheckOutTime)}</span>
                </div>
                <span className="text-[10px] font-semibold mt-1 block" style={{ color: '#64748b' }}>
                  Extension duration calculates strictly from this point.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-check-out-date" className="text-xs font-bold flex items-center justify-between" style={{ color: '#0f172a' }}>
                  <span>New Check-Out Date & Time <span className="text-rose-500">*</span></span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    id="new-check-out-date"
                    type="date"
                    min={currentCheckOutDate}
                    value={newCheckOutDate}
                    onChange={(e) => setNewCheckOutDate(e.target.value)}
                    required
                    className="col-span-2 h-10 text-xs font-bold"
                    style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                  />
                  <Input
                    id="new-check-out-time"
                    type="time"
                    value={newCheckOutTime}
                    onChange={(e) => setNewCheckOutTime(e.target.value)}
                    required
                    className="col-span-1 h-10 text-xs font-bold"
                    style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                  />
                </div>
                <span className="text-[10px] font-bold block" style={{ color: '#4338ca' }}>
                  Selected: {formatDisplayDateWithTime(newCheckOutDate, newCheckOutTime)}
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
              <span className="text-[11px] font-black uppercase tracking-wider block" style={{ color: '#475569' }}>
                Quick Extend Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-bold self-center uppercase mr-1" style={{ color: '#64748b' }}>Hours:</span>
                {[
                  { label: "+2 Hours", type: "hours", value: 2 },
                  { label: "+4 Hours (Half Day)", type: "hours", value: 4 },
                  { label: "+6 Hours", type: "hours", value: 6 }
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p.type, p.value)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-xs hover:border-indigo-400"
                    style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                  >
                    {p.label}
                  </button>
                ))}

                <span className="text-[10px] font-bold self-center uppercase mx-1" style={{ color: '#64748b' }}>Nights:</span>
                {[
                  { label: "+1 Night", type: "nights", value: 1 },
                  { label: "+2 Nights", type: "nights", value: 2 },
                  { label: "+3 Nights", type: "nights", value: 3 },
                  { label: "+5 Nights", type: "nights", value: 5 },
                  { label: "+7 Nights", type: "nights", value: 7 }
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p.type, p.value)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-xs hover:bg-indigo-100"
                    style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', color: '#4338ca' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agreed Nightly Base Tariff Rate */}
            <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderColor: '#f1f5f9' }}>
              <div>
                <Label htmlFor="daily-rate" className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>
                  Agreed Nightly Base Tariff (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: '#64748b' }}>₹</span>
                  <Input
                    id="daily-rate"
                    type="number"
                    min="0"
                    step="any"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Math.max(0, Number(e.target.value)))}
                    className="pl-7 h-10 text-xs font-bold"
                    style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                  />
                </div>
                <span className="text-[10px] font-semibold mt-1 block" style={{ color: '#64748b' }}>
                  Pro-rata hourly rate: ~{inr(Math.max(250, Math.round(dailyRate / 8)))}/hr
                </span>
              </div>

              <div>
                <Label htmlFor="notes" className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>
                  Extension Reason / Staff Remarks (Optional)
                </Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="e.g. Guest extended stay for business schedule."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs resize-none"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                />
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: High-Contrast Folio Impact Breakdown (5 Cols) */}
        <aside className="lg:col-span-5 space-y-4">
          <div 
            className="rounded-2xl p-6 border shadow-md space-y-5 text-left"
            style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
          >
            
            {/* 1. Breakdown Header */}
            <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="size-10 rounded-xl flex items-center justify-center shadow-xs shrink-0"
                  style={{ backgroundColor: '#eef2ff', border: '1.5px solid #c7d2fe', color: '#4338ca' }}
                >
                  <Receipt className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight" style={{ color: '#0f172a', margin: 0 }}>
                    Folio Impact Breakdown
                  </h3>
                  <span className="text-xs font-semibold block mt-0.5" style={{ color: '#475569' }}>
                    Real-time Tariff & Tax Assessment
                  </span>
                </div>
              </div>
              <span 
                className="text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 border shadow-2xs shrink-0"
                style={{ backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
              >
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Dynamic
              </span>
            </div>

            {/* 2. Timeline & Duration Comparison Card */}
            <div 
              className="p-4 rounded-xl border text-xs space-y-3"
              style={{
                backgroundColor: calculation.isValid ? '#f0fdf4' : '#f8fafc',
                borderColor: calculation.isValid ? '#86efac' : '#cbd5e1',
                color: '#0f172a'
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase tracking-wider" style={{ color: '#0f172a' }}>
                  Additional Stay Duration
                </span>
                <span 
                  className="font-black text-xs px-3 py-1 rounded-full shadow-xs"
                  style={{
                    backgroundColor: calculation.isValid ? '#15803d' : '#475569',
                    color: '#ffffff'
                  }}
                >
                  {calculation.durationLabel}
                </span>
              </div>

              <div className="space-y-2 pt-2.5 border-t" style={{ borderColor: calculation.isValid ? '#bbf7d0' : '#e2e8f0' }}>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold" style={{ color: '#334155' }}>Current Checkout:</span>
                  <span className="font-extrabold" style={{ color: '#0f172a' }}>
                    {formatDisplayDateWithTime(currentCheckOutDate, currentCheckOutTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold" style={{ color: '#4338ca' }}>New Extended Checkout:</span>
                  <span className="font-black" style={{ color: '#312e81' }}>
                    {formatDisplayDateWithTime(newCheckOutDate, newCheckOutTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Itemized Stay Charges Table */}
            <div 
              className="space-y-3 p-4.5 rounded-xl border shadow-xs"
              style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}
            >
              <span className="text-xs font-black uppercase tracking-wider block" style={{ color: '#0f172a' }}>
                Itemized Stay Charges
              </span>

              <div className="flex justify-between items-center py-2 text-xs">
                <span className="font-extrabold flex items-center gap-2" style={{ color: '#0f172a' }}>
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: '#4f46e5' }} />
                  <span style={{ color: '#0f172a', fontWeight: '800' }}>Additional Room Tariff ({calculation.durationLabel})</span>
                </span>
                <span className="font-black text-sm shrink-0" style={{ color: '#0f172a' }}>
                  {inr(calculation.roomCharges)}
                </span>
              </div>
            </div>

            {/* 4. Total Additional Payable Prominent Banner */}
            <div 
              className="p-4.5 rounded-xl flex items-center justify-between shadow-lg border"
              style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#ffffff' }}
            >
              <div>
                <span className="text-[11px] uppercase font-black block tracking-wider" style={{ color: '#94a3b8' }}>
                  Total Additional Payable
                </span>
                <span className="text-xs font-semibold block mt-0.5" style={{ color: '#e2e8f0' }}>
                  Additional Tariff
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black block tracking-tight" style={{ color: '#34d399' }}>
                  {inr(calculation.totalAdditionalAmount)}
                </span>
              </div>
            </div>

            {/* 5. Folio Ledger Impact Summary */}
            <div className="pt-2 border-t space-y-2.5 text-xs" style={{ borderColor: '#e2e8f0' }}>
              <span className="text-[11px] font-black uppercase tracking-wider block" style={{ color: '#0f172a' }}>
                Folio Ledger Impact Summary
              </span>
              
              <div 
                className="p-4 rounded-xl border space-y-3 shadow-2xs"
                style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}
              >
                <div className="flex justify-between text-xs">
                  <span className="font-bold" style={{ color: '#334155' }}>Current Folio Invoiced:</span>
                  <span className="font-black" style={{ color: '#0f172a' }}>{inr(currentTotalAmount)}</span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="font-bold" style={{ color: '#334155' }}>Current Balance Due:</span>
                  <span className="font-black" style={{ color: currentBalance > 0 ? '#b45309' : '#047857' }}>
                    {inr(currentBalance)}
                  </span>
                </div>

                <div 
                  className="flex justify-between items-center text-xs py-2 px-2.5 rounded-lg border" 
                  style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}
                >
                  <span className="font-black" style={{ color: '#312e81' }}>Additional Stay Charges:</span>
                  <span className="font-black text-sm" style={{ color: '#4338ca' }}>
                    +{inr(calculation.totalAdditionalAmount)}
                  </span>
                </div>

                <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <span className="font-bold" style={{ color: '#0f172a' }}>New Total Invoiced:</span>
                  <span className="font-black" style={{ color: '#0f172a' }}>{inr(updatedTotalAmount)}</span>
                </div>

                <div 
                  className="flex justify-between items-center text-xs pt-3.5 -mx-4 -mb-4 p-3.5 rounded-b-xl border-t"
                  style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }}
                >
                  <span className="font-black" style={{ color: '#0f172a' }}>New Balance Due at Checkout:</span>
                  <span 
                    className="font-black text-lg"
                    style={{ color: updatedBalance > 0 ? '#d97706' : '#059669' }}
                  >
                    {inr(updatedBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={submitting || !calculation.isValid}
                className="w-full h-12 text-sm font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border-0"
                style={{
                  backgroundColor: calculation.isValid ? '#4f46e5' : '#64748b',
                  color: '#ffffff',
                  cursor: (!calculation.isValid || submitting) ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting 
                  ? "Updating Stay & Folio..." 
                  : calculation.isValid 
                    ? `Confirm Extend Stay (${inr(calculation.totalAdditionalAmount)})`
                    : "Select New Check-Out Date/Time Above"}
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: `/reception/reservations/details/${booking._id || booking.id || booking.bookingId}` })}
                className="w-full h-10 text-xs font-bold rounded-xl transition-all border cursor-pointer hover:bg-slate-100"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  borderColor: '#94a3b8'
                }}
              >
                Cancel
              </button>
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
      { title: "Extend Stay — Receptionist Console" },
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
  component: ReceptionExtendReservation
};

export default ReceptionExtendReservation;
