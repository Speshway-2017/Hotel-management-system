import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Calendar, User, Home, CreditCard, ChevronLeft, ShieldAlert } from "lucide-react";

function ManagerViewReservation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "manager") {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    const loadBookingDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getReservations();
        if (res.success) {
          const matched = res.data.find(b => b._id === id || b.id === id);
          if (matched) {
            // Verify property scoping
            if (matched.propertyId !== user.propertyId && matched.property !== user.propertyId) {
              setIsAuthorized(false);
            } else {
              setBooking(matched);
            }
          } else {
            setError("Reservation record not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load reservation details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadBookingDetail();
  }, [id]);

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view reservations for this property. Access is strictly scoped to your assigned hotel branch.
        </Notice>
        <Link to="/manager/reservations" className="inline-flex items-center gap-1.5 text-xs text-navy font-bold hover:underline">
          <ChevronLeft className="size-3.5" /> Back to Reservations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/manager/reservations" className="inline-flex items-center justify-center size-8 rounded-full border border-muted bg-white hover:bg-muted/15 text-navy transition-all cursor-pointer">
          <ChevronLeft className="size-4" />
        </Link>
        <PageHeader
          title={booking ? `Reservation: ${booking.id || booking._id}` : "Reservation Details"}
          subtitle="Guest stay overview, room parameters, and tariff details."
        />
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
                <p className="font-semibold mt-0.5">{booking.room ? `Room ${booking.room}` : "Not Assigned"}</p>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Amount</span>
                  <p className="font-bold mt-0.5 text-sm text-navy">₹{(booking.amount || 0).toLocaleString("en-IN")}</p>
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
    </div>
  );
}

export const Route = createFileRoute("/manager/reservations/view/$id")({
  component: ManagerViewReservation
});
