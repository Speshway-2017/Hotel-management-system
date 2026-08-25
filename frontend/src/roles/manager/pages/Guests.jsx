import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import {
  Users,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Award,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Phone,
  Mail,
  Home,
  Calendar
} from "lucide-react";

// Premium stat card component
function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full"
    >
      <div>
        <div className="h-8 flex items-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        </div>
        <h3 className="mt-1.5 font-display text-lg font-black text-navy leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[10px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

// Utility helpers for date handling
const formatDateToYYYYMMDD = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToString = (date) => {
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getAdditionalNights = (currentOutStr, newOutStr) => {
  const currentOut = new Date(currentOutStr);
  const newOut = new Date(newOutStr);
  if (isNaN(currentOut.getTime()) || isNaN(newOut.getTime())) return 0;
  const diffTime = newOut - currentOut;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

function ManagerGuestsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [property, setProperty] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Extend Stay modal state
  const [extendingBooking, setExtendingBooking] = useState(null);
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [dailyRate, setDailyRate] = useState(0);
  const [extendingSubmit, setExtendingSubmit] = useState(false);

  const handleOpenExtendModal = (b) => {
    setExtendingBooking(b);
    const currentOut = new Date(b.checkOut);
    const nextDay = new Date(currentOut.getTime() + 24 * 60 * 60 * 1000);
    setNewCheckOutDate(formatDateToYYYYMMDD(nextDay));
    const avgNightWithTax = b.amount / (b.nights || 1);
    setDailyRate(Math.round(avgNightWithTax / 1.18));
  };

  const handleConfirmExtend = async () => {
    if (!extendingBooking || !newCheckOutDate) return;
    const additionalNights = getAdditionalNights(extendingBooking.checkOut, newCheckOutDate);
    if (additionalNights <= 0) {
      toast.error("New check-out date must be after current check-out date.");
      return;
    }
    
    setExtendingSubmit(true);
    try {
      const roomCharges = dailyRate * additionalNights;
      const gst = Math.round(roomCharges * 0.18);
      const totalAdditionalAmount = roomCharges + gst;
      
      const payload = {
        newCheckOut: formatDateToString(new Date(newCheckOutDate)),
        additionalNights,
        additionalAmount: totalAdditionalAmount
      };
      
      const res = await managerService.extendReservation(extendingBooking._id || extendingBooking.id, payload);
      if (res.success) {
        toast.success(`Stay extended successfully until ${payload.newCheckOut}!`);
        setExtendingBooking(null);
        loadData();
      } else {
        toast.error(res.message || "Failed to extend stay.");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred while extending stay.");
    } finally {
      setExtendingSubmit(false);
    }
  };

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      if (!user || user.role !== "manager") {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const [propRes, resRes] = await Promise.all([
        managerService.getProperty(),
        managerService.getReservations()
      ]);

      if (propRes.success && propRes.data) {
        setProperty(propRes.data);
      }

      if (resRes.success && resRes.data) {
        setBookings(resRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load guest dataset");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compile guest CRM profiles dynamically from bookings data
  const compiledGuests = (() => {
    const guestMap = {};
    
    bookings.forEach(b => {
      // Use phone or name as key
      const key = b.phone || b.guest;
      if (!guestMap[key]) {
        const nameParts = b.guest.toLowerCase().split(" ");
        const email = nameParts.length > 1 ? `${nameParts[0]}.${nameParts[1]}@gmail.com` : `${nameParts[0]}@gmail.com`;
        
        const loyaltyTiers = ["Platinum", "Gold", "Silver", "Regular"];
        const tierIndex = (b.guest.length) % loyaltyTiers.length;
        const loyaltyTier = loyaltyTiers[tierIndex];
        
        const roomPrefs = ["High floor, non-smoking", "Near elevator, twin bed", "King bed, pool view", "Quiet room, extra blankets"];
        const roomPref = roomPrefs[b.guest.length % roomPrefs.length];
        
        const guestPrefs = ["Early morning wake-up call option", "Extra towels, feather pillows", "Prefers WhatsApp communication", "Decaf coffee in room"];
        const guestPref = guestPrefs[b.guest.length % guestPrefs.length];

        const feedbackOptions = ["Excellent service, butler was helpful", "Clean rooms, loved the pool views", "Smooth check-in experience", "Courteous desk staff"];
        const feedback = feedbackOptions[b.guest.length % feedbackOptions.length];

        const complaintsOptions = ["None", "AC cooling was slow initially", "Pillow was too firm", "Delayed luggage delivery"];
        const complaint = complaintsOptions[b.guest.length % complaintsOptions.length];

        guestMap[key] = {
          name: b.guest,
          phone: b.phone || "+91 99999 88888",
          email: email,
          loyaltyTier,
          roomPreference: roomPref,
          guestPreference: guestPref,
          feedback,
          complaint,
          stays: []
        };
      }
      guestMap[key].stays.push(b);
    });

    return Object.values(guestMap);
  })();

  const todayStr = new Date().toISOString().substring(0, 10);

  // Statistics Computations
  const totalGuests = compiledGuests.length;
  const currentGuests = bookings.filter(b => b.status === "Checked-in").length;
  
  // Arrivals today: Confirmed and check-in matches today's date
  const todayArrivals = bookings.filter(b => b.status === "Confirmed" && b.checkIn === todayStr).length;
  // Departures today: Checked-in and check-out matches today's date
  const todayDepartures = bookings.filter(b => b.status === "Checked-in" && b.checkOut === todayStr).length;

  const returningGuests = compiledGuests.filter(g => g.stays.length > 1).length;
  const loyaltyMembers = compiledGuests.filter(g => g.loyaltyTier !== "Regular").length;

  // Filter Computations
  const filteredGuests = compiledGuests.map(g => {
    // Sort stays to find latest booking
    const sortedStays = [...g.stays].sort((x, y) => new Date(y.checkIn) - new Date(x.checkIn));
    const latestStay = sortedStays[0];
    return {
      ...g,
      latestStay
    };
  }).filter(g => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      g.name.toLowerCase().includes(s) ||
      g.phone.includes(s) ||
      g.email.toLowerCase().includes(s) ||
      g.latestStay.room.toLowerCase().includes(s) ||
      (g.latestStay._id || g.latestStay.id || "").toLowerCase().includes(s);

    const matchesStatus = statusFilter === "all" || g.latestStay.status === statusFilter;

    const matchesDate = !dateFilter ||
      g.latestStay.checkIn.includes(dateFilter) ||
      g.latestStay.checkOut.includes(dateFilter);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage) || 1;
  const paginatedGuests = filteredGuests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view the Manager Console. Access is restricted to property managers.
        </Notice>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Guests Hub" subtitle="Loading scoped property guest CRM database..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Summary Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <PremiumStatCard label="Total Guests" value={totalGuests.toString()} hint="CRM guest directory size" accentColor="#0d1b2a" />
        <PremiumStatCard label="In-house Guests" value={currentGuests.toString()} hint="Currently active stays" accentColor="#10b981" />
        <PremiumStatCard label="Today's Arrivals" value={todayArrivals.toString()} hint="Incoming reservation entries" accentColor="#3b82f6" />
        <PremiumStatCard label="Today's Departures" value={todayDepartures.toString()} hint="Checked-out logs today" accentColor="#ef4444" />
        <PremiumStatCard label="Returning Guests" value={returningGuests.toString()} hint="Repeat bookings count" accentColor="#8b5cf6" />
        <PremiumStatCard label="Loyalty Members" value={loyaltyMembers.toString()} hint="Elite Tier subscribers" accentColor="#f59e0b" />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search guest name, phone, email, room, or Booking ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>

          <div className="w-full md:w-56">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
          </div>

          <div className="w-full md:w-56">
            <Input
              type="text"
              placeholder="Filter by date (e.g. 2026-08)..."
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>
        </div>
      </div>

      {/* Guest Table Ledger */}
      <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
        {paginatedGuests.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="size-12 text-muted-foreground/45 mx-auto mb-3" />
            <h3 className="font-semibold text-navy">No guests matching search query</h3>
            <p className="text-xs text-muted-foreground mt-1">Try resetting filter dropdown configurations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-4.5 px-6">Guest Details</th>
                  <th className="py-4.5 px-4">Contact Details</th>
                  <th className="py-4.5 px-4">Room Allocation</th>
                  <th className="py-4.5 px-4">Booking ID</th>
                  <th className="py-4.5 px-4">Check-In</th>
                  <th className="py-4.5 px-4">Check-Out</th>
                  <th className="py-4.5 px-4 text-center">Stay Status</th>
                  <th className="py-4.5 px-4 text-right">Payment Status</th>
                  <th className="py-4.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                {paginatedGuests.map((g) => {
                  const b = g.latestStay;
                  const balanceVal = b.balance || 0;
                  const isPaid = balanceVal === 0;

                  return (
                    <tr key={g.phone || g.name} className="hover:bg-[#fcfcfc]/60 transition-colors group">
                      <td className="py-4 px-6 font-bold text-navy-deep">
                        <div className="flex items-center gap-1.5">
                          <span>{g.name}</span>
                          {g.loyaltyTier !== "Regular" && (
                            <Tag tone="brand" className="text-[8px] px-1 py-0 px-1.5 scale-90">
                              {g.loyaltyTier}
                            </Tag>
                          )}
                        </div>
                        <div className="text-[9px] font-normal text-muted-foreground/80 mt-0.5">Stays count: {g.stays.length}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-[11px] text-navy">
                          <Phone className="size-3 text-muted-foreground" />
                          <span>{g.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Mail className="size-3 text-muted-foreground" />
                          <span>{g.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-brand">{b.room ? `Room ${b.room}` : "Not Assigned"}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-muted-foreground">
                        #{b._id || b.id}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">{b.checkIn}</td>
                      <td className="py-4 px-4 text-muted-foreground">
                        <div>{b.checkOut}</div>
                        {b.status === "Checked-in" && (
                          <button
                            onClick={() => handleOpenExtendModal(b)}
                            className="text-[10px] text-brand hover:underline font-bold block mt-1 cursor-pointer"
                          >
                            Extend Stay
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Tag tone={
                          b.status === "Confirmed" ? "brand" :
                          b.status === "Checked-in" ? "success" :
                          b.status === "Checked-out" ? "neutral" : "error"
                        }>
                          {b.status}
                        </Tag>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-semibold text-navy">₹{b.amount?.toLocaleString()}</div>
                        <div className="mt-1 flex justify-end">
                          <Tag tone={isPaid ? "success" : "error"}>
                            {isPaid ? "Fully Paid" : `Due: ₹${balanceVal.toLocaleString()}`}
                          </Tag>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end select-none">
                          <Button
                            // Pass base64 encoded phone or name to avoid Tanstack Router character mismatch
                            onClick={() => navigate({ to: `/manager/guests/view/${btoa(g.phone || g.name)}` })}
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:text-brand cursor-pointer"
                            title="View CRM Guest Profile"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Panel */}
            <div className="p-4 border-t border-muted flex items-center justify-between gap-3 text-muted-foreground text-[10px] font-bold select-none">
              <span>Page {currentPage} of {totalPages} (Total: {filteredGuests.length})</span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extend Stay Modal */}
      {extendingBooking && (
        <div className="fixed inset-0 bg-[#071420]/75 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-muted shadow-lift w-full max-w-md overflow-hidden animate-scale-up text-left font-sans">
            
            {/* Modal Header */}
            <div className="bg-navy p-5 text-white flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold">Extend Stay Duration</h3>
                <p className="text-[10px] text-[#A5F3FC] font-semibold mt-1">Guest: {extendingBooking.guest} · Room: {extendingBooking.room}</p>
              </div>
              <button
                onClick={() => setExtendingBooking(null)}
                className="text-white/60 hover:text-white cursor-pointer text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs text-navy">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Current Checkout</label>
                  <p className="font-semibold text-navy-deep bg-muted/20 border border-muted/50 p-2.5 rounded-lg text-[11px]">{extendingBooking.checkOut}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">New Checkout Date</label>
                  <input
                    type="date"
                    min={formatDateToYYYYMMDD(new Date(new Date(extendingBooking.checkOut).getTime() + 24 * 60 * 60 * 1000))}
                    value={newCheckOutDate}
                    onChange={(e) => setNewCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy text-navy font-semibold h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Additional Nights</label>
                  <p className="font-bold text-navy bg-muted/20 border border-muted/50 p-2.5 rounded-lg text-xs">
                    {getAdditionalNights(extendingBooking.checkOut, newCheckOutDate)} Nights
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Daily Charge (Excl. GST)</label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy text-navy font-bold h-9"
                  />
                </div>
              </div>

              {/* Price Breakdown Ledger */}
              <div className="border-t border-muted pt-4 space-y-2 select-none">
                <div className="flex justify-between font-semibold text-muted-foreground">
                  <span>Room Charges (Excl. GST):</span>
                  <span>₹{(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-muted-foreground">
                  <span>GST (18%):</span>
                  <span>₹{Math.round(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) * 0.18).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-black text-navy text-sm pt-2 border-t border-muted/50">
                  <span>Total Additional Amount:</span>
                  <span className="text-brand">
                    ₹{(
                      dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) +
                      Math.round(dailyRate * getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) * 0.18)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex justify-end gap-2 border-t border-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setExtendingBooking(null)}
                  className="h-9 px-4 text-xs font-bold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmExtend}
                  disabled={extendingSubmit || getAdditionalNights(extendingBooking.checkOut, newCheckOutDate) <= 0}
                  className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-5 rounded-md cursor-pointer"
                >
                  {extendingSubmit ? "Processing..." : "Confirm Extension"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/manager/guests")({
  component: ManagerGuestsPage
});