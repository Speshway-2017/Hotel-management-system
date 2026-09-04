import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, Upload, FileText, CheckCircle2, AlertOctagon, HelpCircle, ArrowLeft, Receipt, CreditCard
} from "lucide-react";

export const Route = createFileRoute("/reception/reservations/$id")({
  head: () => ({
    meta: [
      { title: "Reservation Details — Hour Stay" },
      { name: "description", content: "Guest reservation metadata details and audit timeline logs." }
    ]
  }),
  component: ReceptionReservationDetailsPage
});

import { toast } from "sonner";
import { receptionistService } from "@/services/receptionist";
import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { ExtendStayModal, ExtendStayButton } from "@/components/common/ExtendStayModal";

function ReceptionReservationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  const loadReservationDetails = () => {
    receptionistService.getReservations()
      .then(res => {
        if (res.success && res.data) {
          const found = res.data.find(b => 
            String(b._id) === String(id) || 
            String(b.id) === String(id) || 
            String(b.bookingId) === String(id)
          );
          if (found) {
            found.guests = found.pax || '2 Adults';
            found.amountPaid = Number(found.amount || 0) - Number(found.balance || 0);
            found.notes = found.specialRequests || 'No special requests listed.';
            setBooking(found);
          } else {
            toast.error("Reservation record not found.");
          }
        }
      })
      .catch(err => console.error("Failed to fetch reservation details:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReservationDetails();
    const unsubscribe = subscribeRealtimeSync(() => {
      loadReservationDetails();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  const statusMeta = {
    Confirmed: { tone: "success", label: "Confirmed" },
    Pending: { tone: "warning", label: "Pending" },
    "Checked-in": { tone: "brand", label: "Checked In" },
    "Checked-out": { tone: "neutral", label: "Checked Out" },
    Cancelled: { tone: "error", label: "Cancelled" },
    "No Show": { tone: "neutral", label: "No Show" }
  };

  const handleCancelBooking = () => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this reservation? This cannot be undone.");
    if (!confirmCancel) return;
    
    receptionistService.updateReservationStatus(booking._id || booking.id, 'Cancelled')
      .then(res => {
        if (res.success) {
          toast.success("Reservation cancelled successfully!");
          loadReservationDetails();
        } else {
          toast.error(res.message || "Failed to cancel reservation.");
        }
      })
      .catch(err => {
        console.error("Failed to cancel reservation:", err);
        toast.error(err.message || "Failed to cancel reservation.");
      });
  };

  if (loading || !booking) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading reservation details...
      </div>
    );
  }

  const sM = statusMeta[booking.status] || statusMeta.Pending;

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Dynamic navbar header override */}
      <PageHeader />

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left column info panel */}
        <div className="md:col-span-2 space-y-6">
          
          <Panel title="Reservation Dossier Information" description="Review stay dates, guest configurations and custom notes.">
            <div className="p-6 space-y-5 text-xs font-semibold text-navy">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Guest Profile Name</p>
                  <p className="font-semibold text-sm text-navy">{booking.guest}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Contact Mobile</p>
                  <p className="font-semibold text-sm text-navy">{booking.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Email Address</p>
                  <p className="font-semibold text-sm text-navy">{booking.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Occupancy Pax</p>
                  <p className="font-semibold text-sm text-navy">{booking.guests}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Stay Dates</p>
                  <p className="font-semibold text-sm text-navy">{booking.checkIn} - {booking.checkOut} ({booking.nights} Nights)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Booking Source Channel</p>
                  <p className="font-semibold text-sm text-navy">{booking.source}</p>
                </div>
              </div>

              <div className="bg-[#fafafa]/50 border border-muted p-4.5 rounded-xl space-y-1.5">
                <p className="text-muted-foreground uppercase text-[9px] font-bold">Guest Special Preferences & Notes</p>
                <p className="text-xs text-navy font-medium italic">{booking.notes || "No special requests listed."}</p>
              </div>

              {/* Action logs */}
              {(booking.status === "Confirmed" || booking.status === "Pending" || booking.status === "Pre-checked") && (
                <div className="flex gap-2 border-t border-muted/50 pt-5 justify-end">
                  <Button 
                    onClick={handleCancelBooking}
                    variant="ghost"
                    className="bg-rose-50 border border-rose-200 text-rose-700 h-9 px-5 text-xs rounded-full font-bold cursor-pointer"
                  >
                    Cancel Booking
                  </Button>
                  <Button 
                    asChild
                    className="bg-emerald-600 hover:bg-emerald-700 !text-white h-9 px-6 text-xs rounded-full font-bold cursor-pointer"
                  >
                    <Link to={`/reception/check-in/${booking._id || booking.id || booking.bookingId}`}>Check In Guest</Link>
                  </Button>
                </div>
              )}

              {(booking.status === "Checked In" || booking.status === "Checked-in" || booking.status === "Staying" || booking.status === "Staying-In") && (
                <div className="flex gap-2 border-t border-muted/50 pt-5 justify-end">
                  <ExtendStayButton 
                    variant="header"
                    label="Extend Stay"
                    booking={booking}
                    onClick={() => navigate(`/reception/reservations/extend/${booking._id || booking.id || booking.bookingId || id}`)}
                  />
                  <Button 
                    asChild
                    className="bg-navy hover:bg-navy-deep text-white h-9 px-6 text-xs rounded-xl font-bold cursor-pointer"
                  >
                    <Link to={`/reception/check-out/${booking._id || booking.id || booking.bookingId}`}>Check Out Guest</Link>
                  </Button>
                </div>
              )}

            </div>
          </Panel>

        </div>

        {/* Right column sidebar */}
        <div className="space-y-6">
          <Panel title="Status & Folio Details" description="Summary cards.">
            <div className="p-4 space-y-4 text-xs font-semibold text-navy">
              <div className="space-y-3 border-b border-muted pb-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Booking Status:</span>
                  <Tag tone={sM.tone}>{sM.label}</Tag>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <Tag tone={booking.paymentStatus === "Paid" ? "success" : "warning"}>{booking.paymentStatus}</Tag>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room Assignment:</span>
                  <span className="font-bold text-indigo">Room #{booking.room}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span className="text-emerald-600">₹{booking.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding Dues:</span>
                  <span className={booking.balance > 0 ? "text-rose-600 animate-pulse font-bold" : ""}>
                    ₹{booking.balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-muted/50 pt-2 text-sm font-black text-navy-deep">
                  <span>Grand Total:</span>
                  <span>₹{(booking.amountPaid + booking.balance).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

      </div>

      {/* Extend Stay Modal */}
      <ExtendStayModal
        booking={booking}
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        onSuccess={() => loadReservationDetails()}
        userRole="receptionist"
      />

    </div>
  );
}
