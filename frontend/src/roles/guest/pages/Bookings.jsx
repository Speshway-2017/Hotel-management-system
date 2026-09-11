import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Calendar, Bed, Hotel, MapPin, ArrowRight, ShieldCheck, 
  RefreshCw, AlertCircle, Clock, CheckCircle2, ChevronRight, 
  ArrowLeft, CreditCard, User, FileText, Download, Phone, Eye, Sparkles,
  Star, MessageSquare, RotateCcw, XCircle, AlertTriangle, Receipt
} from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/data/hs-data";
import { calculateStayNights } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { ActionGroup, ActionIcon, ViewActionIcon } from "@/components/hs/kit";
import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { authService } from "@/services/auth";

export const Route = createFileRoute("/guest/bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — Hour Stay" },
      { name: "description", content: "Upcoming, completed and cancelled stays." }
    ]
  }),
  component: GuestBookingsPage
});

function GuestBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Read initial tab parameter from URL search string
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || urlParams.get('status') || 'all';
  const initialSelectedId = urlParams.get('id') || null;

  const [activeTab, setActiveTab] = useState(initialTab); // 'all', 'upcoming', 'check-ins', 'check-outs', 'cancelled'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [feedbackBookingIds, setFeedbackBookingIds] = useState(new Set());

  // Cancellation Modal States
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("Change of travel plans");
  const [cancellationRemarks, setCancellationRemarks] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const [res, fbRes] = await Promise.all([
        fetch(`${apiBase}/v1/guest/bookings`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${apiBase}/v1/guest/feedback`, { headers }).then(r => r.json()).catch(() => ({}))
      ]);

      const fbSet = new Set();
      if (fbRes && fbRes.success && Array.isArray(fbRes.data)) {
        fbRes.data.forEach(f => {
          if (f.bookingId) fbSet.add(String(f.bookingId));
        });
      }
      setFeedbackBookingIds(fbSet);

      let list = [];
      if (res && res.success && Array.isArray(res.data)) {
        list = res.data.map(b => {
          const bId = b.bookingId || b.id || b._id;
          const hasFb = b.hasFeedback || fbSet.has(String(bId)) || fbSet.has(String(b.id)) || fbSet.has(String(b._id)) || fbSet.has(String(b.bookingId));
          return {
            ...b,
            hasFeedback: Boolean(hasFb)
          };
        });
      }
      setBookings(list);

      if (initialSelectedId) {
        const matched = list.find(b => (b.id === initialSelectedId || b.bookingId === initialSelectedId));
        if (matched) setSelectedBooking(matched);
      }
    } catch (err) {
      console.error("Failed to load guest bookings:", err);
      setError("Failed to load bookings from backend.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleBookNow = () => {
    const user = authService.getCurrentUser();
    const storedPropId = localStorage.getItem('selected_property_id');
    const userPropId = user?.propertyId;
    const bookingPropId = bookings.find(b => b.propertyId)?.propertyId;
    const targetPropertyId = storedPropId || userPropId || bookingPropId || 'HS-JAI';
    window.location.href = `/hotels/${targetPropertyId}`;
  };

  const handleSelectBooking = (b) => {
    if (b) {
      const newUrl = window.location.pathname + '?id=' + (b.bookingId || b.id);
      window.history.pushState({}, '', newUrl);
    } else {
      window.history.pushState({}, '', window.location.pathname);
    }
    setSelectedBooking(b);
  };

  const handleExecuteCancellation = async (e) => {
    e?.preventDefault();
    if (!cancelModalBooking) return;

    setCancelling(true);
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const targetId = cancelModalBooking.bookingId || cancelModalBooking.id || cancelModalBooking._id;

      const res = await fetch(`${apiBase}/v1/guest/bookings/${targetId}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reason: cancellationReason,
          remarks: cancellationRemarks
        })
      });
      const data = await res.json();

      if (data && data.success) {
        toast.success(data.message || "Booking cancelled successfully! You can now request your refund.");
        emitRealtimeEvent('booking_updated', { action: 'cancelled', bookingId: targetId });
        emitRealtimeEvent('dashboard_sync', { action: 'booking_cancelled' });
        
        const cancelledTarget = cancelModalBooking;
        setCancelModalBooking(null);
        await fetchBookings(true);

        // If currently in detail view, update or redirect
        if (selectedBooking && (selectedBooking.bookingId === targetId || selectedBooking.id === targetId || selectedBooking._id === targetId)) {
          setSelectedBooking(prev => ({
            ...prev,
            status: 'Cancelled',
            cancellationReason,
            cancellationRemarks,
            cancellationFee: data.data?.cancellationFee ?? 0,
            refundableAmount: data.data?.refundableAmount ?? Number(cancelledTarget.amount || 0)
          }));
        }
      } else {
        toast.error(data?.message || "Failed to cancel booking.");
      }
    } catch (err) {
      console.error("Cancellation error:", err);
      toast.error(err.message || "An error occurred while cancelling booking.");
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    fetchBookings(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      console.log('⚡ Socket event received. Refreshing bookings ledger...');
      fetchBookings(true);
    });

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id') || params.get('view');
      if (!id) {
        setSelectedBooking(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft font-ui">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Fetching live guest reservations from MongoDB...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-rose-200 text-center space-y-4 shadow-soft font-ui">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h3 className="font-display text-lg font-bold text-navy">Unable to Load Reservations</h3>
        <p className="text-xs text-rose-600 font-semibold max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchBookings}
          className="px-5 py-2 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none"
        >
          <RefreshCw className="size-3.5" /> Try Again
        </button>
      </div>
    );
  }

  // Filter bookings according to active tab
  const filteredBookings = bookings.filter((b) => {
    const statusLower = (b.status || '').toLowerCase();
    if (activeTab === 'upcoming') {
      return statusLower === 'confirmed' || statusLower === 'paid' || statusLower === 'pending';
    }
    if (activeTab === 'check-ins' || activeTab === 'check-in') {
      return statusLower === 'checked-in' || statusLower === 'in-house';
    }
    if (activeTab === 'check-outs' || activeTab === 'check-out') {
      return statusLower === 'checked-out' || statusLower === 'completed';
    }
    if (activeTab === 'cancelled') {
      return statusLower === 'cancelled';
    }
    return true; // 'all'
  });

  // Dedicated Detailed Page View when a booking is clicked
  if (selectedBooking) {
    const b = selectedBooking;
    const statusLower = (b.status || '').toLowerCase();
    const isCheckedOut = statusLower === 'checked-out' || statusLower === 'checked out' || statusLower === 'completed';
    const isCancelled = statusLower === 'cancelled';
    const isUpcoming = (statusLower === 'confirmed' || statusLower === 'paid' || statusLower === 'pending') && !isCheckedOut && !isCancelled;
    const refundSubmitted = Boolean(b.refundRequest || b.refundStatus);
    const refundStatusText = b.refundStatus || b.refundRequest?.status || 'Pending';

    return (
      <div className="space-y-4 text-left font-ui">
        {/* Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <button
            onClick={() => handleSelectBooking(null)}
            className="transition-colors hover:text-foreground cursor-pointer font-medium"
          >
            My Bookings
          </button>
          <span aria-hidden>/</span>
          <span className="text-foreground font-semibold">Booking #{b.id || b.bookingId || b._id}</span>
        </nav>
        
        {/* Detailed Booking Page Card */}
        <div className="bg-white rounded-2xl border border-navy/10 p-6 sm:p-8 shadow-soft space-y-6">
          
          {/* Header info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-navy/5 pb-6 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-2xl font-bold text-navy">{b.hotel || "Speshway Hotel & Suites"}</span>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  isCancelled
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : isCheckedOut
                    ? 'bg-purple/10 text-purple border border-purple/20'
                    : statusLower === 'confirmed' || statusLower === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : statusLower === 'checked-in'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {b.status || 'Confirmed'}
                </span>
              </div>
              <p className="text-xs text-navy/60 flex items-center gap-1.5 font-medium">
                <MapPin className="size-3.5 text-purple" /> {b.city || "Hyderabad"} · {b.room || "Standard Suite"}
              </p>
            </div>

            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-navy/50 tracking-wider block">Total Amount</span>
              <span className="font-display text-2xl font-bold text-navy">{inr(b.amount || 0)}</span>
              <span className={`text-[11px] font-semibold block mt-0.5 ${isCancelled ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isCancelled ? '• Booking Cancelled' : '✓ Payment Confirmed'}
              </span>
            </div>
          </div>

          {/* Refund Notice / Action Banner for Cancelled Bookings */}
          {isCancelled && (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              refundSubmitted
                ? 'bg-purple/5 border-purple/20'
                : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                <RotateCcw className={`size-5 mt-0.5 shrink-0 ${refundSubmitted ? 'text-purple' : 'text-amber-600'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-navy">Stay Refund Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      refundStatusText === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      refundStatusText === 'Processing' ? 'bg-blue-100 text-blue-800' :
                      refundStatusText === 'Refunded' ? 'bg-purple/20 text-purple' :
                      refundStatusText === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {refundStatusText}
                    </span>
                  </div>
                  <p className="text-xs text-navy/60 font-medium mt-0.5">
                    {refundSubmitted
                      ? `Your refund request is currently ${refundStatusText.toLowerCase()}. Click below to view live timeline and details.`
                      : 'This upcoming reservation was cancelled before check-in. You can submit your refund request directly to hotel management.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/guest/refund?bookingId=${b.bookingId || b.id || b._id}`;
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer inline-flex items-center justify-center shrink-0 border-none hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] ${
                  refundSubmitted
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <span className="text-white font-bold">{refundSubmitted ? `Refund: ${refundStatusText}` : 'Request Stay Refund'}</span>
              </button>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Stay Dates */}
            <div className="bg-cream/20 p-4 rounded-xl border border-navy/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-purple" /> Stay Dates & Schedule
              </span>
              <div className="text-xs font-semibold text-navy space-y-1">
                <p>Check-in: <strong className="text-purple">{b.checkIn || b.dates?.split('→')[0]}</strong> (12:00 PM)</p>
                <p>Check-out: <strong className="text-purple">{b.checkOut || b.dates?.split('→')[1]}</strong> (11:00 AM)</p>
                <p className="text-navy/60 font-medium">
                  {(() => {
                    const stayN = Number(b.nights) || calculateStayNights(b.checkIn, b.checkOut);
                    return `Duration: ${stayN} ${stayN === 1 ? 'Night' : 'Nights'}`;
                  })()}
                </p>
              </div>
            </div>

            {/* Room & Guest Info */}
            <div className="bg-cream/20 p-4 rounded-xl border border-navy/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50 flex items-center gap-1.5">
                <Bed className="size-3.5 text-purple" /> Room & Guest Details
              </span>
              <div className="text-xs font-semibold text-navy space-y-1">
                <p>Room Type: <strong>{b.room || "Standard Suite"}</strong></p>
                <p>Guests: <strong>{b.guests || "2 Guests (Adults)"}</strong></p>
                <p className="text-navy/60 font-medium">Guest Name: {b.guest || "Guest"}</p>
              </div>
            </div>

            {/* Payment & Ref */}
            <div className="bg-cream/20 p-4 rounded-xl border border-navy/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50 flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-purple" /> Payment Ledger
              </span>
              <div className="text-xs font-semibold text-navy space-y-1">
                <p>Booking Ref: <strong className="font-mono text-purple">{b.bookingId || b.id}</strong></p>
                <p>Payment Status: <strong className={
                  (b.paymentStatus === 'Refunded' || refundStatusText === 'Refunded') ? 'text-purple' :
                  (b.paymentStatus === 'Processing' || refundStatusText === 'Processing') ? 'text-blue-600' :
                  (b.paymentStatus === 'Approved' || refundStatusText === 'Approved') ? 'text-emerald-600' :
                  isCancelled ? 'text-rose-600' : 'text-emerald-600'
                }>
                  {(b.paymentStatus === 'Refunded' || refundStatusText === 'Refunded') ? 'Refunded' :
                   (b.paymentStatus === 'Processing' || refundStatusText === 'Processing') ? 'Processing' :
                   (b.paymentStatus === 'Approved' || refundStatusText === 'Approved') ? 'Approved' :
                   isCancelled ? 'Refundable' : 'Paid Online'}
                </strong></p>
                <p className="text-navy/60 font-medium">Invoice GST: Included</p>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-navy/5 flex flex-wrap gap-3 justify-end items-center">
            
            {/* Cancel Booking button for upcoming stays before check-in */}
            {isUpcoming && (
              <Button
                onClick={() => setCancelModalBooking(b)}
                variant="danger"
                size="sm"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-soft border-none"
              >
                <XCircle className="size-3.5" /> Cancel Stay
              </Button>
            )}

            {/* Dedicated Refund Button for Cancelled upcoming stays */}
            {isCancelled && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/guest/refund?bookingId=${b.bookingId || b.id || b._id}`;
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center cursor-pointer shadow-soft border-none hover:scale-105"
              >
                <span className="text-white font-bold">{refundSubmitted ? `Refund (${refundStatusText})` : 'Request Stay Refund'}</span>
              </button>
            )}

            {/* Feedback button when guest status is Checked Out */}
            {isCheckedOut && (
              (b.hasFeedback || feedbackBookingIds.has(String(b.bookingId)) || feedbackBookingIds.has(String(b.id)) || feedbackBookingIds.has(String(b._id))) ? (
                <span className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Feedback Submitted
                </span>
              ) : (
                <Button
                  onClick={() => {
                    window.location.href = `/guest/feedback/add?bookingId=${b.bookingId || b.id || b._id}`;
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-soft border-none"
                >
                  <Star className="size-3.5 fill-current text-white" /> Add Feedback
                </Button>
              )
            )}

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-cream text-navy border border-navy/10 rounded-xl text-xs font-bold hover:bg-cream/80 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="size-3.5" /> Download Digital Folio
            </button>
            <Button
              onClick={handleBookNow}
              variant="hero"
              size="sm"
              className="px-4 py-2 text-xs font-bold gap-1.5 cursor-pointer shadow-soft"
            >
              <Calendar className="size-3.5" /> Book Another Stay
            </Button>
          </div>

        </div>

        {/* Cancellation Modal Render */}
        {renderCancelModal()}
      </div>
    );
  }

  function renderCancelModal() {
    if (!cancelModalBooking) return null;
    const b = cancelModalBooking;
    const totalAmount = Number(b.amount || b.totalAmount || 0);

    return (
      <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-navy/10 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 text-left font-ui">
          
          <div className="flex items-start justify-between border-b border-navy/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-navy">Cancel Stay Reservation</h3>
                <p className="text-xs text-navy/60 font-medium">Ref #{b.bookingId || b.id} · {b.room}</p>
              </div>
            </div>
            <button
              onClick={() => setCancelModalBooking(null)}
              className="size-7 rounded-lg hover:bg-cream text-navy/60 flex items-center justify-center cursor-pointer border-none bg-transparent"
            >
              <XCircle className="size-4" />
            </button>
          </div>

          <div className="bg-cream/30 p-4 rounded-xl border border-navy/5 text-xs space-y-1.5">
            <div className="flex justify-between font-semibold text-navy">
              <span>Hotel Property:</span>
              <span>{b.hotel || "Speshway Hotel"}</span>
            </div>
            <div className="flex justify-between text-navy/70">
              <span>Stay Schedule:</span>
              <span>{b.dates || `${b.checkIn} → ${b.checkOut}`}</span>
            </div>
            <div className="flex justify-between font-bold text-navy pt-1 border-t border-navy/5">
              <span>Total Booking Amount:</span>
              <span className="text-emerald-700">{inr(totalAmount)}</span>
            </div>
          </div>

          {/* Cancellation Policy Alert */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1 text-amber-800">
              <ShieldCheck className="size-3.5" /> Cancellation Policy
            </span>
            <p className="text-[11px] leading-relaxed font-medium">
              Free cancellation up to 24 hours prior to check-in (12:00 PM). Upon cancellation, you can immediately request your refund to your UPI ID or Bank Account.
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Reason for Cancellation</label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 border border-navy/20 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple cursor-pointer bg-white"
              >
                <option value="Change of travel plans">Change of travel plans / personal emergency</option>
                <option value="Flight / train schedule change">Flight / train schedule change</option>
                <option value="Booking date mistake">Booking date or room selection mistake</option>
                <option value="Found alternative accommodation">Found alternative accommodation</option>
                <option value="Other reason">Other operational reason</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Additional Remarks (Optional)</label>
              <textarea
                rows={2}
                placeholder="Provide any specific note for hotel front desk..."
                value={cancellationRemarks}
                onChange={(e) => setCancellationRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-navy/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-navy/5">
            <button
              type="button"
              onClick={() => setCancelModalBooking(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-navy bg-cream/60 hover:bg-cream border border-navy/10 cursor-pointer"
            >
              Keep Booking
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={handleExecuteCancellation}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-soft cursor-pointer inline-flex items-center gap-1.5 border-none disabled:opacity-50"
            >
              {cancelling ? (
                <>
                  <div className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <XCircle className="size-3.5" />
                  <span>Confirm Cancellation</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Standard List View
  return (
    <div className="space-y-6 text-left font-ui">
      
      {/* Main Panel matching Admin/Manager style */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-6">
        
        {/* Top Header Controls with Tabs and Book Now Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-navy/5 pb-4 gap-3">
          {/* Category Tabs */}
          <div className="flex rounded-xl border border-navy/10 bg-cream/30 p-1 gap-1 flex-wrap">
            {[
              { id: "all", label: "All Stays" },
              { id: "upcoming", label: "Upcoming" },
              { id: "check-ins", label: "Check-ins" },
              { id: "check-outs", label: "Check-outs" },
              { id: "cancelled", label: "Cancelled" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                  activeTab === tab.id
                    ? "bg-navy text-cream shadow-sm"
                    : "text-navy/70 hover:text-navy hover:bg-cream/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            onClick={handleBookNow}
            variant="hero"
            size="sm"
            className="h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer shadow-soft shrink-0"
          >
            <Calendar className="size-3.5" /> Book Now
          </Button>
        </div>

        {/* Bookings Table / Cards Grid */}
        {filteredBookings.length === 0 ? (
          <div className="py-16 text-center space-y-4 border border-dashed border-navy/10 rounded-2xl bg-cream/10">
            <Hotel className="size-12 text-navy/20 mx-auto" />
            <div>
              <h3 className="font-display text-base font-bold text-navy">
                {activeTab === 'all' ? 'No Active Bookings' : `No Bookings in "${activeTab}"`}
              </h3>
              <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1">
                You don't have any reservations in this category. Book your room stay now at direct hotel rates!
              </p>
            </div>
            <Button
              onClick={handleBookNow}
              variant="hero"
              size="touch"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold cursor-pointer shadow-soft"
            >
              <Calendar className="size-4" /> Book Now
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-muted bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] uppercase font-bold text-muted-foreground">
                  <th className="py-3 px-4 whitespace-nowrap">Booking Ref</th>
                  <th className="py-3 px-4 whitespace-nowrap">Hotel Property</th>
                  <th className="py-3 px-4 whitespace-nowrap">Room Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Check-in → Check-out</th>
                  <th className="py-3 px-4 whitespace-nowrap">Guests</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Tariff</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Payment</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted font-medium text-navy">
                {filteredBookings.map((b) => {
                  const statusLower = (b.status || '').toLowerCase();
                  const isCheckedOut = statusLower === 'checked-out' || statusLower === 'checked out' || statusLower === 'completed';
                  const isCancelled = statusLower === 'cancelled';
                  const isUpcoming = (statusLower === 'confirmed' || statusLower === 'paid' || statusLower === 'pending') && !isCheckedOut && !isCancelled;
                  const refundSubmitted = Boolean(b.refundRequest || b.refundStatus);
                  const refundStatusText = b.refundStatus || b.refundRequest?.status || 'Pending';

                  return (
                    <tr 
                      key={b.id || b.bookingId} 
                      onClick={() => handleSelectBooking(b)}
                      className="hover:bg-purple/5 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-purple whitespace-nowrap">
                        {b.bookingId || b.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-navy block">{b.hotel || "Speshway Hotel & Suites"}</span>
                        <span className="text-[11px] text-muted-foreground">{b.city || "Hyderabad"}</span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {b.room || "Standard Suite"}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-navy whitespace-nowrap">
                        {b.dates || `${b.checkIn} → ${b.checkOut}`}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {b.guests || "2 Guests"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-navy whitespace-nowrap">
                        {inr(b.amount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          (b.paymentStatus === 'Refunded' || refundStatusText === 'Refunded')
                            ? 'bg-purple/10 text-purple border-purple/20'
                            : (b.paymentStatus === 'Processing' || refundStatusText === 'Processing')
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : (b.paymentStatus === 'Approved' || refundStatusText === 'Approved')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isCancelled
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {(b.paymentStatus === 'Refunded' || refundStatusText === 'Refunded')
                            ? 'Refunded'
                            : (b.paymentStatus === 'Processing' || refundStatusText === 'Processing')
                            ? 'Processing'
                            : (b.paymentStatus === 'Approved' || refundStatusText === 'Approved')
                            ? 'Approved'
                            : isCancelled
                            ? 'Refundable'
                            : 'Paid Online'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isCheckedOut
                            ? 'bg-purple/10 text-purple border border-purple/20'
                            : statusLower === 'confirmed' || statusLower === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : statusLower === 'checked-in'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {b.status || 'Confirmed'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                        <ActionGroup align="right">
                          {/* Cancellation Action for Upcoming stays before check-in */}
                          {isUpcoming && (
                            <ActionIcon
                              icon={XCircle}
                              variant="danger"
                              title="Cancel Stay Reservation"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancelModalBooking(b);
                              }}
                            />
                          )}

                          {/* Refund Status tracking badge appears only after refund request is submitted */}
                          {isCancelled && refundSubmitted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/guest/refund?bookingId=${b.bookingId || b.id || b._id}`;
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center justify-center shadow-2xs transition-all cursor-pointer border-none text-white hover:opacity-90 hover:scale-105 active:scale-95 shrink-0 ${
                                refundStatusText === 'Approved' ? 'bg-emerald-600' :
                                refundStatusText === 'Processing' ? 'bg-blue-600' :
                                refundStatusText === 'Refunded' ? 'bg-purple' :
                                refundStatusText === 'Rejected' ? 'bg-rose-600' :
                                'bg-amber-600'
                              }`}
                              title="View Live Refund Request Status"
                            >
                              <span className="text-white font-bold">{refundStatusText}</span>
                            </button>
                          )}

                          {/* Feedback icon for checked out bookings */}
                          {isCheckedOut && (
                            (b.hasFeedback || feedbackBookingIds.has(String(b.bookingId)) || feedbackBookingIds.has(String(b.id)) || feedbackBookingIds.has(String(b._id))) ? (
                              <ActionIcon
                                icon={CheckCircle2}
                                variant="success"
                                title="Feedback already submitted"
                                disabled
                              />
                            ) : (
                              <ActionIcon
                                icon={Star}
                                variant="warning"
                                title="Add Stay Feedback"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/guest/feedback/add?bookingId=${b.bookingId || b.id || b._id}`;
                                }}
                              />
                            )
                          )}

                          <ViewActionIcon
                            title="View Booking Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectBooking(b);
                            }}
                          />
                        </ActionGroup>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Render Modal */}
      {renderCancelModal()}

    </div>
  );
}