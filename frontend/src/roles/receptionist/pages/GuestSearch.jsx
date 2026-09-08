import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, ActionGroup, ViewActionButton, ExtendActionButton, DetailsActionButton, ActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { receptionistService } from "@/services/receptionist";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, FileText, CheckCircle2, AlertOctagon, HelpCircle, 
  User, CheckCircle, ArrowRight, Eye
} from "lucide-react";

import { subscribeRealtimeSync } from "@/services/socket";
import { isToday, formatDisplayDate } from "@/utils/dateUtils";
import { extractRoomNumber } from "@/utils/roomUtils";

export const Route = createFileRoute("/reception/guest-search")({
  head: () => ({
    meta: [
      { title: "In-House Guests Directory — Hour Stay" },
      { name: "description", content: "Front desk in-house guest stays index." }
    ]
  }),
  component: InHouseGuestsPage
});

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground tracking-wider leading-tight">{label}</p>
          <h3 className="mt-2.5 font-display text-base font-black text-navy leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

function InHouseGuestsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRoomType, setFilterRoomType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState([]);
  const [extendingBooking, setExtendingBooking] = useState(null);

  const loadGuests = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    receptionistService.getGuests()
      .then(res => {
        let allGuests = res.success && Array.isArray(res.data) ? res.data : [];
        if (allGuests.length === 0) {
          return receptionistService.getReservations().then(resRes => {
            const allBookings = resRes.success && Array.isArray(resRes.data) ? resRes.data : [];
            const mapped = allBookings
              .filter(b => b.status === 'Checked-in' || b.status === 'Checked In' || b.status === 'Staying')
              .map(b => {
                const rmNum = extractRoomNumber(b) || b.roomNumber || (b.room ? b.room.split(' ')[0] : '—');
                const rmType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : 'Standard Room');
                const bal = Number(b.balance || 0);
                return {
                  id: b.bookingId || b.id || b._id,
                  _id: b._id || b.id || b.bookingId,
                  bookingId: b.bookingId || b.id || b._id,
                  name: b.guest || b.name || 'Guest',
                  phone: b.phone || '--',
                  email: b.email || `${(b.guest || 'guest').toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
                  room: rmNum,
                  roomType: rmType,
                  checkIn: b.checkIn || 'Today',
                  checkOut: b.checkOut || 'Tomorrow',
                  duration: `${b.nights || 1} Nights`,
                  pax: b.pax || '2 Adults',
                  balance: bal,
                  paymentStatus: b.paymentStatus || (bal === 0 ? 'Paid' : 'Pending'),
                  status: b.status === 'Checked-in' || b.status === 'Checked In' ? 'Staying' : b.status,
                  specialRequests: b.notes || b.specialRequests || 'None',
                  timeline: [
                    { time: b.checkIn || 'Today', action: 'Guest in-house active stay.' }
                  ]
                };
              });
            setGuests(mapped);
          });
        }
        setGuests(allGuests);
      })
      .catch(err => console.error("Failed to load in-house guests:", err))
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    loadGuests(false);

    const interval = setInterval(() => {
      loadGuests(true);
    }, 10000);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadGuests(true);
    });

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Selected Guest Drawer State
  const [activeGuest, setActiveGuest] = useState(null);
  
  // Custom action inputs
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDescription, setChargeDescription] = useState("Restaurant POS");
  const [extendDays, setExtendDays] = useState("1");

  // Stats Calculations
  const totalCount = guests.length;
  const stayingCount = guests.filter(g => g.status === "Staying" || g.status === "Checked-in" || g.status === "Checked-In").length;
  const extendedCount = guests.filter(g => g.status === "Extended Stay").length;
  const dueOutCount = guests.filter(g => isToday(g.checkOut) && (g.status === "Staying" || g.status === "Checked-in" || g.status === "Checked-In")).length;

  // Search and filter calculation
  const filteredGuests = guests.filter(g => {
    const nameStr = String(g.name || g.guest || "").toLowerCase();
    const roomStr = String(g.room || g.roomNumber || "").toLowerCase();
    const phoneStr = String(g.phone || "");
    const emailStr = String(g.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = nameStr.includes(query) || roomStr.includes(query) || phoneStr.includes(query) || emailStr.includes(query);
    const matchesStatus = filterStatus === "All" || g.status === filterStatus;
    const matchesType = filterRoomType === "all" || g.roomType === filterRoomType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Action methods
  const handleAddCharge = () => {
    if (!chargeAmount || isNaN(chargeAmount)) {
      alert("Please enter a valid numeric charge amount!");
      return;
    }
    const amt = Number(chargeAmount);
    setGuests(prev => prev.map(g => {
      if (g.id === activeGuest.id) {
        const updatedTimeline = [
          ...g.timeline,
          { time: "25 Aug, 14:52", action: `Charge added: ${chargeDescription} (+₹${amt})` }
        ];
        return {
          ...g,
          balance: g.balance + amt,
          paymentStatus: "Pending",
          timeline: updatedTimeline
        };
      }
      return g;
    }));
    // Refesh active guest details drawer
    setActiveGuest(prev => ({
      ...prev,
      balance: prev.balance + amt,
      paymentStatus: "Pending",
      timeline: [
        ...prev.timeline,
        { time: "25 Aug, 14:52", action: `Charge added: ${chargeDescription} (+₹${amt})` }
      ]
    }));
    setChargeAmount("");
    alert("Charge posted to folio successfully!");
  };

  const handleExtendStay = () => {
    if (!extendDays || isNaN(extendDays) || Number(extendDays) <= 0) {
      alert("Please enter a valid number of days to extend!");
      return;
    }
    const days = Number(extendDays);
    setGuests(prev => prev.map(g => {
      if (g.id === activeGuest.id) {
        // Parse checkout date day
        const currentCheckoutDate = parseInt(g.checkOut.split(" ")[0]);
        const newCheckoutDate = `${currentCheckoutDate + days} Aug 2026, 11:00`;
        const updatedTimeline = [
          ...g.timeline,
          { time: "25 Aug, 14:52", action: `Stay extended by ${days} day(s). New checkout: ${newCheckoutDate}` }
        ];
        return {
          ...g,
          checkOut: newCheckoutDate,
          status: "Extended Stay",
          timeline: updatedTimeline
        };
      }
      return g;
    }));
    // Refresh drawer
    setActiveGuest(prev => {
      const currentCheckoutDate = parseInt(prev.checkOut.split(" ")[0]);
      const newCheckoutDate = `${currentCheckoutDate + days} Aug 2026, 11:00`;
      return {
        ...prev,
        checkOut: newCheckoutDate,
        status: "Extended Stay",
        timeline: [
          ...prev.timeline,
          { time: "25 Aug, 14:52", action: `Stay extended by ${days} day(s). New checkout: ${newCheckoutDate}` }
        ]
      };
    });
    alert("Guest checkout date extended successfully!");
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      

      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <PremiumStatCard label="Total In-House" value={totalCount} hint="Guests currently staying" icon={Users} accentColor="#6366f1" />
        <PremiumStatCard label="Staying Guests" value={stayingCount} hint="Vacant check-outs" icon={Home} accentColor="#10b981" />
        <PremiumStatCard label="Extended Stay" value={extendedCount} hint="Extended profile ledger" icon={Sparkles} accentColor="#a855f7" />
        <PremiumStatCard label="Due Out Today" value={dueOutCount} hint="Pending departures today" icon={Clock} accentColor="#f59e0b" />
      </div>

      {/* Filters & Search controls */}
      <div className="bg-white border border-muted rounded-2xl p-4 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guest name, room #, phone, booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Room Type filter dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider select-none">Room Type:</span>
            <select
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Standard Room">Standard Room</option>
              <option value="Deluxe Room">Deluxe Room</option>
              <option value="Deluxe King">Deluxe King</option>
              <option value="Executive Room">Executive Room</option>
              <option value="Villa Suite">Villa Suite</option>
              <option value="Premium Deluxe">Premium Deluxe</option>
            </select>
          </div>

        </div>

        {/* Tab filters */}
        <div className="flex flex-wrap gap-1 border-t border-muted/50 pt-3">
          {["All", "Staying", "Extended Stay", "Due Out Today"].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filterStatus === status ? "secondary" : "ghost"}
              className="h-8 text-xs font-bold px-4 capitalize rounded-full"
              onClick={() => setFilterStatus(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* In-House Guests Table */}
      <Panel title="In-House Occupancy Ledger" description="Real-time listing of guests currently checked in, duration configurations, and incidentals balances.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none whitespace-nowrap">
                <th className="py-3.5 px-4">Guest Info</th>
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Room Type / No</th>
                <th className="py-3.5 px-4">Stay Dates</th>
                <th className="py-3.5 px-4">Duration & Pax</th>
                <th className="py-3.5 px-4">Folio Balance</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Stay Status</th>
                <th className="py-3.5 px-4 text-left min-w-[240px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center font-bold text-muted-foreground select-none">
                    No matching in-house guests found.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/5">
                    <td className="py-3.5 px-4 font-bold text-navy">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-full bg-navy/5 text-navy font-bold text-[10px] uppercase select-none">
                          {g.name.split(" ").map(n => n[0]).join("")}
                        </span>
                        <div>
                          <p>{g.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{g.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{g.id}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold">{g.roomType}</span>
                      <span className="text-[10px] text-muted-foreground block font-bold">Room #{g.room}</span>
                    </td>
                    <td className="py-3.5 px-4 text-navy">
                      <div className="text-[10px] leading-tight">
                        <p><strong className="text-muted-foreground">In:</strong> {g.checkIn.split(",")[0]}</p>
                        <p className="mt-0.5"><strong className="text-muted-foreground">Out:</strong> {g.checkOut.split(",")[0]}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-navy">
                      <div>
                        <p>{g.duration}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{g.pax}</p>
                      </div>
                    </td>
                    <td className={`py-3.5 px-4 font-black ${g.balance > 0 ? "text-rose-600" : "text-navy"}`}>
                      ₹{g.balance.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <Tag tone={g.paymentStatus === "Paid" ? "success" : g.paymentStatus === "Deposit Paid" ? "info" : "error"}>
                        {g.paymentStatus}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <Tag tone={g.status === "Staying" ? "success" : g.status === "Extended Stay" ? "brand" : "warning"}>
                        {g.status}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap min-w-[240px]">
                      <ActionGroup align="left">
                        {(g.status === "Staying" || g.status === "Extended Stay" || g.status === "Checked-in" || g.status === "Checked In") && (
                          <ExtendActionButton
                            onClick={() => navigate({ to: `/reception/reservations/extend/${g.id || g._id}` })}
                            title="Extend Stay Duration"
                          />
                        )}

                        <DetailsActionButton
                          onClick={() => navigate({ to: `/reception/guest-search/${g.id || g._id}` })}
                          title="View Guest Details"
                        />

                        <ViewActionButton
                          label="Folio"
                          onClick={() => navigate({ to: `/reception/folio/FOL-${g.id || g._id}` })}
                          title="View Guest Folio"
                        />
                      </ActionGroup>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

    </div>
  );
}