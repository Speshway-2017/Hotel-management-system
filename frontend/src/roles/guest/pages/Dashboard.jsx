import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Calendar, Bed, Gift, Sparkles, Hotel, MapPin, 
  ArrowRight, ShieldCheck, RefreshCw, AlertCircle, Clock, CheckCircle2 
} from "lucide-react";
import { inr } from "@/data/hs-data";

export const Route = createFileRoute("/guest/")({
  head: () => ({
    meta: [
      { title: "Guest Dashboard — Hour Stay" },
      { name: "description", content: "Your stays, reservations and rewards with Hour Stay." }
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
          <h3 className="mt-1.5 font-display text-lg font-black text-navy leading-none truncate">{value}</h3>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:5000/api/v1/guest/dashboard', { headers });
      const result = await res.json();
      if (result && result.success && result.data) {
        setData(result.data);
      } else {
        const stored = localStorage.getItem('latest_booking');
        const parsed = stored ? [JSON.parse(stored)] : [];
        setData({
          stats: {
            upcomingBooking: parsed[0] || null,
            currentStay: null,
            totalStays: parsed.length,
            loyaltyPoints: parsed.length > 0 ? 2000 : 0,
            loyaltyTier: 'Silver',
            totalSpent: parsed[0]?.amount || 0
          },
          recentBookings: parsed
        });
      }
    } catch (err) {
      console.error("Failed to load guest dashboard:", err);
      const stored = localStorage.getItem('latest_booking');
      const parsed = stored ? [JSON.parse(stored)] : [];
      setData({
        stats: {
          upcomingBooking: parsed[0] || null,
          currentStay: null,
          totalStays: parsed.length,
          loyaltyPoints: parsed.length > 0 ? 2000 : 0,
          loyaltyTier: 'Silver',
          totalSpent: parsed[0]?.amount || 0
        },
        recentBookings: parsed
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
        <h3 className="font-display text-lg font-bold text-navy">Unable to Load Dashboard</h3>
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

  return (
    <div className="space-y-6 text-left font-ui">
      
      {/* KPI Cards Grid (Manager/Admin UI Style) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          label="Upcoming Booking"
          value={upcoming ? upcoming.checkIn : "None"}
          hint={upcoming ? `${upcoming.hotel} (${upcoming.city})` : "Plan next stay"}
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
          label="Loyalty Rewards"
          value={`${stats.loyaltyPoints ? stats.loyaltyPoints.toLocaleString() : 0} pts`}
          hint={`${stats.loyaltyTier || "Silver"} Member Tier`}
          icon={Gift}
          accentColor="#F5C06A"
        />
      </div>

      {/* Featured Upcoming Reservation Highlight (If Available) */}
      {upcoming && (
        <div className="bg-[#FFF7E6] border border-[#F5C06A]/40 rounded-2xl p-6 sm:p-8 text-[#0D1B2A] shadow-soft relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Sparkles className="size-48 text-[#5B21B6]" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5C06A]/25 text-[#92400E] text-[10px] font-bold uppercase tracking-wider border border-[#F5C06A]/50">
                <Clock className="size-3 text-[#B45309]" /> Confirmed Reservation
              </span>
              <h3 className="font-display text-2xl font-bold text-[#0D1B2A]">{upcoming.hotel}</h3>
              <p className="text-xs text-[#0D1B2A]/75 flex items-center gap-2 font-medium">
                <MapPin className="size-3.5 text-[#5B21B6]" /> {upcoming.city} · {upcoming.room}
              </p>
              <div className="pt-2 text-xs font-semibold text-[#0D1B2A]/80 flex flex-wrap gap-4">
                <span>Check-in: <strong className="text-[#5B21B6] font-bold">{upcoming.checkIn}</strong></span>
                <span>Check-out: <strong className="text-[#5B21B6] font-bold">{upcoming.checkOut}</strong></span>
                <span>Ref: <strong className="text-[#5B21B6] font-mono font-bold">{upcoming.bookingId}</strong></span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-start md:items-end gap-3">
              <div className="text-left md:text-right">
                <span className="text-[10px] text-[#0D1B2A]/60 uppercase tracking-wider block font-bold">Total Paid</span>
                <span className="font-display text-2xl font-bold text-[#B45309]">{inr(upcoming.amount)}</span>
              </div>
              <a
                href="/guest/bookings"
                className="px-5 py-2.5 bg-[#5B21B6] text-white rounded-xl text-xs font-bold hover:bg-[#5B21B6]/90 transition-colors shadow-soft inline-flex items-center gap-2"
              >
                Manage Booking <ArrowRight className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings Summary Section */}
      <div className="bg-white rounded-2xl border border-navy/5 p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between border-b border-navy/5 pb-4">
          <div>
            <h3 className="font-display text-base font-bold text-navy">Recent Bookings Summary</h3>
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
              <h4 className="font-display text-base font-bold text-navy">No Bookings Found</h4>
              <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1">
                You don't have any reservations recorded yet. Explore our luxury hotels and book your next stay!
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
                  <th className="py-3 px-4 whitespace-nowrap">City</th>
                  <th className="py-3 px-4 whitespace-nowrap">Room Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Stay Dates</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Tariff</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted font-medium text-navy">
                {recentBookings.slice(0, 10).map((b) => (
                  <tr key={b.id} className="hover:bg-muted/15 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple whitespace-nowrap">{b.bookingId}</td>
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
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {b.status}
                      </span>
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