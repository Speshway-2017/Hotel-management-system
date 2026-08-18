import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Calendar, User, Home, CreditCard, ChevronLeft } from "lucide-react";

function ViewReservation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const loadBookingDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getReservations();
        if (res.success) {
          const matched = res.data.find(b => b._id === id || b.id === id);
          if (matched) {
            setBooking(matched);
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

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title={booking ? `Reservation: ${booking.id || booking._id}` : "Reservation Details"}
        subtitle="Operational stay records, occupancy configurations, and tariff ledger audit."
        actions={
          <Button
            onClick={() => navigate({ to: "/admin/reservations" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 h-9 font-bold text-xs cursor-pointer flex items-center gap-1.5"
          >
            <ChevronLeft className="size-4" /> Back to Bookings
          </Button>
        }
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={3} />
      ) : booking ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {/* Guest Card */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <User className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Guest Information</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Guest Name</span>
                <p className="font-semibold mt-0.5">{booking.guest}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Stay Status</span>
                <div className="mt-1">
                  <Tag tone={booking.status === "Confirmed" ? "success" : booking.status === "Pending" ? "warning" : "neutral"}>
                    {booking.status}
                  </Tag>
                </div>
              </div>
            </div>
          </div>

          {/* Stay Config */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <Home className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Room Allocation</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Room</span>
                <p className="font-semibold mt-0.5">{booking.room || "—"}</p>
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
            </div>
          </div>

          {/* Payment Ledger */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <CreditCard className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Financial Ledger</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Amount</span>
                  <p className="font-bold mt-0.5 text-sm text-purple">₹{(booking.amount || 0).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Outstanding</span>
                  <p className="font-bold mt-0.5 text-sm text-navy">₹{(booking.balance || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Source Channel</span>
                <p className="font-semibold mt-0.5">{booking.source || "Direct Booking"}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/admin/reservations/view/$id")({
  component: ViewReservation
});
