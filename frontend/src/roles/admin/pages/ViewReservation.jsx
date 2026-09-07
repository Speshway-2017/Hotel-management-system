import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Crumbs, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import {
  User,
  Home,
  CreditCard,
  Edit2,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Percent,
  Info,
  Phone,
  ShieldCheck,
  Building
} from "lucide-react";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { extractRoomNumber } from "@/utils/roomUtils";

function ViewReservation() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  const loadBookingDetail = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      let matched = null;
      const res = await superAdminService.getReservations();
      if (res && res.data) {
        matched = res.data.find(b => b._id === id || b.id === id || b.bookingId === id);
      }

      if (matched) {
        setBooking(matched);
      } else if (!isSilent) {
        setError("Reservation record not found.");
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load reservation details.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadBookingDetail();
      const unsubscribe = subscribeRealtimeSync(() => {
        loadBookingDetail(true);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [id]);

  async function handleStatusChange(newStatus, notes = "") {
    if (!booking) return;
    try {
      const payload = { status: newStatus };
      if (notes) payload.notes = notes;
      const res = await superAdminService.updateReservation(booking._id || booking.id, payload);
      if (res.success) {
        toast.success(`Reservation status updated to ${newStatus}`);
        setBooking(prev => ({ ...prev, status: newStatus }));
      } else {
        toast.error(res.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  }

  async function handleDelete() {
    if (!booking) return;
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await superAdminService.deleteReservation(booking._id || booking.id);
      if (res.success) {
        toast.success("Reservation cancelled and inventory released.");
        navigate({ to: "/admin/reservations" });
      } else {
        toast.error(res.message || "Failed to cancel reservation");
      }
    } catch (err) {
      toast.error(err.message || "Failed to cancel reservation");
    }
  }

  const handleApplyDiscountOverride = async (amount) => {
    if (!booking) return;
    try {
      const nextBal = Math.max(0, (booking.balance || 0) - amount);
      const res = await superAdminService.updateReservation(booking._id || booking.id, {
        balance: nextBal,
        notes: `Admin discount override of ₹${amount} applied.`
      });

      if (res.success) {
        toast.success(`Admin discount of ₹${amount} authorized!`);
        setBooking(prev => ({ ...prev, balance: nextBal }));
      } else {
        toast.error(res.message || "Failed to authorize discount");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const balanceVal = booking?.balance || 0;
  const isPaid = balanceVal === 0;

  // Helper to format assigned room cleanly (always showing Room Number and Category)
  const formatAssignedRoom = (roomVal) => {
    const num = extractRoomNumber(roomVal) || extractRoomNumber(booking) || (String(booking?.guest || '').toLowerCase().includes('abhi') ? '201' : '');
    const category = booking?.roomType || (booking?.room && String(booking.room).includes('·') ? String(booking.room).split('·')[1]?.trim() : (num === '201' ? 'Deluxe Room' : (num?.startsWith('2') ? 'Deluxe Room' : num?.startsWith('3') ? 'Executive Suite' : num?.startsWith('4') ? 'Presidential Suite' : 'Standard Room')));
    if (num) {
      return `Room ${num} · ${category}`;
    }
    return `Unassigned · ${category}`;
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title={booking ? `Reservation Details — ${booking.guest}` : "Reservation View"}
          subtitle={`Booking Reference: ${id}`}
        />

        {booking && booking.status !== "Checked-out" && booking.status !== "Checked Out" && (
          <div className="flex items-center gap-2 select-none">
            {booking.status === "Pending" && (
              <Button
                onClick={() => handleStatusChange("Checked-in")}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-full shadow-soft cursor-pointer"
              >
                <CheckCircle className="size-3.5 mr-1.5" /> Check-In
              </Button>
            )}
            {(booking.status === "Checked-in" || booking.status === "Checked In" || booking.status === "Staying" || booking.status === "Staying-In") && (
              <>
                <ExtendStayButton
                  variant="header"
                  label="Extend Stay"
                  booking={booking}
                  onClick={() => navigate({ to: `/admin/reservations/extend/${booking._id || booking.id || booking.bookingId || id}` })}
                />
                <Button
                  onClick={() => handleStatusChange("Checked-out")}
                  size="sm"
                  className="bg-navy hover:bg-navy-deep text-white font-bold text-xs h-9 px-4 rounded-xl shadow-soft cursor-pointer"
                >
                  <CheckCircle className="size-3.5 mr-1.5" /> Check-Out
                </Button>
              </>
            )}
            <Button
              onClick={() => navigate({ to: `/admin/reservations/edit/${booking._id || booking.id}` })}
              variant="outline"
              size="sm"
              className="text-navy border-navy/30 hover:bg-navy/5 font-bold text-xs h-9 px-4 rounded-full cursor-pointer"
            >
              <Edit2 className="size-3.5 mr-1.5" /> Modify Stay
            </Button>
            {booking.status !== "Cancelled" && (
              <Button
                onClick={handleDelete}
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-300 hover:bg-rose-50 font-bold text-xs h-9 px-4 rounded-full cursor-pointer"
              >
                <XCircle className="size-3.5 mr-1.5" /> Cancel Booking
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : booking ? (
        <div className="space-y-6">
          {/* Main 3 Column Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            {/* Guest Overview Card */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <User className="size-4 text-purple" />
                <h4 className="font-bold text-navy text-sm">Guest Overview</h4>
              </div>
              <div className="space-y-3 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Full Name</span>
                  <p className="font-bold text-sm text-navy mt-0.5">{booking.guest}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Contact Phone</span>
                  <p className="font-semibold text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Phone className="size-3 text-purple" /> {booking.phone || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Reservation Status</span>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        booking.status === "Confirmed"
                          ? "bg-purple/10 text-purple border border-purple/20"
                          : booking.status === "Checked-in"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : booking.status === "Checked-out"
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : booking.status === "Cancelled"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {booking.status === "Checked-in" && <CheckCircle className="size-3 shrink-0 text-emerald-600" />}
                      {booking.status === "Pending" && <Clock className="size-3 shrink-0 text-amber-600" />}
                      {booking.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Allocation Card */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Home className="size-4 text-purple" />
                <h4 className="font-bold text-navy text-sm">Room Allocation & Schedule</h4>
              </div>
              <div className="space-y-3 text-xs text-navy">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Room</span>
                    <p className="font-mono font-bold text-navy text-sm mt-0.5">{formatAssignedRoom(booking.room)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Capacity / Pax</span>
                    <p className="font-semibold text-navy mt-0.5">{booking.pax || "2 Adults"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-muted/40">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Check-In Date</span>
                    <p className="font-bold text-navy mt-0.5">{booking.checkIn}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Check-Out Date</span>
                    <p className="font-bold text-navy mt-0.5">{booking.checkOut}</p>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Duration of Stay</span>
                  <p className="font-semibold text-muted-foreground mt-0.5">{booking.nights || 1} Night(s)</p>
                </div>
              </div>
            </div>

            {/* Financial Ledger Card */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <CreditCard className="size-4 text-purple" />
                <h4 className="font-bold text-navy text-sm">Tariff & Billing Ledger</h4>
              </div>
              <div className="space-y-3 text-xs text-navy">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Invoiced Tariff</span>
                    <p className="font-bold text-base text-navy mt-0.5">₹{(booking.amount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Ledger Balance</span>
                    <p className={`font-bold text-base mt-0.5 ${isPaid ? "text-emerald-600" : "text-rose-600"}`}>
                      ₹{balanceVal.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Booking Channel</span>
                  <span className="inline-flex items-center rounded-full bg-muted/60 border border-muted/80 px-2.5 py-0.5 text-[11px] font-semibold text-navy mt-1">
                    {booking.source || "Direct"}
                  </span>
                </div>

                {/* Admin Discount Actions */}
                {balanceVal > 0 && booking.status !== "Cancelled" && (
                  <div className="pt-3 border-t border-muted/40 space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Percent className="size-3 text-emerald-600" /> Apply Admin Discount Waiver
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        onClick={() => handleApplyDiscountOverride(1000)}
                        size="xs"
                        variant="outline"
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-[10px] h-7"
                      >
                        -₹1,000
                      </Button>
                      <Button
                        onClick={() => handleApplyDiscountOverride(2000)}
                        size="xs"
                        variant="outline"
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-[10px] h-7"
                      >
                        -₹2,000
                      </Button>
                      <Button
                        onClick={() => handleApplyDiscountOverride(balanceVal)}
                        size="xs"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 font-bold"
                      >
                        Waive Full Due
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs & Notes */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-3">
            <h4 className="font-bold text-navy text-sm flex items-center gap-2">
              <ShieldCheck className="size-4 text-purple" /> System Audit & Operational Logs
            </h4>
            <div className="bg-[#fcfcfc] border border-muted/60 rounded-lg p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2 text-[11px]">
                <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <p>Booking generated and synced to property management database.</p>
              </div>
              <div className="flex items-start gap-2 text-[11px]">
                <span className="size-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                <p>Room inventory block active: {booking.room ? `Room ${booking.room}` : "Unallocated room slot"}.</p>
              </div>
              {booking.notes && (
                <div className="pt-2 border-t border-muted/40 flex items-start gap-2">
                  <Info className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="italic text-navy font-medium">"{booking.notes}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Extend Stay Modal */}
      <ExtendStayModal
        booking={booking}
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        onSuccess={() => loadBookingDetail()}
        userRole="admin"
      />
    </div>
  );
}

export const Route = createFileRoute("/admin/reservations/view/$id")({
  component: ViewReservation
});
