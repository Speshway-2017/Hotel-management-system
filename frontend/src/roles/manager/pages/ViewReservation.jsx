import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { Calendar, User, Home, CreditCard, ShieldAlert, CheckCircle, Edit2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";
import { extractRoomNumber } from "@/utils/roomUtils";

function ManagerViewReservation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  const loadBookingDetail = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await managerService.getReservations();
      if (res.success && Array.isArray(res.data)) {
        const matched = res.data.find(b => String(b._id) === String(id) || String(b.id) === String(id) || String(b.bookingId) === String(id));
        if (matched) {
          setBooking(matched);
        } else if (!isSilent) {
          setError("Reservation record not found.");
        }
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load reservation details.");
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
      loadBookingDetail();
      const unsubscribe = subscribeRealtimeSync(() => {
        loadBookingDetail(true);
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
          You are not authorized to view reservations for this property. Access is strictly scoped to your assigned hotel branch.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <Crumbs
        items={[
          { label: "Dashboard", to: "/manager" },
          { label: "Today's Operations", to: "/manager/operations" },
          { label: "Reservations", to: "/manager/reservations" },
          { label: booking ? `Booking #${booking.bookingId || booking.id || id}` : "Reservation Details" }
        ]}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title={booking ? `Reservation Details: ${booking._id || booking.id}` : "Reservation Details"}
          subtitle="Guest stay overview, room parameters, and tariff details."
        />

        {booking && (() => {
          const statusLower = (booking.status || "").toLowerCase().trim();
          const isTerminal = ["checked-out", "checked out", "checked_out", "completed", "cancelled", "canceled", "rejected"].includes(statusLower);
          if (isTerminal) return null;

          const canExtend = ["checked-in", "checked in", "staying", "staying-in", "confirmed"].includes(statusLower);

          return (
            <div className="flex items-center gap-2 select-none">
              {canExtend && (
                <ExtendStayButton
                  variant="header"
                  label="Extend Stay"
                  booking={booking}
                  onClick={() => navigate({ to: `/manager/reservations/extend/${booking._id || booking.id}` })}
                />
              )}
              <Button
                onClick={() => navigate({ to: `/manager/reservations/edit/${booking._id || booking.id}` })}
                variant="outline"
                size="sm"
                className="text-navy border-navy/30 hover:bg-navy/5 font-bold text-xs h-9 px-4 rounded-full cursor-pointer"
              >
                <Edit2 className="size-3.5 mr-1.5" /> Modify Stay
              </Button>
            </div>
          );
        })()}
      </div>

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={3} />
      ) : booking ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {/* Guest Card */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <User className="size-4 text-brand" />
              <h4 className="font-semibold text-navy text-sm">Guest Information</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Guest Name</span>
                <p className="font-semibold mt-0.5">{booking.guest}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Contact Number</span>
                <p className="font-semibold mt-0.5">{booking.phone || "—"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Stay Status</span>
                <div className="mt-1">
                  <Tag tone={
                    booking.status === "Confirmed" ? "brand" :
                    booking.status === "Checked-in" ? "success" :
                    booking.status === "Checked-out" ? "neutral" : "error"
                  }>
                    {booking.status}
                  </Tag>
                </div>
              </div>
            </div>
          </div>

          {/* Stay Config */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <Home className="size-4 text-brand" />
              <h4 className="font-semibold text-navy text-sm">Room Allocation</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Room</span>
                <p className="font-semibold mt-0.5">
                  {extractRoomNumber(booking) ? `Room ${extractRoomNumber(booking)}` : (booking.roomNumber ? `Room ${booking.roomNumber}` : (booking.room || "Not Assigned"))}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Room Category</span>
                <p className="font-semibold mt-0.5">
                  {booking.roomType || (booking.room && booking.room.includes('·') ? booking.room.split('·')[1]?.trim() : "Standard Room")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Check-In</span>
                  <p className="font-semibold mt-0.5">{booking.checkIn}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Check-Out</span>
                  <p className="font-semibold mt-0.5">{booking.checkOut}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Occupancy (Nights/Guests)</span>
                <p className="font-semibold mt-0.5">{booking.nights || 1} Night(s) / {booking.pax || "2 Adults"}</p>
              </div>
            </div>
          </div>

          {/* Payment Ledger */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <CreditCard className="size-4 text-brand" />
              <h4 className="font-semibold text-navy text-sm">Financial Ledger</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              {Number(booking.discountAmount || 0) > 0 && (
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-emerald-800 font-medium">Original Tariff:</span>
                    <span className="line-through text-muted-foreground">₹{Number(booking.originalAmount || (Number(booking.totalAmount || booking.amount) + Number(booking.discountAmount))).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-emerald-700">
                    <span>Coupon Promo ({booking.couponCode || 'APPLIED'}):</span>
                    <span>-₹{Number(booking.discountAmount).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Amount</span>
                  <p className="font-bold mt-0.5 text-sm text-navy">₹{(Number(booking.totalAmount ?? booking.amount ?? 0)).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Outstanding</span>
                  <p className={`font-bold mt-0.5 text-sm ${booking.balance === 0 ? "text-success" : "text-destructive"}`}>
                    ₹{(booking.balance || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Booking Source</span>
                <p className="font-semibold mt-0.5">{booking.source || "Direct"}</p>
              </div>
              {booking.notes && (
                <div className="pt-2 border-t border-muted/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Operational Notes</span>
                  <p className="italic text-muted-foreground mt-0.5">{booking.notes}</p>
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
        userRole="manager"
      />
    </div>
  );
}

export const Route = createFileRoute("/manager/reservations/view/$id")({
  component: ManagerViewReservation
});
