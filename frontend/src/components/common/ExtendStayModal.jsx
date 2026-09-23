import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { managerService } from "@/services/manager";
import { superAdminService } from "@/services/superAdmin";
import { receptionistService } from "@/services/receptionist";
import { emitRealtimeEvent } from "@/services/socket";
import { validateWithZod, extendStaySchema } from "@/schemas";
import { 
  Calendar, Clock, DollarSign, Sparkles, X, Plus, AlertCircle, 
  Info, Bed, User, CalendarPlus, Check, ChevronRight, ShieldCheck, ArrowRight
} from "lucide-react";

// Format date helpers
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

const inr = (val) => "₹" + Math.round(Number(val || 0)).toLocaleString("en-IN");

/**
 * Reusable, Redesigned Extend Stay Button
 * Used across Admin, Manager, and Receptionist views
 */
import { useNavigate } from "react-router-dom";

export function ExtendStayButton({
  booking,
  bookingId,
  role,
  onClick,
  variant = "table", // "table" | "header" | "icon" | "card" | "drawer"
  size = "sm",
  className = "",
  label = "Extend Stay",
  disabled = false,
  title = "Extend guest stay dates"
}) {
  const navigate = useNavigate();

  // Hide Extend Stay completely after check-out or cancellation
  const statusLower = String(booking?.status || "").toLowerCase().trim();
  const isCheckedOut =
    statusLower === "checked-out" ||
    statusLower === "checked out" ||
    statusLower === "completed" ||
    statusLower === "cancelled" ||
    statusLower === "canceled";

  if (isCheckedOut) {
    return null;
  }

  const handleClick = (e) => {
    if (disabled) return;

    if (onClick) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      onClick(e);
      return;
    }

    const targetId = bookingId || booking?._id || booking?.id || booking?.bookingId || booking?.reservationId;
    
    // Determine target role path
    let targetRole = role;
    if (!targetRole && typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/admin')) targetRole = 'admin';
      else if (p.startsWith('/manager')) targetRole = 'manager';
      else if (p.startsWith('/reception')) targetRole = 'reception';
      else targetRole = 'manager';
    }

    if (targetId) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      const targetUrl = targetRole === 'reception'
        ? `/reception/reservations/extend/${targetId}`
        : `/${targetRole}/reservations/extend/${targetId}`;
      navigate(targetUrl);
      return;
    }
  };

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={title}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
      >
        <span className="p-1 rounded-lg bg-white/15 text-white">
          <CalendarPlus className="size-3.5" />
        </span>
        <span>{label}</span>
      </button>
    );
  }

  if (variant === "drawer" || variant === "card") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={title}
        className={`w-full flex items-center justify-between p-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-transparent hover:from-indigo-100/80 hover:to-purple-50/60 text-indigo-950 font-bold text-xs transition-all duration-200 shadow-2xs hover:shadow-sm cursor-pointer group ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <CalendarPlus className="size-3.5" />
          </div>
          <div className="text-left">
            <span className="block leading-none text-indigo-950">{label}</span>
            <span className="text-[10px] text-indigo-600/80 font-normal mt-0.5 block">Prolong departure date</span>
          </div>
        </div>
        <ArrowRight className="size-3.5 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={title}
        className={`h-7 w-7 p-0 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 flex items-center justify-center transition-all duration-150 cursor-pointer shadow-2xs ${className}`}
      >
        <CalendarPlus className="size-3.5" />
      </button>
    );
  }

  // Default: "table" sleek icon button (icon-only size-7 with tooltip)
  const tooltipTitle = title || "Extend Stay";
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={tooltipTitle}
      aria-label={tooltipTitle}
      className={`size-7 w-7 h-7 min-w-7 min-h-7 max-w-7 max-h-7 p-0 rounded-lg border text-xs font-bold leading-none font-ui select-none shrink-0 shadow-2xs transition-colors duration-150 cursor-pointer bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 inline-flex items-center justify-center ${className}`}
      style={{
        width: "28px",
        height: "28px",
        minWidth: "28px",
        minHeight: "28px",
        maxWidth: "28px",
        maxHeight: "28px"
      }}
    >
      <CalendarPlus className="size-3.5 w-3.5 h-3.5 min-w-3.5 min-h-3.5 shrink-0" />
    </button>
  );
}


export function ExtendStayModal({ booking, isOpen, onClose, onSuccess, userRole = "manager" }) {
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [dailyRate, setDailyRate] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  const currentCheckOut = booking?.checkOut || formatDateToYYYYMMDD(new Date());
  const currentOutDate = new Date(currentCheckOut);
  const minDate = formatDateToYYYYMMDD(currentOutDate);

  useEffect(() => {
    if (booking && isOpen) {
      const baseDate = booking.checkOut ? formatDateToYYYYMMDD(new Date(booking.checkOut)) : formatDateToYYYYMMDD(new Date());
      setNewCheckOutDate(baseDate);

      // Calculate approximate daily base rate
      const totalAmount = Number(booking.amount || booking.totalAmount || 3000);
      const totalNights = Number(booking.nights || 1);
      const avgNight = totalAmount / Math.max(1, totalNights);
      const baseDailyRate = Math.round(avgNight);
      setDailyRate(baseDailyRate > 0 ? baseDailyRate : 3000);
      setNotes("");
    }
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;
  
  const additionalNights = getAdditionalNights(currentCheckOut, newCheckOutDate);
  const roomCharges = dailyRate * additionalNights;
  const totalAdditionalAmount = roomCharges;

  const handleQuickAddNights = (nightsToAdd) => {
    const targetDate = new Date(currentOutDate.getTime() + nightsToAdd * 24 * 60 * 60 * 1000);
    setNewCheckOutDate(formatDateToYYYYMMDD(targetDate));
  };

  const handleConfirmExtend = async () => {
    const val = validateWithZod(extendStaySchema, {
      extraDays: additionalNights,
      additionalAmount: totalAdditionalAmount,
      reason: notes
    });

    if (!val.isValid) {
      toast.error(val.firstError);
      return;
    }

    const bookingTargetId = booking._id || booking.id || booking.bookingId;
    if (!bookingTargetId) {
      toast.error("Missing valid booking identifier.");
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

      let res;
      if (userRole === "admin" || userRole === "super-admin") {
        try {
          res = await superAdminService.extendReservation(bookingTargetId, payload);
        } catch (e) {
          res = await managerService.extendReservation(bookingTargetId, payload);
        }
      } else if (userRole === "receptionist") {
        try {
          res = await receptionistService.extendReservation(bookingTargetId, payload);
        } catch (e) {
          res = await managerService.extendReservation(bookingTargetId, payload);
        }
      } else {
        res = await managerService.extendReservation(bookingTargetId, payload);
      }

      if (res && res.success) {
        toast.success(`Stay extended successfully until ${newCheckOutDate}! (+${additionalNights} Night${additionalNights > 1 ? 's' : ''})`);
        
        // Notify socket real-time listeners
        const roomNum = booking.room || booking.roomNumber || null;
        emitRealtimeEvent('booking_updated', { action: 'extend', roomNum });
        emitRealtimeEvent('dashboard_sync', { action: 'extend', roomNum });
        emitRealtimeEvent('room_status_changed', { action: 'extend', roomNum });

        if (onSuccess) {
          onSuccess(res.data || { ...booking, checkOut: newCheckOutDate });
        }
        onClose();
      } else {
        toast.error(res?.message || "Failed to extend stay duration.");
      }
    } catch (err) {
      console.error("Extend stay error:", err);
      toast.error(err.message || "An error occurred while extending stay.");
    } finally {
      setSubmitting(false);
    }
  };

  const guestName = booking.guest || booking.guestName || booking.name || "Guest";
  const roomNumber = booking.room || booking.roomNumber || "Unassigned";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-ui">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-white">
              <CalendarPlus className="size-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight flex items-center gap-2">
                <span>Extend Guest Stay</span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  In-House
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2">
                <span>Guest: <strong className="text-white">{guestName}</strong></span>
                <span>•</span>
                <span>Room: <strong className="text-white">#{roomNumber}</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Quick Dates Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                Current Checkout
              </label>
              <div className="font-bold text-[#0f172a] bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 h-10">
                <Clock className="size-3.5 text-slate-500" />
                <span>{currentCheckOut}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                New Checkout Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={minDate}
                value={newCheckOutDate}
                onChange={(e) => setNewCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs text-[#0f172a] font-bold focus:outline-none focus:ring-2 focus:ring-[#4f46e5] h-10 cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Nights Extension Buttons */}
          <div>
            <span className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
              Quick Extension Presets
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((n) => {
                const isSelected = additionalNights === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleQuickAddNights(n)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-[#4f46e5] text-white border-[#4f46e5] shadow-sm font-black"
                        : "bg-slate-50 border-slate-200 hover:bg-indigo-50 text-[#0f172a]"
                    }`}
                  >
                    +{n} Night{n > 1 ? "s" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration & Daily Tariff Rates */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
              <span className="block text-[10px] font-black text-[#4338ca] uppercase tracking-wider">
                Additional Stay Duration
              </span>
              <p className="text-base font-black text-[#1e1b4b] mt-0.5">
                {additionalNights} Night{additionalNights !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                Daily Rate
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500 text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-6 pr-3 py-2 border border-slate-300 bg-white rounded-xl text-xs text-[#0f172a] font-bold focus:outline-none focus:ring-1 focus:ring-[#4f46e5] h-10"
                />
              </div>
            </div>
          </div>

          {/* Tariff Ledger Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 select-none">
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>Room Tariff ({additionalNights} × {inr(dailyRate)}):</span>
              <span className="font-bold text-slate-900">{inr(roomCharges)}</span>
            </div>
          </div>

          {/* Prominent Total Additional Payable Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-sm border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
                Total Additional Payable
              </span>
              <span className="text-[11px] text-slate-300 font-medium">Additional Room Tariff</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-emerald-400 block tracking-tight">
                {inr(totalAdditionalAmount)}
              </span>
            </div>
          </div>

          {/* Optional Extension Notes */}
          <div>
            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
              Extension Note / Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Guest requested extension for extra meetings"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#4f46e5] h-9"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-10 px-4 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-100 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmExtend}
              disabled={submitting || additionalNights <= 0}
              className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black h-10 px-6 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {submitting ? "Extending Stay..." : `Confirm Extension (${inr(totalAdditionalAmount)})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExtendStayModal;

