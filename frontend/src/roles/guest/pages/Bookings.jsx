import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Calendar, Bed, Hotel, MapPin, ArrowRight, ShieldCheck, 
  RefreshCw, AlertCircle, Clock, CheckCircle2, ChevronRight, 
  ArrowLeft, CreditCard, User, FileText, Download, Phone, Eye
} from "lucide-react";
import { inr } from "@/data/hs-data";
import { Button } from "@/components/ui/button";

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

  const [activeTab, setActiveTab] = useState(initialTab); // 'all', 'upcoming', 'check-ins', 'check-outs'
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:5000/api/v1/guest/bookings', { headers });
      const result = await res.json();
      
      let list = [];
      if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
        list = result.data;
      } else {
        const stored = localStorage.getItem('latest_booking');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            list = [parsed];
          } catch (e) {}
        }
      }
      setBookings(list);

      if (initialSelectedId) {
        const matched = list.find(b => (b.id === initialSelectedId || b.bookingId === initialSelectedId));
        if (matched) setSelectedBooking(matched);
      }
    } catch (err) {
      console.error("Failed to load guest bookings:", err);
      const stored = localStorage.getItem('latest_booking');
      if (stored) {
        try {
          setBookings([JSON.parse(stored)]);
        } catch (e) {
          setError("Network or server connection error. Please try again.");
        }
      } else {
        setError("Failed to load bookings from backend.");
      }
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetchBookings();

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id') || params.get('view');
      if (!id) {
        setSelectedBooking(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
    return true; // 'all'
  });

  // Dedicated Detailed Page View when a booking is clicked
  if (selectedBooking) {
    const b = selectedBooking;
    return (
      <div className="space-y-6 text-left font-ui">
        
        {/* Detailed Booking Page Card (Admin/Manager Panel Style) */}
        <div className="bg-white rounded-2xl border border-navy/10 p-6 sm:p-8 shadow-soft space-y-6">
          
          {/* Header info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-navy/5 pb-6 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-2xl font-bold text-navy">{b.hotel || "Speshway Hotel & Suites"}</span>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  (b.status || '').toLowerCase() === 'confirmed' || (b.status || '').toLowerCase() === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : (b.status || '').toLowerCase() === 'checked-in'
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
              <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">✓ Payment Confirmed</span>
            </div>
          </div>

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
                <p className="text-navy/60 font-medium">Duration: 2 Nights</p>
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
                <p className="text-navy/60 font-medium">Guest Name: {b.guest || "Aarav Mehta"}</p>
              </div>
            </div>

            {/* Payment & Ref */}
            <div className="bg-cream/20 p-4 rounded-xl border border-navy/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50 flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-purple" /> Payment Ledger
              </span>
              <div className="text-xs font-semibold text-navy space-y-1">
                <p>Payment Status: <strong className="text-emerald-600">Paid Online</strong></p>
                <p>Method: <strong>UPI / Credit Card</strong></p>
                <p className="text-navy/60 font-medium">Invoice GST: Included</p>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-navy/5 flex flex-wrap gap-3 justify-end">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-cream text-navy border border-navy/10 rounded-xl text-xs font-bold hover:bg-cream/80 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="size-3.5" /> Download Digital Folio
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
        
        {/* Top Header Controls with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-start border-b border-navy/5 pb-4">
          {/* Category Tabs (Admin/Manager style) */}
          <div className="flex rounded-xl border border-navy/10 bg-cream/30 p-1 gap-1 flex-wrap">
            {[
              { id: "all", label: "All Stays" },
              { id: "upcoming", label: "Upcoming" },
              { id: "check-ins", label: "Check-ins" },
              { id: "check-outs", label: "Check-outs" }
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
        </div>

        {/* Bookings Table / Cards Grid */}
        {filteredBookings.length === 0 ? (
          <div className="py-16 text-center space-y-4 border border-dashed border-navy/10 rounded-2xl bg-cream/10">
            <Hotel className="size-12 text-navy/20 mx-auto" />
            <div>
              <h3 className="font-display text-base font-bold text-navy">No Bookings Found in "{activeTab}"</h3>
              <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1">
                You don't have any reservations under this status. Explore our properties and book a room!
              </p>
            </div>
            <a
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple text-cream rounded-xl text-xs font-bold hover:bg-purple/90 transition-colors shadow-soft"
            >
              Explore Hotels & Rooms
            </a>
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
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted font-medium text-navy">
                {filteredBookings.map((b) => (
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
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid Online
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        (b.status || '').toLowerCase() === 'confirmed' || (b.status || '').toLowerCase() === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (b.status || '').toLowerCase() === 'checked-in'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {b.status || 'Confirmed'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectBooking(b);
                        }}
                        className="size-8 rounded-lg bg-navy/5 hover:bg-purple hover:text-cream text-navy inline-flex items-center justify-center transition-colors cursor-pointer border-none"
                        title="View Booking Details"
                      >
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}