import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Calendar, Bed, Sparkles, Hotel, MapPin, 
  ArrowRight, ShieldCheck, RefreshCw, AlertCircle, Clock, CheckCircle2, Receipt,
  MessageSquareHeart, Star, MessageSquare
} from "lucide-react";
import { inr } from "@/data/hs-data";
import { subscribeRealtimeSync } from "@/services/socket";
import { apiClient } from "@/services/apiClient";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { ActionGroup, ViewActionIcon, FeedbackActionIcon } from "@/components/hs/kit";

export const Route = createFileRoute("/guest/")({
  head: () => ({
    meta: [
      { title: "Guest Dashboard — Hour Stay" },
      { name: "description", content: "Your stays, reservations and account overview with Hour Stay." }
    ]
  }),
  component: GuestDashboardPage
});

// Premium stat card component (Manager/Admin UI Style)
function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="h-8 flex items-start">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          </div>
          <h3 className="mt-1.5 font-sans text-lg font-bold text-slate-800 leading-none tracking-tight tabular-nums truncate">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-3">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] h-4">
        {hint && <span className="text-[10px] font-semibold text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

function GuestDashboardPage() {
  const [data, setData] = useState(null);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [feedbackBookingIds, setFeedbackBookingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleBookNow = () => {
    const user = authService.getCurrentUser();
    const storedPropId = localStorage.getItem('selected_property_id');
    const userPropId = user?.propertyId;
    const bookingPropId = data?.recentBookings?.find(b => b.propertyId)?.propertyId;
    const targetPropertyId = storedPropId || userPropId || bookingPropId || 'HS-JAI';
    window.location.href = `/hotels/${targetPropertyId}`;
  };

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const [res, fbRes] = await Promise.all([
        fetch(`${apiBase}/v1/guest/dashboard`, { headers }).then(r => r.json()).catch(() => ({})),
        apiClient.get('/v1/guest/feedback').catch(() => apiClient.get('/guest/feedback').catch(() => ({})))
      ]);

      if (res && res.success && res.data) {
        setData(res.data);
      } else {
        setData({
          stats: {
            upcomingBooking: null,
            currentStay: null,
            totalStays: 0,
            totalSpent: 0
          },
          recentBookings: []
        });
      }

      const fbSet = new Set();
      if (fbRes && fbRes.success && Array.isArray(fbRes.data)) {
        setFeedbackCount(fbRes.data.length);
        fbRes.data.forEach(f => {
          if (f.bookingId) fbSet.add(String(f.bookingId));
        });
      }
      setFeedbackBookingIds(fbSet);
    } catch (err) {
      console.error("Failed to load guest dashboard:", err);
      setError("Failed to load guest dashboard metrics from server.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);

    const handleFocus = () => fetchDashboardData(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      console.log('⚡ Realtime Socket event received on Guest Dashboard. Updating metrics...');
      fetchDashboardData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Fetching live guest reservations from MongoDB...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-rose-200 text-center space-y-4 shadow-soft">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h3 className="font-sans tracking-tight tabular-nums text-lg font-bold text-slate-800">Unable to Load Dashboard</h3>
        <p className="text-xs text-rose-600 font-semibold max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-5 py-2 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none"
        >
          <RefreshCw className="size-3.5" /> Try Again
        </button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentBookings = data?.recentBookings || [];
  const upcoming = stats.upcomingBooking;
  const currentStay = stats.currentStay;
  const activeBooking = currentStay || upcoming || stats.activeBooking || (recentBookings.length > 0 ? recentBookings[0] : null);

  return (
    <div className="space-y-6 text-left font-ui">
      
      {/* KPI Cards Grid (Manager/Admin UI Style) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PremiumStatCard
          label={upcoming ? "Upcoming Booking" : currentStay ? "Active Stay" : "Upcoming Booking"}
          value={upcoming ? upcoming.checkIn : currentStay ? currentStay.checkIn : "None"}
          hint={upcoming ? `${upcoming.hotel} (${upcoming.city})` : currentStay ? `${currentStay.hotel} · Checked-in` : "Plan next stay"}
          icon={Calendar}
          accentColor="#FF7A59"
        />
        <PremiumStatCard
          label="Current Stay"
          value={currentStay ? currentStay.room : "No Active Stay"}
          hint={currentStay ? `${currentStay.hotel} · Checked-in` : "Ready for next check-in"}
          icon={Bed}
          accentColor="#2E7D32"
        />
        <PremiumStatCard
          label="Total Stays"
          value={`${stats.totalStays || 0} ${stats.totalStays === 1 ? "Stay" : "Stays"}`}
          hint="Across Hour Stay properties"
          icon={Hotel}
          accentColor="#5B21B6"
        />
        <PremiumStatCard
          label="Total Spend"
          value={stats.totalSpent ? `₹${stats.totalSpent.toLocaleString('en-IN')}` : "₹0"}
          hint="Lifetime completed reservations"
          icon={Receipt}
          accentColor="#0D1B2A"
        />
        <PremiumStatCard
          label="Feedback"
          value={`${feedbackCount} Submitted`}
          hint="Stay ratings & reviews"
          icon={MessageSquareHeart}
          accentColor="#10B981"
        />
      </div>

      {/* Featured Active (Checked-in) or Upcoming Reservation Banner */}
      {activeBooking ? (
        <div className="bg-[#FFF7E6] border border-[#F5C06A]/40 rounded-2xl p-6 sm:p-8 text-[#0D1B2A] shadow-soft relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Sparkles className="size-48 text-[#5B21B6]" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                activeBooking.status === 'Checked-in'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : activeBooking.status === 'Confirmed' || activeBooking.status === 'Paid'
                  ? 'bg-[#F5C06A]/25 text-[#92400E] border-[#F5C06A]/50'
                  : 'bg-purple/15 text-purple border-purple/30'
              }`}>
                {activeBooking.status === 'Checked-in' ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-700" /> Active Checked-in Stay
                  </>
                ) : (
                  <>
                    <Clock className="size-3 text-[#B45309]" /> Confirmed Reservation
                  </>
                )}
              </span>
              <h3 className="font-sans tracking-tight tabular-nums text-2xl font-bold text-[#0D1B2A]">{activeBooking.hotel}</h3>
              <p className="text-xs text-[#0D1B2A]/75 flex items-center gap-2 font-medium">
                <MapPin className="size-3.5 text-[#5B21B6]" /> {activeBooking.city} · {activeBooking.room}
              </p>
              <div className="pt-2 text-xs font-semibold text-[#0D1B2A]/80 flex flex-wrap gap-4">
                <span>Check-in: <strong className="text-[#5B21B6] font-bold">{activeBooking.checkIn}</strong></span>
                <span>Check-out: <strong className="text-[#5B21B6] font-bold">{activeBooking.checkOut}</strong></span>
                <span>Ref: <strong className="text-[#5B21B6] font-mono font-bold">{activeBooking.bookingId}</strong></span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-start md:items-end gap-3">
              <div className="text-left md:text-right">
                <span className="text-[10px] text-[#0D1B2A]/60 uppercase tracking-wider block font-bold">Total Paid</span>
                <span className="font-display text-2xl font-bold text-[#B45309]">{inr(activeBooking.amount)}</span>
              </div>
              {(() => {
                const bId = activeBooking.bookingId || activeBooking.id || activeBooking._id;
                const bRef = bId ? (String(bId).startsWith('BK') ? String(bId) : `BK${bId}`) : '';
                return (
                  <a
                    href={`/guest/bookings?id=${bRef || bId}`}
                    className="px-5 py-2.5 bg-[#5B21B6] text-white rounded-xl text-xs font-bold hover:bg-[#5B21B6]/90 transition-colors shadow-soft inline-flex items-center gap-2 cursor-pointer"
                  >
                    Manage Booking <ArrowRight className="size-3.5" />
                  </a>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-navy/5 via-purple/5 to-navy/5 border border-navy/10 rounded-2xl p-6 sm:p-7 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <div className="size-12 rounded-xl bg-purple/10 text-purple flex items-center justify-center shrink-0">
              <Calendar className="size-6" />
            </div>
            <div>
              <h3 className="font-sans tracking-tight tabular-nums text-base font-bold text-slate-800">No Active Booking</h3>
              <p className="text-xs text-navy/60 mt-0.5">
                You don't have an active or upcoming stay reservation right now.
              </p>
            </div>
          </div>
          <Button
            onClick={handleBookNow}
            variant="hero"
            size="touch"
            className="px-6 py-2.5 text-xs font-bold gap-2 cursor-pointer shadow-soft shrink-0"
          >
            <Calendar className="size-4" /> Book Now
          </Button>
        </div>
      )}

      {/* Recent Bookings Summary Section */}
      <div className="bg-white rounded-2xl border border-navy/5 p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between border-b border-navy/5 pb-4">
          <div>
            <h3 className="font-sans tracking-tight tabular-nums text-base font-bold text-slate-800">Recent Bookings Summary</h3>
            <p className="text-xs text-navy/60 mt-0.5">Real-time reservation ledger fetched dynamically from MongoDB</p>
          </div>
          <a
            href="/guest/bookings"
            className="text-xs font-bold text-purple hover:underline inline-flex items-center gap-1"
          >
            View All Bookings <ArrowRight className="size-3" />
          </a>
        </div>

        {recentBookings.length === 0 ? (
          <div className="py-12 text-center space-y-4 border border-dashed border-navy/10 rounded-xl bg-cream/20">
            <Hotel className="size-10 text-navy/20 mx-auto" />
            <div>
              <h4 className="font-sans tracking-tight tabular-nums text-base font-bold text-slate-800">No Bookings Found</h4>
              <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1">
                You don't have any reservations recorded yet. Explore our luxury hotels and book your next stay!
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
                  <th className="py-3 px-4 whitespace-nowrap">City</th>
                  <th className="py-3 px-4 whitespace-nowrap">Room Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Stay Dates</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Tariff</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted font-medium text-navy">
                {recentBookings.slice(0, 10).map((b) => {
                  const bId = b.bookingId || b.id || b._id;
                  const bRef = bId ? (String(bId).startsWith('BK') ? String(bId) : `BK${bId}`) : '';
                  const statusLower = (b.status || '').toLowerCase();
                  const isCheckedOut = statusLower === 'checked-out' || statusLower === 'checked out' || statusLower === 'completed';
                  const isCancelled = statusLower === 'cancelled';
                  const hasFb = Boolean(b.hasFeedback || feedbackBookingIds.has(String(bId)) || feedbackBookingIds.has(String(b.id)) || feedbackBookingIds.has(String(b._id)) || feedbackBookingIds.has(String(b.bookingId)));

                  return (
                    <tr key={b.id || b._id || b.bookingId} className="hover:bg-muted/15 transition-colors cursor-pointer" onClick={() => window.location.href = `/guest/bookings?id=${bRef || bId}`}>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple whitespace-nowrap">
                        <span className="hover:underline">{b.bookingId || bRef}</span>
                      </td>
                    <td className="py-3.5 px-4 font-bold text-navy whitespace-nowrap">{b.hotel || "Speshway Hotel & Suites"}</td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{b.city || "Hyderabad"}</td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{b.room || "Standard Suite"}</td>
                    <td className="py-3.5 px-4 font-medium text-navy whitespace-nowrap">{b.dates || `${b.checkIn} → ${b.checkOut}`}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-navy whitespace-nowrap">{inr(b.amount)}</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'Confirmed' || b.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.status === 'Checked-in'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : b.status === 'Checked-out' || b.status === 'Completed'
                          ? 'bg-purple/10 text-purple border border-purple/20'
                          : b.status === 'Cancelled'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {b.status || 'Confirmed'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-left whitespace-nowrap min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                      <ActionGroup align="left">
                        <ViewActionIcon
                          title="View Booking Details"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/guest/bookings?id=${bRef || bId}`;
                          }}
                        />
                        {isCheckedOut && !hasFb && (
                          <FeedbackActionIcon
                            title="Give Stay Feedback"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/guest/feedback/add?bookingId=${b.bookingId || b.id || b._id}`;
                            }}
                          />
                        )}
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

      {/* Guest Feedback & Experience Banner */}
      <div className="bg-gradient-to-r from-purple/10 via-white to-emerald-500/10 rounded-2xl border border-purple/20 p-6 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-purple text-white flex items-center justify-center shrink-0 shadow-sm">
            <MessageSquareHeart className="size-6" />
          </div>
          <div>
            <h4 className="font-sans tracking-tight tabular-nums text-base font-bold text-slate-800">Share Your Stay Feedback</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Help us maintain luxury hospitality standards. Rate your recent room cleanliness, service, and amenities.
            </p>
          </div>
        </div>
        <a
          href="/guest/feedback"
          className="shrink-0 px-5 py-2.5 bg-navy text-white rounded-xl text-xs font-bold hover:bg-navy/90 transition-all shadow-soft inline-flex items-center gap-2 cursor-pointer"
        >
          <Star className="size-3.5 fill-gold text-gold" /> Submit Feedback <ArrowRight className="size-3.5" />
        </a>
      </div>

    </div>
  );
}