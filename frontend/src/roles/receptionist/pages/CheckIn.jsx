import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, Upload, FileText, CheckCircle2, AlertOctagon, HelpCircle
} from "lucide-react";

export const Route = createFileRoute("/reception/check-in")({
  head: () => ({
    meta: [
      { title: "Today's Arrivals Desk — Hour Stay" },
      { name: "description", content: "Front desk arrivals and guest check-in desk." }
    ]
  }),
  component: ArrivalsPage
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

function ArrivalsPage() {
  const todayStr = "25 Aug 2026";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [loading, setLoading] = useState(true);
  const [arrivals, setArrivals] = useState([]);

  useEffect(() => {
    receptionistService.getReservations()
      .then(res => {
        if (res.success && res.data) {
          const list = res.data
            .filter(b => b.status === 'Confirmed' || b.status === 'Pending')
            .map(b => ({
              ...b,
              type: b.roomType || 'Deluxe Room',
              roomReady: true,
              isEarly: false,
              idVerification: 'Verified',
              time: b.checkIn
            }));
          setArrivals(list);
        }
      })
      .catch(err => console.error("Failed to load arrivals list:", err))
      .finally(() => setLoading(false));
  }, []);


  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading arrivals desk...
      </div>
    );
  }

  // Stats
  const totalCount = arrivals.length;
  const pendingCount = arrivals.filter(a => a.status === "Pending").length;
  const precheckedCount = arrivals.filter(a => a.status === "Pre-checked").length;
  const earlyCount = arrivals.filter(a => a.isEarly).length;
  const noShowCount = arrivals.filter(a => a.status === "No-Show").length;

  // Filters mapping
  const filteredArrivals = arrivals.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone.includes(searchQuery);

    const matchesStatus = filterStatus === "All" || a.status === filterStatus;
    const matchesSource = filterSource === "All" || a.source === filterSource;

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Action methods
  const handleMarkNoShow = (id) => {
    setArrivals(prev => prev.map(a => a.id === id ? { ...a, status: "No-Show" } : a));
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Header action elements */}
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="bg-navy hover:bg-navy-deep text-white h-9 px-5 text-xs rounded-full font-bold cursor-pointer">
              <Link to="/reception/new-booking">Walk-in Booking</Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <PremiumStatCard label="Total Arrivals" value={totalCount} hint="Expected today" icon={LogIn} accentColor="#6366f1" />
        <PremiumStatCard label="Pending Check-ins" value={pendingCount} hint="Arrivals remaining" icon={Clock} accentColor="#f59e0b" />
        <PremiumStatCard label="Pre-Checked" value={precheckedCount} hint="Profiles verified" icon={ClipboardCheck} accentColor="#10b981" />
        <PremiumStatCard label="Early Arrivals" value={earlyCount} hint="Billed surcharges" icon={Sparkles} accentColor="#0ea5e9" />
        <PremiumStatCard label="No-Shows" value={noShowCount} hint="To be cancelled" icon={AlertTriangle} accentColor="#ef4444" />
      </div>

      {/* Controls: Search and Filters */}
      <div className="bg-white border border-muted rounded-2xl p-4 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guest name, booking ID, or contact number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Sources Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider select-none">Source:</span>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
            >
              <option value="All">All Sources</option>
              <option value="Direct Web">Direct Web</option>
              <option value="Booking.com">Booking.com</option>
              <option value="MakeMyTrip">MakeMyTrip</option>
              <option value="Expedia">Expedia</option>
              <option value="Agoda">Agoda</option>
              <option value="Goibibo">Goibibo</option>
            </select>
          </div>

        </div>

        {/* Tab-styled Filters */}
        <div className="flex flex-wrap gap-1 border-t border-muted/50 pt-3">
          {["All", "Pending", "Pre-checked", "Checked-In", "No-Show"].map((status) => (
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

      {/* Main Arrivals Table */}
      <Panel title="Arrivals Registration Ledger" description="Real-time listing of expected guest arrivals, verification status, and checklist tools.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                <th className="py-3.5 px-4">Guest Name</th>
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Room Type / No</th>
                <th className="py-3.5 px-4">ETA</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">ID Status</th>
                <th className="py-3.5 px-4">Check-in Status</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {filteredArrivals.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center font-bold text-muted-foreground select-none">
                    No matching arrivals found today.
                  </td>
                </tr>
              ) : (
                filteredArrivals.map((guest) => (
                  <tr key={guest.id} className="hover:bg-muted/5">
                    <td className="py-3.5 px-4 font-bold text-navy">
                      <div>
                        <p>{guest.name}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">{guest.phone}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{guest.id}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold">{guest.type}</span>
                      <span className="text-[10px] text-muted-foreground block font-bold">
                        Room #{guest.room} 
                        {!guest.roomReady && guest.status !== "Checked-In" && (
                          <strong className="text-amber-600 ml-1 select-none font-black">(Dirty)</strong>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-navy">
                      <div className="flex items-center gap-1.5">
                        <span>{guest.time}</span>
                        {guest.isEarly && (
                          <span className="rounded bg-sky-50 text-sky-700 px-1.5 py-0.5 text-[9px] font-black uppercase select-none border border-sky-200">Early</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Tag tone="brand">{guest.source}</Tag>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <Tag tone={guest.paymentStatus === "Paid" ? "success" : guest.paymentStatus === "Deposit Paid" ? "info" : "error"}>
                        {guest.paymentStatus}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <Tag tone={guest.idVerification === "Verified" ? "success" : guest.idVerification === "Mismatch" ? "error" : "neutral"}>
                        {guest.idVerification}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <Tag tone={guest.status === "Checked-In" ? "success" : guest.status === "Pre-checked" ? "info" : guest.status === "No-Show" ? "neutral" : "warning"}>
                        {guest.status}
                      </Tag>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {guest.status !== "Checked-In" && guest.status !== "No-Show" && (
                          <Button
                            asChild
                            className="bg-emerald-600 hover:bg-emerald-700 !text-white h-7 px-3.5 text-[10px] rounded-lg font-bold cursor-pointer transition-all shadow-sm"
                          >
                            <Link to={`/reception/check-in/${guest.id}`}>Check-In</Link>
                          </Button>
                        )}
                        {guest.status === "Pending" && (
                          <Button
                            onClick={() => handleMarkNoShow(guest.id)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 h-7 px-2.5 text-[10px] rounded-lg font-bold cursor-pointer transition-all"
                          >
                            No-Show
                          </Button>
                        )}
                        <Button
                          asChild
                          className="bg-navy/5 hover:bg-navy/10 border border-navy/15 text-navy-deep h-7 px-2.5 text-[10px] rounded-lg font-bold cursor-pointer transition-all"
                        >
                          <Link to={`/reception/reservations/${guest.id}`}>Details</Link>
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