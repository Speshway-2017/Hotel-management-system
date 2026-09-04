import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { managerService } from "@/services/manager";
import { superAdminService } from "@/services/superAdmin";
import { receptionistService } from "@/services/receptionist";
import { emitRealtimeEvent } from "@/services/socket";
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

/**
 * Reusable, Redesigned Extend Stay Button
 * Used across Admin, Manager, and Receptionist views
 */
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
  const handleClick = (e) => {
    if (disabled) return;

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

    if (onClick && !targetId) {
      onClick(e);
      return;
    }

    if (targetId) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      const targetUrl = targetRole === 'reception'
        ? `/reception/reservations/extend/${targetId}`
        : `/${targetRole}/reservations/extend/${targetId}`;
      window.location.href = targetUrl;
      return;
    }

    if (onClick) {
      onClick(e);
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

  // Default: "table" sleek pill badge button
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50/90 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-xs active:scale-95 transition-all duration-150 cursor-pointer group select-none whitespace-nowrap ${className}`}
    >
      <CalendarPlus className="size-3.5 text-indigo-500 group-hover:text-white transition-colors" />
      <span>{label === "Extend Stay" ? "Extend" : label}</span>
    </button>
  );
}


export function ExtendStayModal({ booking, isOpen, onClose, onSuccess, userRole = "manager" }) {
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [dailyRate, setDailyRate] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (booking && isOpen) {
      const currentOut = booking.checkOut ? new Date(booking.checkOut) : new Date();
      // Default to next day
      const nextDay = new Date(currentOut.getTime() + 24 * 60 * 60 * 1000);
      setNewCheckOutDate(formatDateToYYYYMMDD(nextDay));

      // Calculate approximate daily base rate
      const totalAmount = Number(booking.amount || booking.totalAmount || 3000);
      const totalNights = Number(booking.nights || 1);
      const avgNightWithTax = totalAmount / Math.max(1, totalNights);
      // Remove 18% GST to get base rate
      const baseDailyRate = Math.round(avgNightWithTax / 1.18);
      setDailyRate(baseDailyRate > 0 ? baseDailyRate : 2500);
      setNotes("");
    }
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;

  const currentCheckOut = booking.checkOut || formatDateToYYYYMMDD(new Date());
  const currentOutDate = new Date(currentCheckOut);
  const minDate = formatDateToYYYYMMDD(new Date(currentOutDate.getTime() + 24 * 60 * 60 * 1000));
  
  const additionalNights = getAdditionalNights(currentCheckOut, newCheckOutDate);
  const roomCharges = dailyRate * additionalNights;
  const gstAmount = Math.round(roomCharges * 0.18);
  const totalAdditionalAmount = roomCharges + gstAmount;

  const handleQuickAddNights = (nightsToAdd) => {
    const targetDate = new Date(currentOutDate.getTime() + nightsToAdd * 24 * 60 * 60 * 1000);
    setNewCheckOutDate(formatDateToYYYYMMDD(targetDate));
  };

  const handleConfirmExtend = async () => {
    if (additionalNights <= 0) {
      toast.error("New check-out date must be after current check-out date.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-xs animate-fade-in font-ui">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-muted transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-navy via-indigo-950 to-indigo text-white p-5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-white/20 flex items-center justify-center text-cyan-300 backdrop-blur-md shadow-sm">
              <CalendarPlus className="size-5.5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight flex items-center gap-2">
                <span>Extend Guest Stay</span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  In-House
                </span>
              </h3>
              <p className="text-xs text-cyan-100/80 font-medium mt-0.5 flex items-center gap-2">
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
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Current Checkout
              </label>
              <div className="font-bold text-navy bg-muted/20 border border-muted/50 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 h-10">
                <Clock className="size-3.5 text-muted-foreground" />
                <span>{currentCheckOut}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                New Checkout Date
              </label>
              <input
                type="date"
                min={minDate}
                value={newCheckOutDate}
                onChange={(e) => setNewCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/30 rounded-xl text-xs text-navy font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Nights Extension Buttons */}
          <div>
            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
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
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md scale-[1.02]"
                        : "bg-muted/15 border-muted hover:bg-muted/30 text-navy"
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
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 rounded-xl p-3">
              <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Additional Stay Duration
              </span>
              <p className="text-lg font-black text-emerald-950 mt-0.5">
                {additionalNights} Night{additionalNights !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Daily Rate (Excl. GST)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-muted-foreground text-xs">₹</span>
                <input
                  type="number"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-6 pr-3 py-2 border border-muted bg-[#fafafa] rounded-xl text-xs text-navy font-bold focus:outline-none focus:ring-1 focus:ring-navy h-10"
                />
              </div>
            </div>
          </div>

          {/* Tariff Ledger Breakdown */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 select-none">
            <div className="flex justify-between text-muted-foreground font-semibold">
              <span>Room Charges ({additionalNights} × ₹{dailyRate.toLocaleString()}):</span>
              <span className="font-bold text-navy">₹{roomCharges.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground font-semibold">
              <span>GST (18% Goods & Services Tax):</span>
              <span className="font-bold text-navy">₹{gstAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-black text-navy text-sm pt-2 border-t border-slate-200">
              <span>Total Additional Payable:</span>
              <span className="text-emerald-700 font-extrabold text-base">
                ₹{totalAdditionalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Optional Extension Notes */}
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Extension Note / Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Guest requested extension for extra business meetings"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-muted bg-[#fafafa] rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy h-9"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-muted/40">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-10 px-4 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmExtend}
              disabled={submitting || additionalNights <= 0}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white font-bold h-10 px-6 rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer transition-all active:scale-95"
            >
              {submitting ? "Extending Stay..." : "Confirm & Extend Stay"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExtendStayModal;
