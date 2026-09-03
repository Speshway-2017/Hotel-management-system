import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, FileText, CheckCircle2, AlertOctagon, HelpCircle, Receipt,
  Eye
} from "lucide-react";

import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { toast } from "sonner";

export const Route = createFileRoute("/reception/check-out")({
  head: () => ({
    meta: [
      { title: "Today's Departures Desk — Hour Stay" },
      { name: "description", content: "Front desk checkout ledger and guest folio settlement." }
    ]
  }),
  component: DeparturesPage
});

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
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

function DeparturesPage() {
  const todayStr = "25 Aug 2026";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [loading, setLoading] = useState(true);
  const [departures, setDepartures] = useState([]);

  const loadDepartures = () => {
    receptionistService.getReservations()
      .then(res => {
        const allBookings = res.success && Array.isArray(res.data) ? res.data : [];
        const list = allBookings
          .filter(b => b.status === 'Checked-in' || b.status === 'Checked-out')
          .map(b => ({
            id: b.bookingId || b.id || b._id,
            _id: b._id || b.id || b.bookingId,
            name: b.guest || b.name || 'Guest',
            guest: b.guest || b.name || 'Guest',
            phone: b.phone || '--',
            room: b.roomNumber || (b.room ? b.room.split(' ')[0] : 'Unassigned'),
            roomNumber: b.roomNumber || (b.room ? b.room.split(' ')[0] : 'Unassigned'),
            type: b.roomType || (b.room ? b.room.split('·')[1]?.trim() || 'Standard Room' : 'Standard Room'),
            roomType: b.roomType || (b.room ? b.room.split('·')[1]?.trim() || 'Standard Room' : 'Standard Room'),
            nights: Number(b.nights || 1),
            duration: `${b.nights || 1} Nights`,
            time: b.checkOut || 'Today',
            checkOut: b.checkOut || 'Today',
            isLate: false,
            isCorporate: false,
            corporateAccount: '',
            balance: Number(b.balance || 0),
            paymentStatus: Number(b.balance || 0) === 0 ? 'Paid' : 'Pending',
            status: b.status === 'Checked-out' ? 'Checked Out' : (Number(b.balance || 0) > 0 ? 'Pending Balance' : 'Ready')
          }));
        setDepartures(list);
      })
      .catch(err => console.error("Failed to load departures list:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDepartures();
    const interval = setInterval(loadDepartures, 10000);
    const handleFocus = () => loadDepartures();
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadDepartures();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Action methods
  const handleCheckOut = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "Checked-out");
      setDepartures(prev => prev.map(d => 
        (d.id === id || d._id === id || d.bookingId === id)
          ? { ...d, status: "Checked Out" } 
          : d
      ));
      toast.success("Guest checked out successfully!");
      emitRealtimeEvent('checkout_completed', { id, status: 'Checked-out' });
      loadDepartures();
    } catch (err) {
      console.error("Failed to check out:", err);
      toast.error(err.message || "Failed to check out guest.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading departures ledger...
      </div>
    );
  }

  // Stats
  const totalCount = departures.length;
  const pendingCount = departures.filter(d => d.status === "Ready").length;
  const paymentPendingCount = departures.filter(d => d.balance > 0 && d.status !== "Checked Out").length;
  const lateCount = departures.filter(d => d.isLate).length;
  const checkedOutCount = departures.filter(d => d.status === "Checked Out").length;

  // Filter computations
  const filteredDepartures = departures.filter(d => {
    const nameStr = String(d.name || d.guest || "").toLowerCase();
    const idStr = String(d.id || d._id || d.bookingId || "").toLowerCase();
    const roomStr = String(d.room || d.roomNumber || "").toLowerCase();
    const phoneStr = String(d.phone || "");
    const query = searchQuery.toLowerCase();

    const matchesSearch = nameStr.includes(query) || idStr.includes(query) || roomStr.includes(query) || phoneStr.includes(query);

    const matchesStatus = 
      filterStatus === "All" ||
      (filterStatus === "Pending Checkout" && d.status !== "Checked Out") ||
      (filterStatus === "Payment Pending" && Number(d.balance || 0) > 0 && d.status !== "Checked Out") ||
      (filterStatus === "Ready to Checkout" && Number(d.balance || 0) === 0 && d.status === "Ready") ||
      d.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      

      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <PremiumStatCard label="Total Departures" value={totalCount} hint="Expected today" icon={LogOut} accentColor="#ec4899" />
        <PremiumStatCard label="Pending Check-outs" value={pendingCount} hint="Remaining stays" icon={Clock} accentColor="#f59e0b" />
        <PremiumStatCard label="Payment Pending" value={paymentPendingCount} hint="Folio collections due" icon={IndianRupee} accentColor="#ef4444" />
        <PremiumStatCard label="Late Check-outs" value={lateCount} hint="Overdue rooms" icon={AlertTriangle} accentColor="#a855f7" />
        <PremiumStatCard label="Checked Out" value={checkedOutCount} hint="Released rooms (Dirty)" icon={CheckCircle2} accentColor="#10b981" />
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-muted rounded-2xl p-4 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guest name, room #, booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

        </div>

        {/* Tab filters */}
        <div className="flex flex-wrap gap-1 border-t border-muted/50 pt-3">
          {["All", "Pending Checkout", "Payment Pending", "Ready to Checkout", "Checked Out", "Late Checkout"].map((status) => (
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

      {/* Departures Table */}
      <Panel title="Departures & Folio Settlement Ledger" description="Real-time tracking of scheduled check-outs, outstanding folio bills, and room release flags.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                <th className="py-3.5 px-4">Room No</th>
                <th className="py-3.5 px-4">Guest Name</th>
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Room Category</th>
                <th className="py-3.5 px-4">Nights Stayed</th>
                <th className="py-3.5 px-4">Checkout Target</th>
                <th className="py-3.5 px-4">Folio Balance</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Release Status</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {filteredDepartures.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center font-bold text-muted-foreground select-none">
                    No matching check-outs registered today.
                  </td>
                </tr>
              ) : (
                filteredDepartures.map((guest) => (
                  <tr key={guest.id} className="hover:bg-muted/5">
                    <td className="py-3.5 px-4 font-bold text-indigo">
                      Room #{guest.room}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-navy">
                      <div>
                        <p>{guest.name}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">{guest.phone}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{guest.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-navy">{guest.type}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-navy">{guest.nights} Nights</td>
                    <td className="py-3.5 px-4 font-semibold text-navy">
                      <div className="flex items-center gap-1.5">
                        <span>{guest.time}</span>
                        {guest.isLate && (
                          <span className="rounded bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[9px] font-black uppercase select-none border border-rose-200">Late</span>
                        )}
                      </div>
                    </td>
                    <td className={`py-3.5 px-4 font-black ${guest.balance > 0 && guest.status !== "Checked Out" ? "text-rose-600" : "text-navy"}`}>
                      ₹{guest.balance.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <Tag tone={guest.paymentStatus === "Paid" ? "success" : guest.paymentStatus === "Corporate" ? "brand" : "error"}>
                        {guest.paymentStatus}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <Tag tone={guest.status === "Checked Out" ? "success" : guest.status === "Late Checkout" ? "error" : guest.status === "Corporate Billing" ? "brand" : guest.status === "Payment Pending" ? "warning" : "info"}>
                        {guest.status}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 whitespace-nowrap select-none">
                        {guest.status !== "Checked Out" && guest.status !== "Checked-out" && (
                          guest.balance > 0 ? (
                            <Button
                              asChild
                              size="xs"
                              variant="outline"
                              className="text-navy border-navy/30 hover:bg-navy/5 h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                            >
                              <Link to={`/reception/check-out/${guest.id || guest._id}`}>
                                Collect & Check-Out
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleCheckOut(guest.id || guest._id)}
                              className="text-navy border-navy/30 hover:bg-navy/5 h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                            >
                              Check-Out
                            </Button>
                          )
                        )}
                        
                        {/* View Folio / Details Ghost Icon Button */}
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="size-7 text-navy/70 hover:text-brand hover:bg-brand/10 rounded-lg cursor-pointer transition-colors"
                          title="View Folio / Reservation"
                        >
                          <Link to={`/reception/reservations/${guest.id || guest._id}`}>
                            <Eye className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
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