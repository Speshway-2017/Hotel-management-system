import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Crumbs, Tag, Notice } from "@/components/hs/kit";
import { receptionistService } from "@/services/receptionist";
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

function ReceptionExtendReservation() {
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
        const rate = Number(matched.roomRate || matched.dailyRate || matched.pricePerNight || (matched.totalAmount && matched.nights ? matched.totalAmount / matched.nights : 2500)) || 2500;
        setDailyRate(rate);

        const curOut = matched.checkOut || matched.departureDate || matched.checkOutDate;
        if (curOut) {
          const curDate = new Date(curOut);
          const nextDay = new Date(curDate.getTime() + 86400000);
          setNewCheckOutDate(formatDateToYYYYMMDD(nextDay));
        }
      } else {
        setError(`Reservation #${targetId || ''} could not be located.`);
      }
    } catch (err) {
      console.error("Failed to load reservation for extend", err);
      setError("Failed to load reservation details. Please check network connection.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();

    const unsubscribe = subscribeRealtimeSync((event) => {
      if (["RESERVATION_UPDATED", "BOOKING_UPDATED", "ROOM_STATUS_UPDATED"].includes(event.type)) {
        loadBooking(true);
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [targetId]);

  const currentCheckOut = booking?.checkOut || booking?.departureDate || booking?.checkOutDate;
  const currentCheckIn = booking?.checkIn || booking?.arrivalDate || booking?.checkInDate;
  const guestName = booking?.guestName || booking?.guest?.name || (booking?.guest?.firstName ? `${booking.guest.firstName} ${booking.guest.lastName || ''}` : "Guest");
  const roomNum = booking?.roomNumber || booking?.room || booking?.roomAssigned || "N/A";
  const roomType = booking?.roomType || booking?.category || "Standard Room";

  const minSelectableDate = currentCheckOut ? (() => {
    const d = new Date(currentCheckOut);
    d.setDate(d.getDate() + 1);
    return formatDateToYYYYMMDD(d);
  })() : formatDateToYYYYMMDD(new Date());

  const extraNights = getAdditionalNights(currentCheckOut, newCheckOutDate);
  const additionalRoomCharges = extraNights * (Number(dailyRate) || 0);
  const additionalGst = Math.round(additionalRoomCharges * 0.12);
  const additionalTotal = additionalRoomCharges + additionalGst;

  const handleQuickAddDays = (days) => {
    if (!currentCheckOut) return;
    const base = new Date(currentCheckOut);
    base.setDate(base.getDate() + days);
    setNewCheckOutDate(formatDateToYYYYMMDD(base));
  };

  const handleConfirmExtend = async (e) => {
    e.preventDefault();
    if (!newCheckOutDate) {
      toast.error("Please choose a valid extended check-out date.");
      return;
    }
    if (extraNights <= 0) {
      toast.error("New check-out date must be after current check-out date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        days: extraNights,
        newCheckOutDate,
        dailyRate: Number(dailyRate),
        additionalAmount: additionalTotal,
        notes: notes.trim(),
        role: "receptionist"
      };

      const bId = booking._id || booking.id || booking.bookingId || targetId;
      await receptionistService.extendReservation(bId, payload);

      emitRealtimeEvent("RESERVATION_UPDATED", {
        reservationId: bId,
        newCheckOut: newCheckOutDate,
        extendedNights: extraNights,
        role: "receptionist"
      });

      toast.success(`Reservation extended by ${extraNights} night${extraNights > 1 ? 's' : ''} until ${newCheckOutDate}!`, {
        description: `Room charge of ${inr(additionalTotal)} (inc. GST) appended to guest folio.`
      });

      navigate({ to: "/reception/reservations" });
    } catch (err) {
      console.error("Extend stay failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to extend stay. Room may have conflict on selected dates.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <Crumbs items={[
        { label: "Front Desk", href: "/reception" },
        { label: "Reservations", href: "/reception/reservations" },
        { label: "Extend Stay" }
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/reception/reservations" })}
            className="mb-2 -ml-2 text-slate-500 hover:text-slate-900 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Reservations
          </Button>
          <PageHeader
            title="Extend Guest Stay"
            subtitle="Lengthen checked-in stay, update checkout date, and adjust folio billing."
          />
        </div>
      </div>

      {loading && (
        <Panel className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-medium text-sm">Loading reservation & room allocation details...</p>
        </Panel>
      )}

      {error && !loading && (
        <Panel className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-semibold text-slate-900">Unable to Load Reservation</h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
          </div>
          <Button variant="outline" onClick={() => navigate({ to: "/reception/reservations" })}>
            Return to Reservations
          </Button>
        </Panel>
      )}

      {!loading && !error && booking && (
        <form onSubmit={handleConfirmExtend} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Extension Form */}
          <div className="lg:col-span-2 space-y-6">
            <Panel title="Stay & Date Modification">
              <div className="space-y-5">
                {/* Current Dates summary banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-100/70 text-emerald-700">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Check-In</span>
                      <p className="text-sm font-semibold text-slate-800">{currentCheckIn ? new Date(currentCheckIn).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-100/70 text-indigo-700">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Check-Out</span>
                      <p className="text-sm font-semibold text-slate-800">{currentCheckOut ? new Date(currentCheckOut).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Add Presets */}
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-2 block">Quick Add Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 5, 7].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAddDays(num)}
                        className={`h-9 px-3.5 rounded-lg text-xs font-medium transition-all ${
                          extraNights === num 
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold shadow-xs"
                            : "hover:border-slate-400 text-slate-700"
                        }`}
                      >
                        +{num} {num === 1 ? "Night" : "Nights"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Date Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="newCheckOut" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <CalendarPlus className="w-4 h-4 text-emerald-600" />
                      New Check-Out Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="newCheckOut"
                      type="date"
                      min={minSelectableDate}
                      value={newCheckOutDate}
                      onChange={(e) => setNewCheckOutDate(e.target.value)}
                      required
                      className="h-11 rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 font-medium"
                    />
                    <p className="text-xs text-slate-500">Must be after {currentCheckOut ? new Date(currentCheckOut).toLocaleDateString() : 'today'}.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dailyRate" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-slate-600" />
                      Daily Room Tariff (₹)
                    </Label>
                    <Input
                      id="dailyRate"
                      type="number"
                      min="0"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                      className="h-11 rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 font-medium"
                    />
                    <p className="text-xs text-slate-500">Base rate applied per additional night.</p>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="notes" className="text-sm font-semibold text-slate-800">
                    Reason / Front Desk Remarks (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="e.g., Guest requested late departure, business meeting extended..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </Panel>

            {/* Room conflict check & policy notices */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-semibold block mb-0.5">Automated Realtime Room Sync</span>
                Extending this stay automatically locks Room #{roomNum} on the Front Desk grid, prevents overlapping check-ins, and logs the charge on the active guest folio.
              </div>
            </div>
          </div>

          {/* Side Summary & Confirmation Card */}
          <div className="space-y-6">
            <Panel title="Reservation Details">
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Guest Name
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">{guestName}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Bed className="w-3.5 h-3.5 text-slate-400" /> Assigned Room
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">Room {roomNum}</span>
                    <span className="text-slate-400 block text-[11px]">{roomType}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Booking ID
                  </span>
                  <Tag color="slate" className="font-mono font-medium">
                    {booking.bookingId || booking._id?.slice(-8) || "N/A"}
                  </Tag>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Status</span>
                  <Tag color="emerald" className="font-medium">
                    {booking.status || "Checked In"}
                  </Tag>
                </div>
              </div>
            </Panel>

            <Panel title="Financial Breakdown" className="border-emerald-100 shadow-sm bg-gradient-to-b from-white to-emerald-50/20">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Additional Nights</span>
                  <span className="font-bold text-slate-900 text-base">+{extraNights}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Rate per Night</span>
                  <span className="font-medium text-slate-900">{inr(dailyRate)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Room Charges</span>
                  <span className="font-medium text-slate-900">{inr(additionalRoomCharges)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>GST (12%)</span>
                  <span className="font-medium text-slate-900">{inr(additionalGst)}</span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900">Total Additional Bill</span>
                  <span className="text-xl font-extrabold text-emerald-700">{inr(additionalTotal)}</span>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || extraNights <= 0}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl mt-4 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing Extension...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Extend Stay
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Updates room calendar & guest folio instantly.
                </p>
              </div>
            </Panel>
          </div>
        </form>
      )}
    </div>
  );
}

export const Route = {
  head: () => ({
    meta: [{ title: "Extend Stay - Front Desk | Grand HMS" }],
  }),
  useParams: () => {
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/reception\/(?:reservations\/)?extend\/([^/]+)/);
      if (match && match[1]) return { id: match[1] };
      const searchId = new URLSearchParams(window.location.search).get("id");
      if (searchId) return { id: searchId };
    }
    return { id: "" };
  },
  component: ReceptionExtendReservation,
};

export default ReceptionExtendReservation;
